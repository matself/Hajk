/**
 * @summary Reads an error response into something a user can act on.
 * @description Two services answer on this route and both explain themselves
 * in the body: Lantmateriet's Geodatakatalog ({code, description}) and, in
 * front of it, the API gateway ({code, message, description}). Quoting them
 * beats paraphrasing - a gateway rejection means the credentials are genuine
 * but not entitled to the endpoint, which sends you somewhere quite different
 * from wrong credentials would.
 */
const readErrorDetail = (body) => {
  if (!body) return null;
  try {
    const parsed = JSON.parse(body);
    return parsed.description ?? parsed.message ?? null;
  } catch {
    // A proxy or web server further out may have answered in HTML, which is
    // not worth putting in front of a user.
    return body.trimStart().startsWith("<") ? null : body.slice(0, 200);
  }
};

/**
 * @summary Talks to Lantmateriet's Geodatakatalog for detaljplan (NGP) through
 * Hajk's backend proxy.
 *
 * @description The service is OGC API Features, not WFS, despite being widely
 * described as the latter: its /conformance lists only the Features core,
 * oas30 and geojson classes plus Part 2 (crs). Two consequences shape this
 * class. There is no `intersects` operator, so a click has to be expressed as
 * a small bbox and narrowed afterwards; and `bbox` is read in the collection's
 * storage CRS unless `bbox-crs` says otherwise, returning an empty
 * FeatureCollection rather than an error when it is wrong - so both CRS
 * parameters are always sent explicitly.
 */
export default class PlanCheckerApi {
  #baseUrl;
  #controller = null;

  constructor(baseUrl) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
  }

  static crsUri(epsgCode) {
    return `http://www.opengis.net/def/crs/EPSG/0/${epsgCode}`;
  }

  abort() {
    this.#controller?.abort();
    this.#controller = null;
  }

  /**
   * Fetch the plan regulations whose bounding box overlaps `bbox`.
   *
   * @param {object} params
   * @param {string} params.kommunkod Four-digit code; one collection per municipality.
   * @param {number[]} params.bbox [minX, minY, maxX, maxY] in `epsgCode`.
   * @param {string} params.epsgCode Numeric EPSG code, without the "EPSG:" prefix.
   * @param {number} params.limit
   * @returns {Promise<object>} The GeoJSON FeatureCollection.
   */
  async getItemsByBbox({ kommunkod, bbox, epsgCode, limit }) {
    // One click at a time: a new one makes the previous answer irrelevant.
    this.abort();
    this.#controller = new AbortController();

    const crs = PlanCheckerApi.crsUri(epsgCode);
    const params = new URLSearchParams({
      bbox: bbox.join(","),
      "bbox-crs": crs,
      // Ask for the geometries back in the map's own projection, so nothing
      // needs reprojecting before the hit test.
      crs: crs,
      limit: String(limit),
    });

    const url = `${this.#baseUrl}/collections/${encodeURIComponent(
      kommunkod
    )}/items?${params.toString()}`;

    const response = await fetch(url, {
      signal: this.#controller.signal,
      headers: { Accept: "application/geo+json" },
    });

    if (!response.ok) {
      const detail = readErrorDetail(await response.text().catch(() => ""));
      throw new Error(
        detail
          ? `Detaljplanetjänsten svarade ${response.status}: ${detail}`
          : `Detaljplanetjänsten svarade med felkod ${response.status}.`
      );
    }

    return response.json();
  }
}
