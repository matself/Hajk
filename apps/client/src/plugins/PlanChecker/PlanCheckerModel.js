import { get as getProjection, transform } from "ol/proj";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import GeoJSON from "ol/format/GeoJSON";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle, Fill, Stroke, Style } from "ol/style";

import PlanCheckerApi from "./PlanCheckerApi";
import { parseDomainObject, stripPlaceholders } from "./domainObject";
import {
  DEFAULT_OPTIONS,
  DOMAIN_ASSET_ROLE,
  HIGHLIGHT_STROKE_COLOR,
  HIGHLIGHT_STROKE_WIDTH,
  SERVICE_PROJECTION,
  USE_REGULATION_TYPE,
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
 *   3. all of that plan's regulations, which carry the labels
 *      (användningsform, kategori) and the geometry (EPSG:3006) that a click
 *      on any of them lights up in the map.
 *
 * 2 and 3 run together per plan, and with them a fourth request: the plan's
 * domänobjekt, which adds the purpose, the decision details and which
 * användningsbestämmelse each regulation regulates (see domainObject.js). The
 * domänobjekt is an enhancement: if it cannot be had, the plan is still shown,
 * just without that structure.
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
  // Regulation id -> GeoJSON geometry (EPSG:3006), for the current click only.
  // Kept out of the view's state: it has no use for raw geometry, only the
  // highlight does.
  #geometries = new Map();
  #atPointGeometries = [];

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
        // A regulation can be a point (a symbol, a marked tree), which a
        // stroke alone would not draw at all.
        image: new Circle({
          radius: 7,
          fill: new Fill({ color: "rgba(230, 74, 25, 0.35)" }),
          stroke: new Stroke({
            color: HIGHLIGHT_STROKE_COLOR,
            width: HIGHLIGHT_STROKE_WIDTH,
          }),
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
    this.#geometries.clear();
    this.#atPointGeometries = [];
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

  /** Shape one regulation item for the view. */
  #toRegulation = (item) => {
    const props = item.properties ?? {};
    return {
      id: item.id,
      type: props.feature?.typ || "Övrigt",
      label: props.feature?.etikett || props.title || "",
      text: stripPlaceholders(
        props.planbestammelse?.bestammelseformulering || ""
      ),
      anvandningsform: props.planbestammelse?.anvandningsform || "",
      kategori: props.planbestammelse?.kategori || "",
      underkategori: props.planbestammelse?.underkategori || "",
      atPoint: false,
    };
  };

  /**
   * Arrange a plan's regulations under the användningsbestämmelse they regulate
   * (`regulates` comes from the domänobjekt; without it every use simply has no
   * children). A use is "here" when it, or anything regulating it, applies at
   * the clicked point - a regulation drawn as a line or a small area can miss
   * the point while still belonging to the use the user clicked on.
   *
   * Regulations that regulate no use go in `looseHere` / `looseRest`.
   */
  #arrange = (all, regulates) => {
    const isUse = (r) => r.type.toLowerCase() === USE_REGULATION_TYPE;
    const nodes = new Map(
      all.filter(isUse).map((use) => [use.id, { use, children: [] }])
    );
    const loose = [];

    for (const r of all.filter((r) => !isUse(r))) {
      const parents = (regulates?.get(r.id) ?? []).filter((id) =>
        nodes.has(id)
      );
      if (parents.length === 0) loose.push(r);
      parents.forEach((id) => nodes.get(id).children.push(r));
    }

    const isHere = (n) => n.use.atPoint || n.children.some((c) => c.atPoint);
    return {
      here: [...nodes.values()].filter(isHere),
      rest: [...nodes.values()].filter((n) => !isHere(n)),
      looseHere: loose.filter((r) => r.atPoint),
      looseRest: loose.filter((r) => !r.atPoint),
    };
  };

  /**
   * The plan's domänobjekt, or null. It only adds structure, so a failed fetch
   * must not take the rest of the answer with it - except an abort, which means
   * the user has clicked elsewhere and the whole answer is moot.
   */
  #fetchDomain = async (planItem, signal) => {
    const asset = Object.values(planItem.assets ?? {}).find(
      (a) => a?.href && a.roles?.[0] === DOMAIN_ASSET_ROLE
    );
    if (!asset) return null;
    try {
      return parseDomainObject(
        await this.#api.fetchDomainObject(
          this.#toProxiedAssetUrl(asset.href),
          signal
        )
      );
    } catch (error) {
      if (error.name === "AbortError") throw error;
      return null;
    }
  };

  /**
   * Light up the given regulations (by id) and move the map to them. Called
   * when the user clicks a regulation in the list.
   */
  highlightRegulations = (ids) => {
    const geometries = ids
      .map((id) => this.#geometries.get(id))
      .filter(Boolean);
    this.#showHighlight(geometries);
    this.#fitToHighlight();
  };

  /** Go back to marking what applies at the clicked point. */
  showAtPoint = () => this.#showHighlight(this.#atPointGeometries);

  /**
   * Room to leave round the highlight when zooming to it. Hajk's tool windows
   * float over the map, and this tool's is tall; without allowing for that the
   * highlight is centred in the whole map, i.e. right behind the window. Only
   * a window beside the map's middle is allowed for, and never if that would
   * leave next to no map visible.
   */
  #fitPadding = () => {
    const padding = [60, 60, 60, 60];
    const map = this.#map.getTargetElement()?.getBoundingClientRect();
    if (!map) return padding;

    for (const element of document.querySelectorAll(".hajk-window")) {
      const rect = element.getBoundingClientRect();
      // A minimised window is only its title bar and covers next to nothing.
      if (rect.height < map.height / 3) continue;
      const covered =
        rect.left + rect.width / 2 > map.left + map.width / 2
          ? [1, map.right - rect.left]
          : [3, rect.right - map.left];
      if (map.width - covered[1] < 250) continue;
      padding[covered[0]] = Math.max(padding[covered[0]], covered[1] + 20);
    }
    return padding;
  };

  #fitToHighlight = () => {
    const extent = this.#highlightSource.getExtent();
    if (!extent.every(Number.isFinite)) return;
    const [minX, minY, maxX, maxY] = extent;
    // A single point has no extent to fit; fitting the point itself lets
    // OpenLayers pick the zoom from maxZoom instead.
    const target =
      minX === maxX && minY === maxY ? new Point([minX, minY]) : extent;
    this.#map.getView().fit(target, {
      padding: this.#fitPadding(),
      maxZoom: 19,
      duration: 250,
    });
  };

  /**
   * The plan's documents, from the item's assets. The plan payload itself
   * (role "detaljplan") is the machine-readable bundle rather than something
   * to hand a user, so it is left out.
   */
  #readDocuments = (item) => {
    const assets = item.assets ?? {};
    return Object.values(assets)
      .filter((a) => a?.href && a.title && a.roles?.[0] !== DOMAIN_ASSET_ROLE)
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
      this.#geometries.clear();
      this.#atPointGeometries = [];
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

          // At the point, the whole plan, and the plan's domänobjekt, all in
          // parallel. The whole plan supplies labels and geometry for every
          // regulation; the domänobjekt supplies the structure between them.
          const [atPointCollection, allCollection, domain] = await Promise.all([
            this.#api.findRegulations({
              planId,
              coordinate: serviceCoordinate,
              limit: maxItems,
              signal,
            }),
            this.#api.findRegulations({ planId, limit: maxItems, signal }),
            this.#fetchDomain(planItem, signal),
          ]);

          const atPointItems = this.#itemsOf(atPointCollection);
          const allItems = this.#itemsOf(allCollection);
          const atPointIds = new Set(atPointItems.map((item) => item.id));

          for (const item of allItems) {
            if (item.geometry) this.#geometries.set(item.id, item.geometry);
          }
          const all = allItems.map(this.#toRegulation);
          all.forEach((r) => (r.atPoint = atPointIds.has(r.id)));

          return {
            plan: {
              key: planId,
              plan: props.detaljplan ?? {},
              documents: this.#readDocuments(planItem),
              // null when the domänobjekt was not available.
              domain: domain && {
                purpose: domain.purpose,
                decisions: domain.decisions,
              },
              ...this.#arrange(all, domain?.regulates),
              total: all.length,
              countAtPoint: atPointIds.size,
              truncated: all.length >= Number(maxItems),
            },
            geometries: atPointItems
              .map((item) => item.geometry)
              .filter(Boolean),
          };
        })
      );

      const plans = results.map((r) => r.plan);
      this.#atPointGeometries = results.flatMap((r) => r.geometries);
      this.#showHighlight(this.#atPointGeometries);

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
