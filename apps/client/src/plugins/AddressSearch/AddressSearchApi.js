// btoa() only accepts Latin-1, so encode to UTF-8 bytes first - otherwise a
// password containing e.g. "å" throws instead of authenticating.
const toBase64 = (value) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value)));

/**
 * @summary Reads an error response into something a user can act on.
 * @description Two different services answer on this route and both explain
 * themselves in the body: Lantmateriet's Fault object ({code, reason, errors})
 * and, in front of it, the API gateway ({code, message, description}). A
 * gateway rejection in particular is worth quoting rather than paraphrasing -
 * "scope validation failed" means the credentials are genuine but not entitled
 * to that endpoint, which is a different problem from the wrong credentials,
 * and a generic "check your token" sends you hunting for the wrong thing.
 */
const readErrorDetail = (body) => {
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

/**
 * @summary Talks to Belägenhetsadress Direkt through Hajk's backend proxy.
 * @description Every call is abortable and each kind of call keeps its own
 * controller, so a search in flight is replaced by the next keystroke without
 * cancelling the address lookup a click just started.
 */
export default class AddressSearchApi {
  #baseUrl;
  #options;
  #controllers = new Map();

  constructor(baseUrl, options) {
    this.#baseUrl = baseUrl;
    this.#options = options;
  }

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

  #fetchJson = async (key, path) => {
    this.#controllers.get(key)?.abort();
    const controller = new AbortController();
    this.#controllers.set(key, controller);

    const response = await fetch(`${this.#baseUrl}${path}`, {
      signal: controller.signal,
      headers: this.#getHeaders(),
    });

    if (!response.ok) {
      const detail = readErrorDetail(await response.text().catch(() => ""));

      // The proxy is only mounted when it has been activated in the backend's
      // .env, so a 404 with no body usually means exactly that rather than a
      // bad address.
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
          : `${prefix}. Kontrollera uppgifterna för tjänsten.`
      );
    }

    return await response.json();
  };

  /**
   * @summary Free-text search. Returns references - label and id, no geometry.
   * @param {string} searchString
   * @returns {Promise<Array<object>>}
   */
  searchReferences = async (searchString) => {
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
      "search",
      `/referens/fritext?${params}`
    );

    // The response is a list; should it ever arrive wrapped in an object, take
    // the first array in it rather than showing the user nothing.
    return Array.isArray(payload)
      ? payload
      : (Object.values(payload ?? {}).find(Array.isArray) ?? []);
  };

  /**
   * @summary Fetches one address in full, geometry included.
   * @param {string} id
   * @param {number} srid
   * @returns {Promise<object>} A GeoJSON FeatureCollection
   */
  fetchAddress = (id, srid) =>
    this.#fetchJson(
      "address",
      `/${encodeURIComponent(id)}?includeData=basinformation&srid=${srid}`
    );

  /**
   * @summary Fetches the address nearest to a point.
   * @param {number} northing Note the order: the API wants northing first,
   * the reverse of OpenLayers' own.
   * @param {number} easting
   * @param {number} srid
   * @returns {Promise<object>} A GeoJSON FeatureCollection
   */
  fetchNearest = (northing, easting, srid) => {
    const params = new URLSearchParams({
      punktSrid: String(srid),
      koordinater: `${northing},${easting}`,
      includeData: "basinformation",
      srid: String(srid),
    });

    return this.#fetchJson("nearest", `/punkt?${params}`);
  };

  abortAll = () => {
    this.#controllers.forEach((controller) => controller.abort());
    this.#controllers.clear();
  };
}
