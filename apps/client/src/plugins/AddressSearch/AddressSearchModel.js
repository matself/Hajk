import { get as getProjection, transform } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import AddressSearchApi from "./AddressSearchApi";
import {
  describeAddressFeature,
  readAddressReference,
  REFERENCE_FIELDS,
} from "./addressFormat";
import {
  DEFAULT_OPTIONS,
  FALLBACK_SRID,
  MIN_SEARCH_LENGTH,
  SUPPORTED_SRIDS,
} from "./constants";

// A geometry that isn't a point - the API can return one for an address
// covering an area - still has to be centered on something.
const getCenterOfExtent = (geometry) => {
  const [minX, minY, maxX, maxY] = geometry.getExtent();
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};

export default class AddressSearchModel {
  #map;
  #options;
  #api;
  #source;
  #vector;
  #pickListener = null;
  #warnedAboutShape = false;

  constructor(settings) {
    this.#map = settings.map;

    // An admin form hands us empty strings for fields left blank, which must
    // not shadow the defaults below them.
    const configured = Object.fromEntries(
      Object.entries(settings.options ?? {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== ""
      )
    );
    this.#options = { ...DEFAULT_OPTIONS, ...configured };

    const mapServiceBase = settings.app.config.appConfig.mapserviceBase;
    this.#api = new AddressSearchApi(
      `${mapServiceBase}/${this.#options.proxyPath}`,
      this.#options
    );

    this.#source = new VectorSource();
    this.#vector = new Vector({
      layerType: "system",
      zIndex: 5000,
      name: "pluginAddressSearch",
      caption: "Address search layer",
      source: this.#source,
    });
    this.#map.addLayer(this.#vector);
  }

  get minSearchLength() {
    return MIN_SEARCH_LENGTH;
  }

  get options() {
    return this.#options;
  }

  #getViewProjection = () => this.#map.getView().getProjection().getCode();

  /**
   * @summary The SRID to ask the API for. Preferring the map's own projection
   * means the response needs no transformation at all, which is the normal case
   * for a Swedish map.
   */
  #getSrid = () => {
    const srid = Number(this.#getViewProjection().split(":").pop());
    return SUPPORTED_SRIDS.includes(srid) ? srid : FALLBACK_SRID;
  };

  /**
   * @summary Projections are registered from the map config, so a map that
   * neither uses nor lists SWEREF 99 has nothing to transform the response
   * with. Say so in plain words instead of letting OpenLayers fail deeper down.
   */
  #assertProjectionIsRegistered = (code) => {
    if (!getProjection(code)) {
      throw new Error(
        `Kartan saknar projektionen ${code}, som krävs för att visa adresser. Lägg till den under "projections" i kartkonfigurationen.`
      );
    }
  };

  #readFeatures = (payload, srid) => {
    const dataProjection = `EPSG:${srid}`;
    this.#assertProjectionIsRegistered(dataProjection);

    return new GeoJSON().readFeatures(payload, {
      dataProjection,
      featureProjection: this.#getViewProjection(),
    });
  };

  /**
   * @summary Reports a response shape the plugin could not read, once per
   * session. The logged object names exactly which field to add to
   * addressFormat.js, which is how the rest of this schema was pinned down.
   */
  #warnAboutShape = (message, ...details) => {
    if (this.#warnedAboutShape) {
      return;
    }
    this.#warnedAboutShape = true;
    console.warn(`AddressSearch: ${message}`, ...details);
  };

  /**
   * @summary Free-text search for addresses. Returns references (label + id)
   * only - the geometry costs a second call, made when the user picks one.
   * @param {string} searchString
   * @returns {Promise<Array<{id: string, label: string}>>}
   */
  search = async (searchString) => {
    const references = (await this.#api.searchReferences(searchString)).map(
      readAddressReference
    );

    const unreadable = references.find((r) => r.unreadableComponents);
    if (unreadable) {
      this.#warnAboutShape(
        "splitAdress returned components that could not be read, so the API's own label is used instead. Add the field names below to COMPONENT_* in addressFormat.js to shorten the labels.",
        unreadable.unreadableComponents
      );
    } else if (references.some((r) => !r.id || !r.label)) {
      this.#warnAboutShape(
        "could not read an id and a label from an address reference. The plugin looks for %o and %o - other names need adding to addressFormat.js.",
        REFERENCE_FIELDS.ID_FIELDS,
        REFERENCE_FIELDS.LABEL_FIELDS,
        references.find((r) => !r.id || !r.label)
      );
    }

    return references
      .filter((reference) => reference.id && reference.label)
      .map(({ id, label }) => ({ id, label }));
  };

  /**
   * @summary Reads what is worth showing about an address feature beside its
   * label - see describeAddressFeature.
   */
  describeFeature = (feature) =>
    describeAddressFeature(feature?.getProperties() ?? {});

  /**
   * @summary Fetches one address by its id and returns it as an OpenLayers
   * feature in the map's projection.
   * @param {string} id
   * @returns {Promise<import("ol/Feature").default|null>}
   */
  getAddressFeature = async (id) => {
    const srid = this.#getSrid();
    const payload = await this.#api.fetchAddress(id, srid);

    return this.#readFeatures(payload, srid)[0] ?? null;
  };

  /**
   * @summary Looks up the address nearest to a coordinate (GET /punkt).
   * @param {Array<number>} coordinate Map coordinate, in the view's projection
   * @returns {Promise<{feature: object, label: string, insamlingslage: string|null}|null>}
   */
  findAddressAtCoordinate = async (coordinate) => {
    const srid = this.#getSrid();
    const target = `EPSG:${srid}`;
    const viewProjection = this.#getViewProjection();

    let point = coordinate;
    if (viewProjection !== target) {
      this.#assertProjectionIsRegistered(target);
      point = transform(coordinate, viewProjection, target);
    }

    // OpenLayers orders coordinates easting first; the API wants the opposite.
    const [easting, northing] = point;
    const payload = await this.#api.fetchNearest(northing, easting, srid);

    const feature = this.#readFeatures(payload, srid)[0];
    if (!feature) {
      return null;
    }

    const described = this.describeFeature(feature);

    return {
      feature,
      label: described.label ?? "Okänd adress",
      insamlingslage: described.insamlingslage,
    };
  };

  /**
   * @summary Places the given feature on the map and zooms to it.
   */
  showFeature = (feature) => {
    feature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 8,
          stroke: new Stroke({ color: "#ffffff", width: 2 }),
          fill: new Fill({ color: "#d32f2f" }),
        }),
      })
    );

    this.#source.clear();
    this.#source.addFeature(feature);

    const geometry = feature.getGeometry();
    if (!geometry) {
      return;
    }

    this.#map.getView().animate({
      center: geometry.getCoordinates?.() ?? getCenterOfExtent(geometry),
      zoom: this.#options.zoom,
      duration: 500,
    });
  };

  /**
   * @summary Turns the map into an address picker. The clickLock keeps
   * FeatureInfo and friends from reacting to the same click.
   * @param {function} onPick Called with the click's map coordinate
   */
  enablePickMode = (onPick) => {
    if (this.#pickListener) {
      return;
    }
    this.#pickListener = (event) => onPick(event.coordinate);
    this.#map.clickLock.add("addresssearch");
    this.#map.on("singleclick", this.#pickListener);
  };

  disablePickMode = () => {
    if (!this.#pickListener) {
      return;
    }
    this.#map.un("singleclick", this.#pickListener);
    this.#map.clickLock.delete("addresssearch");
    this.#pickListener = null;
  };

  clearResult = () => {
    this.#source.clear();
  };

  /**
   * @summary Called when the plugin's window closes: stop picking, drop the
   * marker and abort anything still in flight.
   */
  reset = () => {
    this.disablePickMode();
    this.clearResult();
    this.#api.abortAll();
  };
}
