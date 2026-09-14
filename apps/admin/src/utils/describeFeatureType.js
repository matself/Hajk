/**
 * WFS metadata fetching for the söklager form: listing feature types
 * (GetCapabilities) and describing one feature type's attributes
 * (DescribeFeatureType). Plain async functions, no component state - the
 * caching and cancellation belongs to whoever calls these, same as the
 * legacy form's fetchAttributes() did, just lifted out of it.
 *
 * The legacy model (models/search.js) does the same two requests via
 * $.ajax + jQuery XML traversal. This uses hfetch + native DOMParser /
 * X2JS instead, so it goes through the same proxy/credential handling as
 * every other admin fetch (see utils/FetchWrapper.js).
 */
import X2JS from "x2js";
import { hfetch } from "utils/FetchWrapper";
import { prepareProxyUrl } from "./ProxyHelper";

// A WFS DescribeFeatureType response types geometry columns as gml:*, e.g.
// "gml:GeometryPropertyType" or "gml:MultiPolygonPropertyType".
const GEOMETRY_TYPE_REGEX = /^gml:|PropertyType$/i;

export function isGeometryType(type) {
  return GEOMETRY_TYPE_REGEX.test(type || "");
}

const REQUEST_TIMEOUT = 20000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

function appendQuery(url, params) {
  const qs = new URLSearchParams(params).toString();
  if (!qs) return url;
  const trimmed = url.trim();
  const sep = trimmed.endsWith("?") || trimmed.endsWith("&") ? "" : "&";
  return trimmed.includes("?") ? trimmed + sep + qs : trimmed + "?" + qs;
}

function localName(el) {
  return el.localName || el.tagName;
}

function firstChildText(parent, names) {
  const kids = Array.from(parent.children || []);
  const match = kids.find((el) => names.includes(localName(el)));
  return match ? match.textContent : "";
}

// A WFS error is still well-formed XML - a parsererror check alone misses
// it entirely, and the caller sees "0 feature types" with no explanation.
// Covers both the OWS-style root (WFS 1.1/2.0, ExceptionReport/Exception/
// ExceptionText) and the older WMS-style one some WFS 1.0 servers still
// answer with (ServiceExceptionReport/ServiceException).
function throwIfExceptionReport(doc) {
  const root = doc.documentElement;
  if (!root || !/ExceptionReport$/.test(localName(root))) return;
  const exceptionEl = Array.from(doc.getElementsByTagName("*")).find((el) =>
    /^(Exception|ServiceException)$/.test(localName(el))
  );
  const text =
    exceptionEl &&
    (firstChildText(exceptionEl, ["ExceptionText"]) ||
      exceptionEl.textContent.trim());
  throw new Error(
    text
      ? `Tjänsten svarade med ett fel: ${text}`
      : "Tjänsten svarade med ett fel (ExceptionReport)."
  );
}

/**
 * Lists the feature types a WFS service offers, via GetCapabilities.
 * @returns {Promise<Array<{name: string, title: string}>>}
 */
export function listFeatureTypes(url, { proxy } = {}) {
  const requestUrl = appendQuery(prepareProxyUrl(url, proxy), {
    service: "WFS",
    request: "GetCapabilities",
  });

  return withTimeout(
    hfetch(requestUrl).then((res) => res.text()),
    REQUEST_TIMEOUT
  ).then((xmlText) => {
    const doc = new DOMParser().parseFromString(xmlText, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error("Kunde inte tolka WFS-tjänstens svar.");
    }
    throwIfExceptionReport(doc);
    const featureTypeEls = Array.from(doc.getElementsByTagName("*")).filter(
      (el) => localName(el) === "FeatureType"
    );
    return featureTypeEls
      .map((el) => ({
        name: firstChildText(el, ["Name"]),
        title: firstChildText(el, ["Title"]),
      }))
      .filter((ft) => ft.name);
  });
}

/**
 * Describes one feature type's attributes via DescribeFeatureType.
 * @returns {Promise<Array<{name: string, type: string}>>}
 */
export function describeFeatureType(url, typeName, { proxy } = {}) {
  const requestUrl = appendQuery(prepareProxyUrl(url, proxy), {
    service: "WFS",
    request: "DescribeFeatureType",
    typename: typeName,
  });

  return withTimeout(
    hfetch(requestUrl).then((res) => res.text()),
    REQUEST_TIMEOUT
  ).then((xmlText) => {
    throwIfExceptionReport(
      new DOMParser().parseFromString(xmlText, "application/xml")
    );
    const parsed = new X2JS().xml2js(xmlText);
    const elements =
      parsed?.schema?.complexType?.complexContent?.extension?.sequence?.element;
    if (!elements) {
      throw new Error("Oväntat svar från tjänstens DescribeFeatureType.");
    }
    const list = Array.isArray(elements) ? elements : [elements];
    return list.map((el) => ({
      name: el._name,
      // Strip the type's OWN namespace prefix (e.g. "gml:" in
      // "gml:MultiPolygonPropertyType") - not el.__prefix, which is the
      // wrapping <element> tag's prefix (usually "xsd:") and rarely matches
      // the type value's own prefix, so it left geometry columns displaying
      // as "geom (gml:MultiPolygonPropertyType)" instead of the intended
      // "geom (MultiPolygonPropertyType)".
      type: el._type ? el._type.replace(/^[^:]+:/, "") : "",
    }));
  });
}
