import { get as getProjection, transform } from "ol/proj";

import PlanCheckerApi from "./PlanCheckerApi";
import {
  DEFAULT_OPTIONS,
  REGULATION_TYPE_ORDER,
  SERVICE_PROJECTION,
} from "./constants";

/**
 * @summary Turns a click in the map into the detaljplan regulations that apply
 * at that exact point.
 *
 * @description Three searches per click, mirroring what Lantmateriet's own
 * viewer does:
 *
 *   1. which plans cover the point (the "huvudobjekt", carrying name, dates
 *      and the plan's documents);
 *   2. that plan's regulations at the point;
 *   3. all of that plan's regulations, so each heading can say "N of M" and
 *      the user can widen from the point to the whole plan.
 *
 * 2 and 3 run together per plan. Every NGP feature repeats its plan's metadata,
 * so nothing needs joining afterwards.
 */
export default class PlanCheckerModel {
  #map;
  #app;
  #localObserver;
  #options;
  #api;

  constructor(settings) {
    this.#map = settings.map;
    this.#app = settings.app;
    this.#localObserver = settings.localObserver;

    // Drop empty admin fields so they don't shadow the defaults.
    const configured = Object.fromEntries(
      Object.entries(settings.options ?? {}).filter(
        ([, value]) =>
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !(Array.isArray(value) && value.length === 0)
      )
    );
    this.#options = { ...DEFAULT_OPTIONS, ...configured };

    const mapServiceBase = settings.app.config.appConfig.mapserviceBase;
    this.#api = new PlanCheckerApi(
      `${mapServiceBase}/${this.#options.proxyPath}`
    );

    this.#localObserver.subscribe(
      "drawModel.featureAdded",
      this.#handleFeatureAdded
    );
  }

  getOptions = () => this.#options;

  /**
   * Drop the subscription and abort anything in flight. Without this the model
   * would keep answering draw events after the plugin is gone.
   */
  destroy = () => {
    this.#localObserver.unsubscribe("drawModel.featureAdded");
    this.#api.abort();
  };

  #getViewProjection = () => this.#map.getView().getProjection().getCode();

  /**
   * Geometries travel in the service's own CRS in both directions. When the map
   * runs in something else - EPSG:3857 is the common case - that projection has
   * to be registered for OpenLayers to transform at all.
   */
  #toServiceCoordinate = (coordinate) => {
    const viewProjection = this.#getViewProjection();
    if (viewProjection === SERVICE_PROJECTION) return coordinate;

    if (!getProjection(SERVICE_PROJECTION)) {
      throw new Error(
        `${SERVICE_PROJECTION} saknas i kartkonfigurationen, och det är den ` +
          `projektion detaljplanetjänsten använder. Lägg till den under "projections".`
      );
    }
    return transform(coordinate, viewProjection, SERVICE_PROJECTION);
  };

  /**
   * The items are read as raw GeoJSON rather than through OpenLayers, because a
   * STAC item keeps `assets` beside `properties` rather than inside it, and the
   * GeoJSON reader lifts only `properties` - the plan's documents would be
   * dropped silently. Nothing here needs the geometry either, now that the
   * service does the hit test, so there is nothing to gain by parsing it.
   */
  #itemsOf = (collection) =>
    Array.isArray(collection?.features) ? collection.features : [];

  #compareRegulationTypes = (a, b) => {
    const rank = (value) => {
      const i = REGULATION_TYPE_ORDER.indexOf((value || "").toLowerCase());
      return i === -1 ? REGULATION_TYPE_ORDER.length : i;
    };
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b, "sv");
  };

  /** Shape one regulation item for the view. */
  #toRegulation = (item) => {
    const props = item.properties ?? {};
    return {
      id: item.id,
      type: props.feature?.typ || "Övrigt",
      label: props.feature?.etikett || props.title || "",
      text: props.planbestammelse?.bestammelseformulering || "",
      anvandningsform: props.planbestammelse?.anvandningsform || "",
      kategori: props.planbestammelse?.kategori || "",
      underkategori: props.planbestammelse?.underkategori || "",
    };
  };

  /**
   * Group regulations by type, and count how many of each type the whole plan
   * holds, so a heading can read "Egenskapsbestämmelser - 1 av 8 st".
   */
  #groupByType = (atPoint, all) => {
    const totals = new Map();
    for (const r of all) {
      totals.set(r.type, (totals.get(r.type) ?? 0) + 1);
    }

    const grouped = new Map();
    for (const r of atPoint) {
      if (!grouped.has(r.type)) grouped.set(r.type, []);
      grouped.get(r.type).push(r);
    }

    // Types present in the plan but not at the point still deserve a heading,
    // so the "show all" view can reveal them.
    for (const type of totals.keys()) {
      if (!grouped.has(type)) grouped.set(type, []);
    }

    return [...grouped.entries()]
      .sort(([a], [b]) => this.#compareRegulationTypes(a, b))
      .map(([type, regulations]) => ({
        type,
        regulations,
        all: all.filter((r) => r.type === type),
        countAtPoint: regulations.length,
        countInPlan: totals.get(type) ?? regulations.length,
      }));
  };

  /**
   * The plan's documents, from the item's assets. The plan payload itself
   * (role "detaljplan") is the machine-readable bundle rather than something
   * to hand a user, so it is left out.
   */
  #readDocuments = (item) => {
    const assets = item.assets ?? {};
    return Object.values(assets)
      .filter((a) => a?.href && a.title && a.roles?.[0] !== "detaljplan")
      .map((a) => ({ title: a.title, href: a.href, role: a.roles?.[0] }));
  };

  #handleFeatureAdded = async (feature) => {
    const coordinate = feature.getGeometry().getCoordinates();
    this.#localObserver.publish("planChecker.loading", true);

    try {
      const signal = this.#api.beginRequest();
      const serviceCoordinate = this.#toServiceCoordinate(coordinate);
      const { planStatuses, maxItems } = this.#options;

      const planCollection = await this.#api.findPlansAtPoint({
        coordinate: serviceCoordinate,
        statuses: planStatuses,
        signal,
      });
      const planItems = this.#itemsOf(planCollection);

      const plans = await Promise.all(
        planItems.map(async (planItem) => {
          const props = planItem.properties ?? {};
          const planId = props.detaljplan?.objektidentitet;

          // At-the-point and whole-plan in parallel: the second is what turns
          // each heading into "N of M" and backs the "show all" toggle.
          const [atPointCollection, allCollection] = await Promise.all([
            this.#api.findRegulations({
              planId,
              coordinate: serviceCoordinate,
              limit: maxItems,
              signal,
            }),
            this.#api.findRegulations({ planId, limit: maxItems, signal }),
          ]);

          const atPoint = this.#itemsOf(atPointCollection).map(
            this.#toRegulation
          );
          const all = this.#itemsOf(allCollection).map(this.#toRegulation);

          return {
            key: planId,
            plan: props.detaljplan ?? {},
            documents: this.#readDocuments(planItem),
            types: this.#groupByType(atPoint, all),
            truncated: all.length >= Number(maxItems),
          };
        })
      );

      this.#localObserver.publish("planChecker.result", { plans });
    } catch (error) {
      if (error.name === "AbortError") return;
      this.#localObserver.publish("planChecker.error", error.message);
    } finally {
      this.#localObserver.publish("planChecker.loading", false);
    }
  };

  getMap = () => this.#map;
  getApp = () => this.#app;
}
