import { get as getProjection, transform } from "ol/proj";
import Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Stroke, Style } from "ol/style";

import PlanCheckerApi from "./PlanCheckerApi";
import {
  DEFAULT_OPTIONS,
  HIGHLIGHT_STROKE_COLOR,
  HIGHLIGHT_STROKE_WIDTH,
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
  #localObserver;
  #options;
  #api;
  #assetProxyBase;
  #drawModel;
  #highlightSource;
  #highlightLayer;

  constructor(settings) {
    this.#map = settings.map;
    this.#localObserver = settings.localObserver;
    // Only used to clear the click marker the instant it has served its
    // purpose - see #handleFeatureAdded. The model does not otherwise touch
    // the draw interaction; that stays the entry component's job.
    this.#drawModel = settings.drawModel;

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
    this.#assetProxyBase = `${mapServiceBase}/${this.#options.assetProxyPath}`;

    // A plain outline, not a filled area: the WMS underneath already carries
    // the plan's official styling, and painting over it with a solid colour
    // was explicitly what this was built to avoid.
    this.#highlightSource = new VectorSource();
    this.#highlightLayer = new Vector({
      source: this.#highlightSource,
      layerType: "system",
      name: "pluginPlanCheckerHighlight",
      caption: "Detaljplan - markerad bestämmelse",
      zIndex: 5000,
      style: new Style({
        stroke: new Stroke({
          color: HIGHLIGHT_STROKE_COLOR,
          width: HIGHLIGHT_STROKE_WIDTH,
        }),
      }),
    });
    this.#map.addLayer(this.#highlightLayer);

    this.#localObserver.subscribe(
      "drawModel.featureAdded",
      this.#handleFeatureAdded
    );
  }

  /**
   * Forget the current result and drop anything in flight. The window is only
   * hidden, not unmounted, so without this the previous answer is still on
   * screen the next time the tool is opened - and a search started just before
   * closing would arrive afterwards and fill the list back in.
   */
  reset = () => {
    this.#api.abort();
    this.#highlightSource.clear();
    this.#localObserver.publish("planChecker.reset");
  };

  /**
   * Drop the subscription, abort anything in flight, and remove the layer this
   * model added to the map. Without this the model would keep answering draw
   * events after the plugin is gone, and its highlight layer would outlive it.
   */
  destroy = () => {
    this.#localObserver.unsubscribe("drawModel.featureAdded");
    this.#api.abort();
    this.#map.removeLayer(this.#highlightLayer);
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
      .map((a) => ({
        title: a.title,
        href: this.#toProxiedAssetUrl(a.href),
        role: a.roles?.[0],
      }));
  };

  /**
   * Point a document link at our own proxy. The hrefs are absolute URLs into
   * Lantmateriet's download endpoint, which requires the same credentials as the
   * search service - follow one directly and the browser puts up a login prompt
   * nobody can answer. Anything not matching that shape is left alone rather
   * than mangled.
   */
  #toProxiedAssetUrl = (href) => {
    const match = /\/nedladdning\/v\d+\/(.+)$/.exec(href);
    return match ? `${this.#assetProxyBase}/${match[1]}` : href;
  };

  /**
   * Draw the regulation geometries that cover the clicked point, replacing
   * whatever was shown for the previous click. NGP hands back a plain GeoJSON
   * geometry per item, already in the service's own CRS, so only a transform
   * is needed - no feature parsing, which is what would drop the assets (see
   * #itemsOf).
   */
  #showHighlight = (geoJsonGeometries) => {
    this.#highlightSource.clear();
    if (geoJsonGeometries.length === 0) return;

    const reader = new GeoJSON();
    const viewProjection = this.#getViewProjection();
    const features = geoJsonGeometries.map(
      (geometry) =>
        new Feature({
          geometry: reader.readGeometry(geometry, {
            dataProjection: SERVICE_PROJECTION,
            featureProjection: viewProjection,
          }),
        })
    );
    this.#highlightSource.addFeatures(features);
  };

  #handleFeatureAdded = async (feature) => {
    const coordinate = feature.getGeometry().getCoordinates();
    // The point only ever existed to carry this coordinate - once read, it
    // would just be a marker sitting on top of the highlight outline below,
    // which is exactly what this was built to not have.
    this.#drawModel.removeDrawnFeatures();
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

      const results = await Promise.all(
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

          const atPointItems = this.#itemsOf(atPointCollection);
          const atPoint = atPointItems.map(this.#toRegulation);
          const all = this.#itemsOf(allCollection).map(this.#toRegulation);

          return {
            plan: {
              key: planId,
              plan: props.detaljplan ?? {},
              documents: this.#readDocuments(planItem),
              types: this.#groupByType(atPoint, all),
              truncated: all.length >= Number(maxItems),
            },
            // Kept separate from the plan object above: the view has no use
            // for raw geometry, only #showHighlight does.
            geometries: atPointItems
              .map((item) => item.geometry)
              .filter(Boolean),
          };
        })
      );

      const plans = results.map((r) => r.plan);
      this.#showHighlight(results.flatMap((r) => r.geometries));

      this.#localObserver.publish("planChecker.result", { plans });
    } catch (error) {
      if (error.name === "AbortError") return;
      this.#highlightSource.clear();
      this.#localObserver.publish("planChecker.error", error.message);
    } finally {
      this.#localObserver.publish("planChecker.loading", false);
    }
  };
}
