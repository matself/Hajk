import GeoJSON from "ol/format/GeoJSON";
import { get as getProjection, transform } from "ol/proj";

import PlanCheckerApi from "./PlanCheckerApi";
import {
  DEFAULT_OPTIONS,
  FALLBACK_EPSG_CODE,
  REGULATION_TYPE_ORDER,
  SUPPORTED_EPSG_CODES,
} from "./constants";

/**
 * @summary Turns a click in the map into the detaljplan regulations that apply
 * at that exact point.
 *
 * @description The click arrives as a point drawn by the DrawModel, is widened
 * into a small bbox (the service offers no `intersects`, only `bbox`), sent to
 * NGP through Hajk's backend proxy, and the answer is then narrowed to the
 * geometries that really contain the coordinate - a bbox hit is not a hit.
 *
 * Each NGP feature is one (plan, regulation, geometry) triple with the plan's
 * own metadata repeated on it, so grouping needs no second request.
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
        ([, value]) => value !== undefined && value !== null && value !== ""
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

  #getViewProjectionCode = () => this.#map.getView().getProjection().getCode();

  #getViewEpsgCode = () => this.#getViewProjectionCode().replace(/^EPSG:/i, "");

  /**
   * Decide which CRS to ask the service for. NGP accepts the SWEREF 99 zones,
   * RT90 and CRS84, but not EPSG:3857 - which is exactly what a Hajk map often
   * runs in. When the map's own projection is not on the list we ask in
   * SWEREF 99 TM and let OpenLayers transform both ways, which needs that
   * projection registered under `projections` in the map config.
   */
  #resolveRequestEpsgCode = () => {
    const viewCode = this.#getViewEpsgCode();
    if (SUPPORTED_EPSG_CODES.includes(viewCode)) return viewCode;

    if (!getProjection(`EPSG:${FALLBACK_EPSG_CODE}`)) {
      throw new Error(
        `Kartans projektion EPSG:${viewCode} stöds inte av detaljplanetjänsten, ` +
          `och EPSG:${FALLBACK_EPSG_CODE} som skulle använts i stället saknas i ` +
          `kartkonfigurationen. Lägg till den under "projections".`
      );
    }
    return FALLBACK_EPSG_CODE;
  };

  /**
   * Order regulation types the way a plan document does, keeping anything
   * unrecognised after the known ones rather than dropping it.
   */
  #compareRegulationTypes = (a, b) => {
    const rank = (value) => {
      const i = REGULATION_TYPE_ORDER.indexOf((value || "").toLowerCase());
      return i === -1 ? REGULATION_TYPE_ORDER.length : i;
    };
    const diff = rank(a) - rank(b);
    return diff !== 0 ? diff : a.localeCompare(b, "sv");
  };

  /**
   * Group flat NGP features into plan -> regulation type -> regulations.
   * The plan's own fields are repeated on every feature, so the first one
   * seen carries the whole plan's metadata.
   */
  #groupByPlan = (features) => {
    const plans = new Map();

    for (const feature of features) {
      const props = feature.getProperties();
      const plan = props.detaljplan ?? {};
      // Fall back to the object identity so a plan missing its beteckning
      // still groups as one plan rather than collapsing with others.
      const planKey = plan.beteckning || plan.objektidentitet || "Okänd plan";

      if (!plans.has(planKey)) {
        plans.set(planKey, { key: planKey, plan, types: new Map() });
      }
      const entry = plans.get(planKey);

      const type = props.feature?.typ || "Övrigt";
      if (!entry.types.has(type)) entry.types.set(type, []);
      entry.types.get(type).push({
        id: feature.getId(),
        label: props.feature?.etikett || props.title || "",
        regulation: props.planbestammelse ?? {},
      });
    }

    return [...plans.values()].map((entry) => ({
      key: entry.key,
      plan: entry.plan,
      // Assets are repeated on every regulation of a plan, so one read is enough.
      types: [...entry.types.entries()]
        .sort(([a], [b]) => this.#compareRegulationTypes(a, b))
        .map(([type, regulations]) => ({ type, regulations })),
    }));
  };

  #handleFeatureAdded = async (feature) => {
    const coordinate = feature.getGeometry().getCoordinates();

    if (!this.#options.kommunkod) {
      this.#localObserver.publish(
        "planChecker.error",
        "Ingen kommunkod är konfigurerad för verktyget."
      );
      return;
    }

    this.#localObserver.publish("planChecker.loading", true);

    try {
      const viewProjection = this.#getViewProjectionCode();
      const requestEpsgCode = this.#resolveRequestEpsgCode();
      const requestProjection = `EPSG:${requestEpsgCode}`;

      // Build the bbox in the CRS we are about to ask in, so the buffer is in
      // that CRS's own metres rather than Web Mercator's stretched ones.
      const [x, y] =
        requestProjection === viewProjection
          ? coordinate
          : transform(coordinate, viewProjection, requestProjection);
      const buffer = Number(this.#options.clickBufferMeters);

      const collection = await this.#api.getItemsByBbox({
        kommunkod: this.#options.kommunkod,
        bbox: [x - buffer, y - buffer, x + buffer, y + buffer],
        epsgCode: requestEpsgCode,
        limit: this.#options.maxItems,
      });

      // Read straight into the view's projection, so the hit test below can
      // use the original click coordinate untransformed.
      const all = new GeoJSON().readFeatures(collection, {
        dataProjection: requestProjection,
        featureProjection: viewProjection,
      });

      // The service filters on bounding boxes, so a returned regulation need
      // not actually cover the clicked point. Narrow it here.
      const hits = all.filter((f) =>
        f.getGeometry()?.intersectsCoordinate(coordinate)
      );

      this.#localObserver.publish("planChecker.result", {
        plans: this.#groupByPlan(hits),
        // Worth surfacing: it tells the user whether the plan list is complete
        // or was cut off by the configured limit.
        truncated: all.length >= Number(this.#options.maxItems),
      });
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
