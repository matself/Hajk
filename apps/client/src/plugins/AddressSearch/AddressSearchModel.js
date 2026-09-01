import { get as getProjection, transform } from "ol/proj";
import GeoJSON from "ol/format/GeoJSON";
import Vector from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";

import {
  DEFAULT_OPTIONS,
  FALLBACK_SRID,
  MIN_SEARCH_LENGTH,
  SUPPORTED_SRIDS,
} from "./constants";

// The reference endpoints answer with "etikett och id" per address, but the
// product's JSON schema is not published outside Geotorget, so rather than
// guessing one field name we look for the ones the API is known to use and
// report what we actually got when none of them match. See #readReference.
const ID_FIELDS = ["objektidentitet", "objektIdentitet", "id"];
const LABEL_FIELDS = [
  "adressbeteckning",
  "etikett",
  "beteckning",
  "adress",
  "label",
];

const readString = (object, candidates) => {
  for (const key of candidates) {
    const value = object?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

export default class AddressSearchModel {
  #map;
  #options;
  #baseUrl;
  #source;
  #vector;
  #searchController;
  #detailsController;
  #pointController;
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
    this.#baseUrl = `${mapServiceBase}/${this.#options.proxyPath}`;

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

  /**
   * @summary The SRID to ask the API for. Preferring the map's own projection
   * means the response needs no transformation at all, which is the normal case
   * for a Swedish map.
   */
  #getSrid = () => {
    const srid = Number(this.#getViewProjection().split(":").pop());
    return SUPPORTED_SRIDS.includes(srid) ? srid : FALLBACK_SRID;
  };

  #getViewProjection = () => this.#map.getView().getProjection().getCode();

  /**
   * @summary Projections are registered from the map config, so a map that
   * neither uses nor lists SWEREF 99 has nothing to transform the response with.
   * Say so in plain words instead of letting OpenLayers fail deeper down.
   */
  #assertProjectionIsRegistered = (code) => {
    if (!getProjection(code)) {
      throw new Error(
        `Kartan saknar projektionen ${code}, som krävs för att visa adresser. Lägg till den under "projections" i kartkonfigurationen.`
      );
    }
  };

  #getHeaders = () => {
    const headers = { Accept: "application/json" };
    // Only sent when the token is configured per map. With the token in the
    // backend's .env instead - the better place for it - the proxy adds its own
    // and this header never exists.
    if (this.#options.token) {
      headers.Authorization = `Bearer ${this.#options.token}`;
    }
    return headers;
  };

  #fetchJson = async (url, signal) => {
    const response = await fetch(url, { signal, headers: this.#getHeaders() });

    if (!response.ok) {
      // The proxy is only mounted when it has been activated in the backend's
      // .env, so a 404 here usually means exactly that rather than a bad address.
      if (response.status === 404) {
        throw new Error(
          "Adresstjänsten svarade inte (404). Kontrollera att adressproxyn är aktiverad i backend."
        );
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error(
          `Adresstjänsten nekade anropet (${response.status}). Kontrollera token för tjänsten.`
        );
      }
      throw new Error(`Adresstjänsten svarade med status ${response.status}.`);
    }

    return await response.json();
  };

  #readReference = (item) => {
    const id = readString(item, ID_FIELDS);
    const label = readString(item, LABEL_FIELDS);

    if ((!id || !label) && !this.#warnedAboutShape) {
      this.#warnedAboutShape = true;
      console.warn(
        "AddressSearch: could not read an id and a label from the address reference below. The plugin looks for %o and %o - if the API uses other names, they need adding to AddressSearchModel.",
        ID_FIELDS,
        LABEL_FIELDS,
        item
      );
    }

    return { id, label, raw: item };
  };

  /**
   * @summary Free-text search for addresses. Returns references (label + id)
   * only - the geometry costs a second call, made when the user picks one.
   * @param {string} searchString
   * @returns {Promise<Array>} Array of {id, label, raw}
   */
  search = async (searchString) => {
    this.#searchController?.abort();
    this.#searchController = new AbortController();

    const params = new URLSearchParams({
      adress: searchString,
      maxHits: String(this.#options.maxHits),
    });
    if (this.#options.kommunkod) {
      params.set("kommunkod", this.#options.kommunkod);
    }
    if (this.#options.onlyCurrentAddresses) {
      params.set("status", "Gällande");
    }

    const payload = await this.#fetchJson(
      `${this.#baseUrl}/referens/fritext?${params}`,
      this.#searchController.signal
    );

    // The response is a list; should it ever arrive wrapped in an object, take
    // the first array in it rather than showing the user nothing.
    const list = Array.isArray(payload)
      ? payload
      : (Object.values(payload ?? {}).find(Array.isArray) ?? []);

    return list
      .map(this.#readReference)
      .filter((reference) => reference.id && reference.label);
  };

  #readFeatures = (payload, srid) => {
    const dataProjection = `EPSG:${srid}`;
    const featureProjection = this.#getViewProjection();
    this.#assertProjectionIsRegistered(dataProjection);

    return new GeoJSON().readFeatures(payload, {
      dataProjection,
      featureProjection,
    });
  };

  /**
   * @summary Fetches one address by its id and returns it as an OpenLayers
   * feature in the map's projection.
   * @param {string} id
   * @returns {Promise<import("ol/Feature").default|null>}
   */
  getAddressFeature = async (id) => {
    this.#detailsController?.abort();
    this.#detailsController = new AbortController();

    const srid = this.#getSrid();
    const payload = await this.#fetchJson(
      `${this.#baseUrl}/${encodeURIComponent(id)}?includeData=basinformation&srid=${srid}`,
      this.#detailsController.signal
    );

    return this.#readFeatures(payload, srid)[0] ?? null;
  };

  /**
   * @summary Looks up the address nearest to a coordinate (GET /punkt).
   * @param {Array<number>} coordinate Map coordinate, in the view's projection
   * @returns {Promise<{feature: object, label: string}|null>}
   */
  findAddressAtCoordinate = async (coordinate) => {
    this.#pointController?.abort();
    this.#pointController = new AbortController();

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

    const params = new URLSearchParams({
      punktSrid: String(srid),
      koordinater: `${northing},${easting}`,
      includeData: "basinformation",
      srid: String(srid),
    });

    const payload = await this.#fetchJson(
      `${this.#baseUrl}/punkt?${params}`,
      this.#pointController.signal
    );

    const feature = this.#readFeatures(payload, srid)[0];
    if (!feature) {
      return null;
    }

    return {
      feature,
      label:
        readString(feature.getProperties(), LABEL_FIELDS) ?? "Okänd adress",
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
    this.#searchController?.abort();
    this.#detailsController?.abort();
    this.#pointController?.abort();
  };
}

// A geometry that isn't a point (the API can return one for an address that
// covers an area) still has to be centered on something.
const getCenterOfExtent = (geometry) => {
  const [minX, minY, maxX, maxY] = geometry.getExtent();
  return [(minX + maxX) / 2, (minY + maxY) / 2];
};
