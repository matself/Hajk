/**
 * "Testa söklager": runs one real search against a söklager's WFS the same
 * way the client's SearchModel.js does, and translates everything that can
 * silently break a search into plain Swedish findings.
 *
 * Why this exists: every one of these failure modes reaches the end user as
 * the same "Sökningen gav inget resultat" (or as hits drawn in the wrong
 * place) - the WFS's own error text is thrown away client-side - so an admin
 * otherwise has no way to tell a CORS block from a typo'd typeName from a
 * server that returns N/E coordinates. Found the hard way against
 * geodata.naturvardsverket.se, which manages four of them at once.
 *
 * Mirrors SearchModel.js#lookup closely on purpose (POST, the
 * same GetFeature grammar per WFS version, srsName = the map's projection,
 * the prefix declaration from featureNS) and #getParsedResults' reading of
 * the response (GeoJSON without crs is taken as WGS84; GML axis order
 * follows the geometry element's own srsName only). If those change, this
 * needs to follow.
 */
import { hfetch } from "utils/FetchWrapper";
import { prepareProxyUrl } from "./ProxyHelper";
import {
  withTimeout,
  appendQuery,
  localName,
  throwIfExceptionReport,
} from "./describeFeatureType";

const REQUEST_TIMEOUT = 20000;
const MAX_FEATURES = 10;

const JSON_FORMATS = ["application/json", "application/vnd.geo+json"];

const VERSIONS = {
  "2.0.0": {
    wfsNs: "http://www.opengis.net/wfs/2.0",
    filterNs: "http://www.opengis.net/fes/2.0",
    property: "ValueReference",
    typeAttr: "typeNames",
    limitAttr: "count",
  },
  "1.1.0": {
    wfsNs: "http://www.opengis.net/wfs",
    filterNs: "http://www.opengis.net/ogc",
    property: "PropertyName",
    typeAttr: "typeName",
    limitAttr: "maxFeatures",
  },
  "1.0.0": {
    wfsNs: "http://www.opengis.net/wfs",
    filterNs: "http://www.opengis.net/ogc",
    property: "PropertyName",
    typeAttr: "typeName",
    limitAttr: "maxFeatures",
  },
};

// Codes the client's map library knows without any map config entry:
// proj4's and OpenLayers' own built-in geographic/web mercator definitions.
const BUILTIN_CRS = /(4326|4269|3857|900913|102100|102113|CRS:?84)$/i;

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFilter(fields, term, v) {
  if (!term || fields.length === 0) return "";
  const likes = fields.map(
    (field) =>
      `<PropertyIsLike wildCard="*" singleChar="." escapeChar="!" matchCase="false">` +
      `<${v.property}>${escapeXml(field)}</${v.property}>` +
      `<Literal>*${escapeXml(term)}*</Literal></PropertyIsLike>`
  );
  const body = likes.length > 1 ? `<Or>${likes.join("")}</Or>` : likes[0];
  return `<Filter xmlns="${v.filterNs}">${body}</Filter>`;
}

// A spatial filter as the client writes it for "Sök med radie/polygon/i
// vyn": ol/format/WFS's Intersects with the geometry in the GML flavour of
// the WFS version (GML2 for 1.0.0, GML 3.1 for 1.1.0, GML 3.2 for 2.0.0 -
// the latter as corrected by SearchModel.js#makeGml32FilterValid: gml:id on
// the geometry, no srsName on the ring).
function buildSpatialFilter(geometryField, ring, srsName, version, v) {
  const srs = srsName ? ` srsName="${escapeXml(srsName)}"` : "";
  const prop = `<${v.property}>${escapeXml(geometryField)}</${v.property}>`;
  let polygon;
  if (version === "1.0.0") {
    const coords = ring.map(([x, y]) => `${x},${y}`).join(" ");
    polygon =
      `<Polygon xmlns="http://www.opengis.net/gml"${srs}><outerBoundaryIs>` +
      `<LinearRing${srs}><coordinates decimal="." cs="," ts=" ">${coords}</coordinates>` +
      `</LinearRing></outerBoundaryIs></Polygon>`;
  } else {
    const posList = ring.map(([x, y]) => `${x} ${y}`).join(" ");
    const is20 = version === "2.0.0";
    const gmlNs = is20
      ? "http://www.opengis.net/gml/3.2"
      : "http://www.opengis.net/gml";
    const id = is20 ? ` xmlns:gml="${gmlNs}" gml:id="hajk-search-geom-0"` : "";
    polygon =
      `<Polygon xmlns="${gmlNs}"${id}${srs}><exterior>` +
      `<LinearRing${
        is20 ? "" : srs
      }><posList srsDimension="2">${posList}</posList>` +
      `</LinearRing></exterior></Polygon>`;
  }
  return `<Filter xmlns="${v.filterNs}"><Intersects>${prop}${polygon}</Intersects></Filter>`;
}

// A small closed square around a point, sized from the map extent (1/2000
// of its width, i.e. a few hundred metres for a national extent).
function squareAround([x, y], extent) {
  const d = extent ? (extent[2] - extent[0]) / 2000 : 100;
  return [
    [x - d, y - d],
    [x + d, y - d],
    [x + d, y + d],
    [x - d, y + d],
    [x - d, y - d],
  ];
}

function countFeatures(text, source) {
  if (JSON_FORMATS.includes(source.outputFormat)) {
    try {
      const json = JSON.parse(text);
      return Array.isArray(json.features) ? json.features.length : 0;
    } catch {
      // Not JSON - fall through, most likely an ExceptionReport.
    }
  }
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("Svaret från tjänsten gick inte att tolka.");
  }
  throwIfExceptionReport(doc);
  return gmlFeatures(doc).length;
}

function prefixOf(typeName) {
  return typeName.includes(":") ? typeName.split(":")[0] : null;
}

function buildGetFeatureXml(source, srsName, filter, v) {
  const typeName = source.layers[0];
  const prefix = prefixOf(typeName);
  const nsDecl =
    source.featureNS && prefix
      ? ` xmlns:${prefix}="${escapeXml(source.featureNS)}"`
      : "";
  const srs = srsName ? ` srsName="${escapeXml(srsName)}"` : "";
  return (
    `<GetFeature xmlns="${v.wfsNs}" service="WFS" version="${source.wfsVersion}"` +
    ` outputFormat="${escapeXml(source.outputFormat)}"` +
    ` ${v.limitAttr}="${MAX_FEATURES}"${nsDecl}>` +
    `<Query ${v.typeAttr}="${escapeXml(typeName)}"${srs}>${filter}</Query>` +
    `</GetFeature>`
  );
}

// Same request as KVP, for the GET fallback when POST is blocked by CORS -
// a GET needs no preflight, so it can still show whether the rest of the
// configuration is right.
function buildGetFeatureUrl(url, source, srsName, filter, v) {
  const typeName = source.layers[0];
  const prefix = prefixOf(typeName);
  const params = {
    service: "WFS",
    version: source.wfsVersion,
    request: "GetFeature",
    [v.typeAttr]: typeName,
    outputFormat: source.outputFormat,
    [v.limitAttr]: String(MAX_FEATURES),
  };
  if (srsName) params.srsName = srsName;
  if (filter) params.FILTER = filter;
  if (source.featureNS && prefix) {
    if (source.wfsVersion === "2.0.0") {
      params.NAMESPACES = `xmlns(${prefix},${source.featureNS})`;
    } else {
      params.NAMESPACE = `xmlns(${prefix}=${source.featureNS})`;
    }
  }
  return appendQuery(url, params);
}

/**
 * How the client's map library will read a geometry's srsName: exact code
 * first, then OpenLayers' urn normalization (urn:ogc:def:crs:EPSG::3006 ->
 * EPSG:3006), against the map's own projections plus the built-ins.
 * @returns {{known: boolean, axis: "enu"|"neu"|null}}
 */
function resolveSrs(srsName, projections) {
  const normalized = srsName.replace(
    /urn:(x-)?ogc:def:crs:EPSG:(.*:)?(\w+)$/,
    "EPSG:$3"
  );
  const p =
    projections.find((p) => p.code === srsName) ||
    projections.find((p) => p.code === normalized);
  if (p) {
    return {
      known: true,
      axis: /\+axis=neu/.test(p.definition || "") ? "neu" : "enu",
    };
  }
  if (BUILTIN_CRS.test(normalized)) return { known: true, axis: null };
  return { known: false, axis: null };
}

function inExtent([x, y], extent) {
  return x >= extent[0] && x <= extent[2] && y >= extent[1] && y <= extent[3];
}

function formatCoord([x, y]) {
  return `${Math.round(x * 100) / 100}, ${Math.round(y * 100) / 100}`;
}

function firstNumberPair(coords) {
  let c = coords;
  while (Array.isArray(c) && Array.isArray(c[0])) c = c[0];
  return Array.isArray(c) && c.length >= 2 ? [c[0], c[1]] : null;
}

// GML: collect feature elements under whichever envelope the server used
// (gml:featureMember, gml:featureMembers or WFS 2.0's wfs:member).
function gmlFeatures(doc) {
  const features = [];
  Array.from(doc.getElementsByTagName("*")).forEach((el) => {
    const name = localName(el);
    if (name === "featureMember" || name === "member") {
      if (el.firstElementChild) features.push(el.firstElementChild);
    } else if (name === "featureMembers") {
      features.push(...Array.from(el.children));
    }
  });
  return features;
}

function gmlProperties(feature) {
  const props = {};
  Array.from(feature.children).forEach((child) => {
    props[localName(child)] =
      child.children.length === 0 ? child.textContent : child;
  });
  return props;
}

function firstGmlCoordinate(geometryEl) {
  const coordEl = Array.from(geometryEl.getElementsByTagName("*")).find((el) =>
    ["posList", "pos", "coordinates"].includes(localName(el))
  );
  if (!coordEl) return null;
  const text = coordEl.textContent.trim();
  if (localName(coordEl) === "coordinates") {
    const [x, y] = text.split(/\s+/)[0].split(",").map(Number);
    return [x, y];
  }
  const [x, y] = text.split(/\s+/).map(Number);
  return [x, y];
}

function checkFields(source, featureProps, checks) {
  if (featureProps.length === 0) return;
  const present = new Set(featureProps.flatMap((p) => Object.keys(p)));
  const configured = [
    ...source.searchFields,
    ...source.displayFields,
    ...source.secondaryLabelFields,
    ...source.shortDisplayFields,
  ];
  const missing = [...new Set(configured)].filter((f) => !present.has(f));
  if (missing.length > 0) {
    checks.push({
      level: "warn",
      text: `Fälten ${missing.join(", ")} finns inte i något av de ${
        featureProps.length
      } returnerade objekten. Kontrollera stavningen - stora och små bokstäver spelar roll. Tillgängliga fält: ${[
        ...present,
      ].join(", ")}.`,
    });
  }
}

// Returns true when the coordinate can be trusted as a map coordinate (in
// the map's extent, or no extent to check against), for the spatial test.
function checkPosition(coord, context, checks) {
  const { extent, projection } = context;
  if (!coord || coord.some((n) => !Number.isFinite(n))) {
    checks.push({
      level: "warn",
      text: "Kunde inte läsa några koordinater ur första objektets geometri.",
    });
    return false;
  }
  if (!extent) {
    checks.push({
      level: "info",
      text: `Första koordinaten är ${formatCoord(
        coord
      )}. Kartans projektion ${projection} saknar utbredning i kartkonfigurationen, så läget kunde inte kontrolleras.`,
    });
    return true;
  }
  if (inExtent(coord, extent)) {
    checks.push({
      level: "ok",
      text: `Koordinaterna hamnar inom kartans utbredning (${projection}).`,
    });
    return true;
  } else if (inExtent([coord[1], coord[0]], extent)) {
    checks.push({
      level: "error",
      text: `Koordinaterna har omvänd axelordning: ${formatCoord(
        coord
      )} läses som öst, nord men hamnar inom kartans utbredning först om axlarna byts. Träffarna ritas på fel plats i kartan. Tjänsten skickar nord först utan att ange det på geometrin, och det går inte att ställa in i Hajk - använd en annan tjänst med samma data om det finns en.`,
    });
  } else {
    checks.push({
      level: "error",
      text: `Koordinaterna (${formatCoord(
        coord
      )}) hamnar utanför kartans utbredning i ${projection}. Tjänsten svarar troligen i ett annat koordinatsystem än kartans.`,
    });
  }
  return false;
}

function analyzeJson(text, source, context, checks) {
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (!doc.querySelector("parsererror")) throwIfExceptionReport(doc);
    throw new Error(
      `Responstypen är ${source.outputFormat} men svaret är inte JSON. Kontrollera vilka format tjänsten stöder.`
    );
  }
  const features = Array.isArray(json.features) ? json.features : [];
  const props = features.map((f) => f.properties || {});
  const coord =
    features[0] && firstNumberPair(features[0].geometry?.coordinates);
  // Only set when the coordinate is already in the map's projection -
  // GeoJSON without crs is reprojected client-side, so it isn't.
  let mapCoord = null;

  if (features[0] && !json.crs) {
    // SearchModel.js assumes WGS84 for GeoJSON without a crs member and
    // reprojects to the map's projection - fine only if it really is.
    if (coord && Math.abs(coord[0]) <= 180 && Math.abs(coord[1]) <= 90) {
      checks.push({
        level: "ok",
        text: "GeoJSON-svaret saknar crs och tolkas som WGS84 (grader) av kartan, vilket stämmer med koordinaterna.",
      });
    } else {
      checks.push({
        level: "error",
        text: `GeoJSON-svaret saknar crs, så kartan tolkar det som WGS84 (grader) - men koordinaterna (${
          coord ? formatCoord(coord) : "?"
        }) är inte grader. Träffarna ritas på fel plats. Välj en GML-responstyp i stället.`,
      });
    }
  } else if (features[0] && checkPosition(coord, context, checks)) {
    mapCoord = coord;
  }
  return { features: props, checks, mapCoord };
}

function analyzeGml(text, source, context, checks) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error(
      "Svaret från tjänsten är varken giltig XML eller ett känt felmeddelande."
    );
  }
  throwIfExceptionReport(doc);

  const features = gmlFeatures(doc);
  const props = features.map(gmlProperties);
  if (features.length === 0) return { features: props, checks };

  const first = features[0];
  let geometryProp = Array.from(first.children).find(
    (el) => localName(el) === source.geometryField
  );
  if (!geometryProp && !source.geometryField) {
    checks.push({
      level: "warn",
      text: "Geometrifält är inte ifyllt. Sökning med ritad yta eller radie kommer att misslyckas.",
    });
  } else if (!geometryProp) {
    checks.push({
      level: "warn",
      text: `Geometrifältet "${source.geometryField}" finns inte i svaret. Textsökning fungerar, men sökning med ritad yta eller radie kommer att misslyckas.`,
    });
  }
  if (!geometryProp) {
    geometryProp = Array.from(first.children).find(
      (el) => el.firstElementChild && firstGmlCoordinate(el)
    );
  }
  const geometryEl = geometryProp && geometryProp.firstElementChild;
  if (!geometryEl) {
    checks.push({
      level: "warn",
      text: "Hittade ingen geometri i första objektet.",
    });
    return { features: props, checks };
  }

  // The client picks its GML reader from outputFormat, and each reader only
  // understands its own GML namespace - a 3.2 geometry read by the GML3
  // reader (or vice versa) silently comes out as no geometry at all.
  const is32 = /\/gml\/3\.2$/.test(geometryEl.namespaceURI || "");
  if (is32 && source.outputFormat !== "GML32") {
    checks.push({
      level: "error",
      text: `Tjänsten svarar med GML 3.2, men responstypen är ${source.outputFormat}. Kartan kan då inte läsa geometrierna. Välj responstypen GML32.`,
    });
  } else if (!is32 && source.outputFormat === "GML32") {
    checks.push({
      level: "error",
      text: "Responstypen är GML32, men tjänsten svarar med en äldre GML-version. Kartan kan då inte läsa geometrierna. Välj GML3 (eller GML2).",
    });
  }

  // Same rule as ol/format/GML3: axis order comes only from the srsName on
  // the geometry element itself - an srsName on boundedBy/Envelope, or on
  // the FeatureCollection, is never consulted.
  let coord = firstGmlCoordinate(geometryEl);
  const srsName = geometryEl.getAttribute("srsName");
  if (srsName) {
    const resolved = resolveSrs(srsName, context.projections);
    if (!resolved.known) {
      checks.push({
        level: "error",
        text: `Geometrierna anges i "${srsName}", som kartan inte har någon projektion för. Sökningen kommer att misslyckas i kartan. Lägg till "${srsName}" bland kartans projektioner, med samma definition som ${context.projection}.`,
      });
      return { features: props, checks };
    }
    if (resolved.axis === "neu" && coord) coord = [coord[1], coord[0]];
  }
  const mapCoord = checkPosition(coord, context, checks) ? coord : null;
  return { features: props, checks, mapCoord };
}

async function send(url, options) {
  const res = await withTimeout(hfetch(url, options), REQUEST_TIMEOUT);
  return res.text();
}

async function sendWithStatus(url, options) {
  const res = await withTimeout(hfetch(url, options), REQUEST_TIMEOUT);
  return { status: res.status, text: await res.text() };
}

// "Sök med radie/polygon/i vyn": a small square around a spot the text
// search just proved has data, through the same route the text search took.
// Catches a wrong Geometrifält and servers that reject the client's spatial
// filter (e.g. strict GML 3.2 validation under WFS 2.0.0).
async function checkSpatialSearch(
  coord,
  { source, context, transport, baseUrl, postOptions, v, checks }
) {
  const { projection, projections, extent } = context;
  let ring = squareAround(coord, extent);
  // The client writes coordinates in its projection's axis order.
  if (projection && resolveSrs(projection, projections).axis === "neu") {
    ring = ring.map(([x, y]) => [y, x]);
  }
  const version = VERSIONS[source.wfsVersion] ? source.wfsVersion : "1.1.0";
  const filter = buildSpatialFilter(
    source.geometryField,
    ring,
    projection,
    version,
    v
  );
  try {
    const text =
      transport.method === "get"
        ? await send(buildGetFeatureUrl(baseUrl, source, projection, filter, v))
        : await send(transport.url, {
            ...postOptions,
            body: buildGetFeatureXml(source, projection, filter, v),
          });
    const count = countFeatures(text, source);
    checks.push(
      count > 0
        ? {
            level: "ok",
            text: `Sökning med ritad yta, radie och i kartans vy fungerar (${count} objekt runt första träffen).`,
          }
        : {
            level: "warn",
            text: `Sökning med en yta runt första träffen gav inga objekt, fast det finns ett där. Kontrollera Geometrifält ("${source.geometryField}").`,
          }
    );
  } catch (error) {
    checks.push({
      level: "error",
      text: `Sökning med ritad yta, radie och i kartans vy misslyckas. ${
        error.message === "Timeout"
          ? "Tjänsten svarade inte i tid."
          : error.message
      }`,
    });
  }
}

/**
 * @param {object} source - the canonical söklager (see searchSource.js)
 * @param {object} options
 * @param {string} [options.term] - optional search word, run against searchFields
 * @param {string} [options.proxy] - admin's url_proxy
 * @param {object|null} options.map - { mapName, projection, projections,
 *   usesSource, searchProxy } - searchProxy is the backend's search proxy
 *   url, used when the service blocks direct browser requests
 * @returns {Promise<{checks: Array<{level: string, text: string}>, features: Array<object>}>}
 */
export async function testSearchSource(source, { term, proxy, map }) {
  const checks = [];
  const v = VERSIONS[source.wfsVersion] || VERSIONS["1.1.0"];
  const typeName = source.layers[0];
  const projections = map?.projections || [];
  const projection = map?.projection || null;
  const context = {
    projection,
    projections,
    extent: projections.find((p) => p.code === projection)?.extent || null,
  };

  if (!source.url || !typeName) {
    return {
      checks: [{ level: "error", text: "Ange url och välj ett lager först." }],
      features: [],
    };
  }

  if (map?.mapName) {
    checks.push({
      level: "info",
      text: map.usesSource
        ? `Testar som i kartan "${map.mapName}" (${projection}).`
        : `Söklagret används inte i någon karta ännu - testar mot kartan "${map.mapName}" (${projection}).`,
    });
  }

  // Predictable request-grammar problem: WFS 1.x typeName patterns don't
  // allow a dot. Still sent below, so the server's own message shows too.
  if (source.wfsVersion !== "2.0.0" && /\.[^:]*$/.test(typeName)) {
    checks.push({
      level: "warn",
      text: `Lagernamnet "${typeName}" innehåller punkt, vilket WFS ${source.wfsVersion} inte tillåter. Välj WFS-version 2.0.0.`,
    });
  }

  const trimmedTerm = (term || "").trim();
  if (trimmedTerm && source.searchFields.length === 0) {
    checks.push({
      level: "info",
      text: "Inga sökfält är valda, så sökordet används inte - testet hämtar objekt utan filter.",
    });
  }

  const filter = buildFilter(source.searchFields, trimmedTerm, v);
  const postOptions = {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: buildGetFeatureXml(source, projection, filter, v),
  };
  const baseUrl = prepareProxyUrl(source.url, proxy);
  // How the first request got through - the spatial test below goes the
  // same way.
  let transport = { url: baseUrl, method: "post" };
  let text = null;
  try {
    text = await send(baseUrl, postOptions);
    checks.push({
      level: "ok",
      text: "Tjänsten svarar på anrop direkt från webbläsaren (CORS fungerar).",
    });
  } catch (postError) {
    if (postError.message === "Timeout") {
      checks.push({
        level: "error",
        text: `Tjänsten svarade inte inom ${REQUEST_TIMEOUT / 1000} sekunder.`,
      });
      return { checks, features: [] };
    }
    const searchProxy = map?.searchProxy;
    checks.push({
      level: "warn",
      text: `Tjänsten tillåter inte sökanrop direkt från webbläsaren (CORS). Sökningen i kartan fungerar bara om klientens appConfig.json har searchProxy satt till backendens sökproxy${
        searchProxy
          ? `, "${searchProxy}"`
          : ", t.ex. https://<server>/api/v2/searchproxy/"
      }.`,
    });
    // Next best: the exact request the client makes once searchProxy is
    // set - same POST, through the backend's proxy. The proxy only
    // forwards to urls already saved as a söklager (its SSRF whitelist, see
    // search.proxy.js), and answers anything else with this message.
    if (searchProxy) {
      try {
        const proxied = await sendWithStatus(
          searchProxy + source.url,
          postOptions
        );
        if (/Must provide a proper URL as target/.test(proxied.text)) {
          checks.push({
            level: "info",
            text: "Sökproxyn tar bara emot url:er från sparade söklager. Spara och testa igen för att prova exakt det anrop kartan gör.",
          });
        } else if (proxied.status === 502) {
          // The proxy's own "upstream request failed" - the WFS answered
          // nothing at all (DNS, TLS, timeout); details are in the log.
          checks.push({
            level: "error",
            text: "Sökproxyn fick inget svar från tjänsten (HTTP 502), så sökningen i kartan misslyckas också. Orsaken står i backendens logg (proxy.search.v2).",
          });
        } else {
          text = proxied.text;
          transport = { url: searchProxy + source.url, method: "post" };
          checks.push({
            level: "ok",
            text: "Anropet via backendens sökproxy går fram.",
          });
        }
      } catch {
        // Fall through to the GET below.
      }
    }
    // Last resort: a GET needs no CORS preflight, so it usually gets
    // through where the POST didn't - but a server may accept a GET the
    // client's POST would be rejected for (e.g. WFS 1.1.0's schema check
    // on a dotted typeName only applies to the XML body), so say so.
    if (text === null) {
      try {
        text = await send(
          buildGetFeatureUrl(baseUrl, source, projection, filter, v)
        );
        transport = { url: baseUrl, method: "get" };
        checks.push({
          level: "info",
          text: "Resten av testet gjordes med ett GET-anrop i stället för kartans POST. Fel som bara gäller POST-anropet syns därför inte här.",
        });
      } catch {
        checks.push({
          level: "error",
          text: "Kunde inte nå tjänsten. Kontrollera url:en - eller så blockerar tjänsten alla anrop från webbläsaren (CORS), och då går den bara att använda via sökproxyn.",
        });
        return { checks, features: [] };
      }
    }
  }
  const summaryAt = checks.length;

  let result;
  try {
    result = JSON_FORMATS.includes(source.outputFormat)
      ? analyzeJson(text, source, context, checks)
      : analyzeGml(text, source, context, checks);
  } catch (error) {
    checks.push({ level: "error", text: error.message });
    return { checks, features: [] };
  }

  const count = result.features.length;
  if (count === 0) {
    checks.push({
      level: "warn",
      text:
        trimmedTerm && source.searchFields.length > 0
          ? `Inga träffar på "${trimmedTerm}". Anropet i sig fungerade - prova ett annat sökord.`
          : "Tjänsten returnerade inga objekt.",
    });
  } else {
    // Right after the connection check, before what the analysis found.
    checks.splice(summaryAt, 0, {
      level: "ok",
      text: `Tjänsten returnerade ${count} objekt${
        count === MAX_FEATURES ? " (max i testet)" : ""
      }.`,
    });
    checkFields(source, result.features, checks);
  }

  if (result.mapCoord && source.geometryField) {
    await checkSpatialSearch(result.mapCoord, {
      source,
      context,
      transport,
      baseUrl,
      postOptions,
      v,
      checks,
    });
  }
  return { checks, features: result.features };
}
