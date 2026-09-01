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

// Field names verified against live v4.2 responses. The two families of
// endpoints answer in quite different shapes, which is why reading a label
// takes two routines rather than one:
//
//   /referens/*, /autocomplete/*  ->  flat objects with a ready-made label:
//       { "adress": "Täby Täby Lantmätarvägen 2 18753 Täby",
//         "objektidentitet": "76e01bf5-…" }
//
//   /{id}, /punkt                 ->  GeoJSON features whose properties nest
//       the parts and carry no label at all, so one has to be composed:
//       properties.adressomrade.faststalltNamn                 -> street name
//       properties.adressplatsattribut.adressplatsbeteckning   -> number
//       properties.adressplatsattribut.postnummer / .postort   -> postal
//
// The aliases below cushion against version drift; the first name in each list
// is the one the API actually uses today.
const ID_FIELDS = ["objektidentitet", "objektIdentitet", "id"];
const LABEL_FIELDS = ["adress", "adressbeteckning", "etikett", "beteckning"];

// btoa() only accepts Latin-1, so encode to UTF-8 bytes first - otherwise a
// password containing e.g. "å" throws instead of authenticating.
const toBase64 = (value) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value)));

const readString = (object, candidates) => {
  for (const key of candidates) {
    const value = object?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
};

// Swedish postal codes are written in two groups, "187 52" rather than
// "18752". The API returns them as a number.
const formatPostalCode = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 5
    ? `${digits.slice(0, 3)} ${digits.slice(3)}`
    : digits;
};

// With splitAdress=true the reference endpoints populate a components object
// alongside the flat "adress" string. Its exact shape is not documented outside
// Geotorget and no sample was to hand when this was written, so we look for the
// names the rest of the API uses, and fall back to the flat label whenever the
// components cannot be read - which is never worse than not asking for them.
// #readReference logs the object once when that happens, naming what to add.
const COMPONENT_CONTAINERS = [
  "adressComponents",
  "adresskomponenter",
  "adressKomponenter",
  "components",
];
const COMPONENT_STREET = [
  "adressomrade",
  "adressomradesnamn",
  "gatunamn",
  "faststalltNamn",
];
const COMPONENT_NUMBER = [
  "adressplatsbeteckning",
  "adressplatsnummer",
  "nummer",
];
const COMPONENT_POSTORT = ["postort", "postortsnamn"];

const readComponents = (item) => {
  for (const key of COMPONENT_CONTAINERS) {
    if (item?.[key] && typeof item[key] === "object") {
      return item[key];
    }
  }
  // The components may also be spread across the reference itself rather than
  // nested, in which case the street name is the tell.
  return readString(item, COMPONENT_STREET) ? item : null;
};

/**
 * @summary Composes the same short label from a reference's components as
 * #composeAddressLabel does from a feature, so the two agree.
 * @returns {string|null} null when the components are not recognisable
 */
const composeReferenceLabel = (components) => {
  const streetName = readString(components, COMPONENT_STREET);
  if (!streetName) {
    return null;
  }

  const number =
    readString(components, COMPONENT_NUMBER) ??
    String(components?.adressplatsnummer ?? "");
  const postort = readString(components, COMPONENT_POSTORT);
  const postal = [formatPostalCode(components?.postnummer), postort]
    .filter(Boolean)
    .join(" ");

  const street = [streetName, number].filter(Boolean).join(" ").trim();
  return [street, postal].filter(Boolean).join(", ") || null;
};

/**
 * @summary Composes a label for an address feature, which these endpoints do
 * not provide. Produces e.g. "Vallatorpsvägen 6, 187 52 Täby".
 * @description Deliberately shorter than the label the reference endpoints
 * return - "Täby Täby Vallatorpsvägen 6 18752 Täby" - which names the
 * municipality twice, once as kommun and once as kommundel.
 */
const composeAddressLabel = (properties) => {
  const area = properties?.adressomrade ?? {};
  const place = properties?.adressplatsattribut ?? {};

  // adressplatsbeteckning holds the number and, where an address has them, its
  // letter and position suffixes. Every string member of it belongs to the
  // designation, so join them all rather than naming fields we have not seen.
  const designation = Object.values(place.adressplatsbeteckning ?? {})
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(" ");

  const street = [area.faststalltNamn, designation].filter(Boolean).join(" ");
  const postal = [formatPostalCode(place.postnummer), place.postort]
    .filter(Boolean)
    .join(" ");

  return [street, postal].filter(Boolean).join(", ") || null;
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

    // Only sent when credentials are configured per map. With them in the
    // backend's .env instead - the better place - the proxy adds its own and
    // this header never exists.
    if (this.#options.token) {
      headers.Authorization = `Bearer ${this.#options.token}`;
    } else if (this.#options.username) {
      headers.Authorization = `Basic ${toBase64(
        `${this.#options.username}:${this.#options.password ?? ""}`
      )}`;
    }

    return headers;
  };

  #readErrorDetail = (body) => {
    if (!body) {
      return null;
    }

    try {
      const parsed = JSON.parse(body);
      const detail =
        parsed.description ?? parsed.message ?? parsed.reason ?? null;
      const errors = Array.isArray(parsed.errors)
        ? parsed.errors.join(" ")
        : parsed.errors;
      return [detail, errors].filter(Boolean).join(" ") || null;
    } catch {
      // Not JSON - a proxy or a web server further out may have answered in
      // HTML, which is not worth putting in a snackbar.
      return body.trimStart().startsWith("<") ? null : body.slice(0, 200);
    }
  };

  #fetchJson = async (url, signal) => {
    const response = await fetch(url, { signal, headers: this.#getHeaders() });

    if (!response.ok) {
      const detail = this.#readErrorDetail(
        await response.text().catch(() => "")
      );

      // The proxy is only mounted when it has been activated in the backend's
      // .env, so a 404 here usually means exactly that rather than a bad address.
      if (response.status === 404 && !detail) {
        throw new Error(
          "Adresstjänsten svarade inte (404). Kontrollera att adressproxyn är aktiverad i backend."
        );
      }

      const prefix =
        response.status === 401 || response.status === 403
          ? `Adresstjänsten nekade anropet (${response.status})`
          : `Adresstjänsten svarade med status ${response.status}`;

      throw new Error(
        detail
          ? `${prefix}: ${detail}`
          : `${prefix}. Kontrollera token för tjänsten.`
      );
    }

    return await response.json();
  };

  #readReference = (item) => {
    const id = readString(item, ID_FIELDS);
    const flatLabel = readString(item, LABEL_FIELDS);

    // Prefer a label built from the components, which drops the duplicated
    // municipality the flat string carries ("Täby Täby Lantmätarvägen 2 …").
    const components = readComponents(item);
    const label = composeReferenceLabel(components) ?? flatLabel;

    if (
      components &&
      !composeReferenceLabel(components) &&
      !this.#warnedAboutShape
    ) {
      this.#warnedAboutShape = true;
      console.warn(
        "AddressSearch: splitAdress returned components this plugin could not read, so the API's own label is used instead. Add the field names below to COMPONENT_* in AddressSearchModel to tidy the labels.",
        components
      );
    }

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
    // Populates the components the tidy label is built from. Harmless when the
    // response turns out not to carry them: the flat label is used instead.
    params.set("splitAdress", "true");

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
   * @summary Reads what is worth showing about an address feature beside its
   * label.
   * @description insamlingslage says what the coordinate was actually measured
   * against - "Byggnad", "Ingång", and so on - which decides how literally the
   * marker should be read: an entrance point sits on the street side of the
   * building, a building point somewhere within its footprint.
   */
  describeFeature = (feature) => {
    const properties = feature?.getProperties() ?? {};
    const place = properties.adressplatsattribut ?? {};

    return {
      label: composeAddressLabel(properties),
      insamlingslage:
        typeof place.insamlingslage === "string" ? place.insamlingslage : null,
    };
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
