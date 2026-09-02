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
 * @description Everything goes through one endpoint: `POST /search`, the
 * catalog's item-search. It takes a GeoJSON `intersects` geometry and a `query`
 * filter object, and it is what gives an exact point-in-polygon test.
 *
 * Worth knowing, because it is not discoverable: the service's own
 * `/conformance` advertises only the OGC API Features classes and says nothing
 * about item-search, so from the documentation alone you would conclude that
 * `bbox` is the only spatial filter available and that hits have to be narrowed
 * client-side. `POST /search` with `intersects` nevertheless works, and is what
 * Lantmateriet's own viewer uses.
 *
 * Geometries travel in the collections' storage CRS, SWEREF 99 TM, in both
 * directions - the caller transforms.
 */
export default class PlanCheckerApi {
  #baseUrl;
  #controller = null;

  constructor(baseUrl) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
  }

  /** Abort whatever is in flight; a new click makes the old answer irrelevant. */
  abort() {
    this.#controller?.abort();
    this.#controller = null;
  }

  async #search(body, signal) {
    const response = await fetch(`${this.#baseUrl}/search`, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/geo+json",
      },
      body: JSON.stringify(body),
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

  /** Start a new round of searches, cancelling any previous one. */
  beginRequest() {
    this.abort();
    this.#controller = new AbortController();
    return this.#controller.signal;
  }

  /**
   * The plans covering a point. These are the "huvudobjekt" - `feature.typ` is
   * "detaljplan" - carrying the plan's name, dates and document assets, but no
   * regulation of their own.
   */
  findPlansAtPoint({ coordinate, statuses, signal }) {
    const query = { "feature.typ": { eq: "detaljplan" } };
    if (statuses?.length) {
      query["detaljplan.status"] = { in: statuses };
    }
    return this.#search(
      {
        intersects: { type: "Point", coordinates: coordinate },
        query,
      },
      signal
    );
  }

  /**
   * The regulations belonging to one plan. Pass a coordinate to get only those
   * that actually cover it; omit it for every regulation in the plan, which is
   * what the "show all" view needs and what makes an "N of M" count possible.
   */
  findRegulations({ planId, coordinate, limit, signal }) {
    return this.#search(
      {
        query: { "detaljplan.objektidentitet": { eq: planId } },
        limit,
        ...(coordinate
          ? { intersects: { type: "Point", coordinates: coordinate } }
          : {}),
      },
      signal
    );
  }
}
