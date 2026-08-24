import X2JS from "x2js";

/**
 * Shared parsing of OGC GetCapabilities documents for the layer forms.
 *
 * The capabilities document is the input to every layer that Admin can create,
 * yet it used to be parsed in two places with two different configurations and
 * validated by a single check for a root element named "html". Everything else
 * was left to the consumers, which is why a service answering with an exception
 * report produced an empty layer list and no error, and why a layer nested one
 * level deeper than the parser had been told about lost its styles.
 *
 * This module does three things, once, for both WMS and WMTS:
 *
 *   1. parse   - one X2JS setup per document type, in one place
 *   2. validate - the root element must be the document type we asked for, and
 *                 a service exception is reported with the server's own words
 *   3. normalize - repeatable elements become arrays at any depth, and
 *                 namespace-prefixed text nodes become plain strings
 *
 * Consumers still read the same property names as before; they simply no longer
 * have to guess whether a value is an object, an array or a text node wrapper.
 */

// Elements a capabilities document is allowed to repeat. XML carries no
// cardinality information, so a service publishing exactly one of these emits a
// single element and the parser returns an object where the consumer expects an
// array. X2JS can be told about this, but only through exact paths - which is
// how layers at depth three ended up unnormalized while their siblings at depth
// two were fine. Match on element name at any depth instead.
const REPEATABLE_ELEMENTS = {
  wms: ["Layer", "Style", "CRS", "SRS"],
  wmts: [
    "Layer",
    "TileMatrixSet",
    "TileMatrix",
    "TileMatrixSetLink",
    "ResourceURL",
    "Style",
    "Format",
  ],
};

// The root element each service type must answer with. WMS 1.3.0 renamed its
// root from WMT_MS_Capabilities to WMS_Capabilities, so both are valid.
const EXPECTED_ROOTS = {
  wms: ["WMS_Capabilities", "WMT_MS_Capabilities"],
  wmts: ["Capabilities"],
};

// The two document types have always been parsed with different attribute
// prefixes, and the forms read attributes accordingly (`layer.queryable` for
// WMS, `resource._format` for WMTS). Converging them would mean touching every
// consumer for no gain, so the difference is kept here, in one place, instead of
// being spread across two model methods.
const ATTRIBUTE_PREFIX = {
  wms: "",
  wmts: "_",
};

function parserFor(type) {
  return new X2JS({ attributePrefix: ATTRIBUTE_PREFIX[type] });
}

// X2JS wraps an element's character data in __text, a CDATA section in
// __cdata, a namespace prefix in __prefix, and adds its own toString to the
// wrapper. None of those are content.
var WRAPPER_KEYS = ["__text", "__cdata", "__prefix", "toString"];

/**
 * True for the wrapper X2JS produces around a text element it could not reduce
 * to a plain string, e.g. <ows:Identifier>topowebb</ows:Identifier> becomes
 * { __prefix: "ows", __text: "topowebb", toString: fn } and an Abstract written
 * as a CDATA section becomes { __cdata: "..." }. Only unwrap when the object
 * holds nothing else - an element carrying both text and attributes has to keep
 * its attributes, so it is left alone.
 */
function isTextNodeWrapper(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  var keys = Object.keys(value);
  return (
    keys.length > 0 &&
    keys.every((k) => WRAPPER_KEYS.indexOf(k) !== -1) &&
    (value.__text !== undefined || value.__cdata !== undefined)
  );
}

function textNodeValue(value) {
  return String(value.__text !== undefined ? value.__text : value.__cdata);
}

function normalize(node, repeatable) {
  if (Array.isArray(node)) {
    return node.map((item) => normalize(item, repeatable));
  }

  if (isTextNodeWrapper(node)) {
    return textNodeValue(node);
  }

  if (node === null || typeof node !== "object") {
    return node;
  }

  Object.keys(node).forEach((key) => {
    var value = normalize(node[key], repeatable);

    if (repeatable.indexOf(key) !== -1 && !Array.isArray(value)) {
      value = value === undefined || value === null ? [] : [value];
    }

    node[key] = value;
  });

  return node;
}

/**
 * Digs the human-readable text out of an exception report. WMS answers with
 * ServiceExceptionReport/ServiceException, OWS (and therefore WMTS) with
 * ExceptionReport/Exception/ExceptionText, and either may repeat the element.
 */
function exceptionTextFrom(root) {
  var candidates = [];

  [].concat(root.ServiceException || [], root.Exception || []).forEach((e) => {
    if (typeof e === "string") {
      candidates.push(e);
      return;
    }
    if (e && typeof e === "object") {
      [].concat(e.ExceptionText || []).forEach((t) => {
        candidates.push(isTextNodeWrapper(t) ? textNodeValue(t) : t);
      });
      if (e.__text !== undefined || e.__cdata !== undefined) {
        candidates.push(textNodeValue(e));
      }
    }
  });

  return candidates
    .map((c) => String(c).trim())
    .filter(Boolean)
    .join(" ");
}

/**
 * Parses, validates and normalizes a GetCapabilities response.
 *
 * @param {string} xmlString Raw response body.
 * @param {string} type "wms" or "wmts".
 * @returns {object} The contents of the root element.
 * @throws {Error} With a message suitable for showing to the user when the
 *   document is not the capabilities document we asked for.
 */
export function parseCapabilities(xmlString, type) {
  var repeatable = REPEATABLE_ELEMENTS[type];
  var expectedRoots = EXPECTED_ROOTS[type];
  var label = type.toUpperCase();

  if (typeof xmlString !== "string" || xmlString.trim() === "") {
    throw new Error("Tjänsten svarade utan innehåll.");
  }

  var json;
  try {
    json = parserFor(type).xml2js(xmlString);
  } catch (e) {
    throw new Error("Svaret från tjänsten kunde inte tolkas som XML.");
  }

  var rootKey = json ? Object.keys(json)[0] : undefined;
  if (!rootKey) {
    throw new Error("Svaret från tjänsten kunde inte tolkas som XML.");
  }

  var root = json[rootKey];

  // A dev server or a proxy in front of the service may answer with an HTML
  // error page, sometimes even with HTTP 200.
  if (rootKey === "html") {
    throw new Error(
      "Servern svarade med en HTML-sida istället för ett " +
        label +
        "-capabilities-dokument. Kontrollera URL:en och eventuella proxyfel."
    );
  }

  // An exception report is a valid answer to an invalid request - the service is
  // reachable and is telling us what is wrong. Pass that on rather than letting
  // it be mistaken for a capabilities document with no layers in it.
  if (rootKey === "ServiceExceptionReport" || rootKey === "ExceptionReport") {
    var text = exceptionTextFrom(root);
    throw new Error(
      "Tjänsten svarade med ett felmeddelande" + (text ? ": " + text : ".")
    );
  }

  if (expectedRoots.indexOf(rootKey) === -1) {
    throw new Error(
      "Svaret är inget " +
        label +
        "-capabilities-dokument (rotelementet är <" +
        rootKey +
        ">)."
    );
  }

  normalize(root, repeatable);

  // WMS_Capabilities.Capability holds exactly one root <Layer>, and every
  // consumer reads it as an object. Normalizing by element name turned it into
  // a one-element array along with all the layers below it, so put it back.
  if (type === "wms" && Array.isArray(root.Capability?.Layer)) {
    root.Capability.Layer = root.Capability.Layer[0];
  }

  // Without these sections the document parses but carries no layers, and every
  // consumer downstream reads undefined.
  if (type === "wms" && !root.Capability) {
    throw new Error(
      "Capabilities-dokumentet saknar avsnittet Capability och innehåller därför inga lager."
    );
  }
  if (type === "wmts" && !root.Contents) {
    throw new Error(
      "Capabilities-dokumentet saknar avsnittet Contents och innehåller därför inga lager."
    );
  }

  return root;
}

/**
 * Turns a failed jQuery request into an Error the user can act on. The forms
 * used to report every failure as "servern svarar inte eller blockeras av
 * CORS", which is misleading for the two cases that actually say something:
 * the service demands credentials, or it answered with an error status.
 */
export function requestError(jqXHR) {
  var status = jqXHR && jqXHR.status;

  if (status === 401 || status === 403) {
    return new Error(
      "Tjänsten kräver inloggning (HTTP " +
        status +
        "). Fyll i användarnamn och lösenord innan du hämtar."
    );
  }

  if (status > 0) {
    return new Error("Tjänsten svarade med HTTP " + status + ".");
  }

  return new Error("Servern svarar inte eller blockeras av CORS.");
}
