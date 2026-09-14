/**
 * The canonical in-memory shape for one WFS söklager, plus adapters to and
 * from the on-disk wfslayer shape.
 *
 * settings/wfslayer writes are a wholesale replacement (see
 * apps/backend/server/apis/v2/services/settings.service.js#createOrUpdateLayer)
 * - the backend never merges, it just overwrites the object with the
 * matching id. toWfsLayer() is written around that constraint: on edit it
 * spreads the edited fields *over* the original raw object, so any key the
 * form doesn't know about (or a future upstream field) survives the
 * round trip untouched. Never build the outgoing payload as a fresh object
 * on edit - that is exactly how the old form silently drops `date` on every
 * save.
 */

// Same validity pattern the legacy form uses for every comma-separated field
// list: most glyphs from most languages allowed, a few characters that have
// caused problems (`, ^, %, see #1187) rejected.
//
// No `g` flag: the legacy form gets away with one because it creates a fresh
// regex literal on every validateField() call. This one is a shared
// module-level constant, and a global regex's .test() is stateful (it
// advances lastIndex on every call and starts failing once lastIndex runs
// past the string) - reusing it across multiple isValidFieldName() calls
// would intermittently reject perfectly valid names depending on call order.
export const FIELD_NAME_PATTERN =
  /^[\p{L}\u0590-\u05fe_-]+[\p{L}\p{N}\u0590-\u05fe_\-.]+(\s+[\p{L}\p{N}\u0590-\u05fe_-]+)*$/u;

export function isValidFieldName(name) {
  return FIELD_NAME_PATTERN.test(name);
}

const FIELD_LIST_KEYS = [
  "searchFields",
  "displayFields",
  "secondaryLabelFields",
  "shortDisplayFields",
];

function toArray(value) {
  if (Array.isArray(value)) return value.filter((v) => v !== "");
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}

/**
 * Builds the canonical model from a wfslayer as stored on disk (or from `{}`
 * for a brand new source - every field then falls back to its default).
 */
export function fromWfsLayer(raw) {
  const canonical = {
    kind: "wfslayer",
    id: raw.id ?? null,
    // Optional link to the WMS layer this söklager's data is also displayed
    // as. Not part of the legacy wfslayer shape - see toWfsLayer() for how
    // it round-trips as a plain extra key. Once set, it flows unchanged
    // through the backend's config service (layer objects are passed by
    // reference, never reconstructed - see #removeUnusedLayersFromStore in
    // config.service.js) straight into the client's
    // featureCollection.source.pid, which is all showCorrespondingWMSLayers
    // needs. No apps/client change required.
    pid: raw.pid || null,
    caption: raw.caption || "",
    internalLayerName: raw.internalLayerName || "",
    url: raw.url || "",
    layers: Array.isArray(raw.layers) ? raw.layers : [],
    geometryField: raw.geometryField || "",
    outputFormat: raw.outputFormat || "GML3",
    serverType: raw.serverType || "geoserver",
    // WFS request version. Defaults to "1.1.0" - the same default
    // ol/format/WFS and every existing source has always used - so this
    // field being absent on every wfslayer saved before it existed changes
    // nothing. Only needed when a server rejects 1.1.0's stricter typeName
    // grammar (no dots allowed) for a typeName that has them, e.g.
    // "ps-nvr:PS.ProtectedSites.NR" - confirmed live: this exact server
    // accepts that typeName under 2.0.0 and rejects it under 1.1.0 with a
    // cvc-pattern-valid error.
    wfsVersion: raw.wfsVersion || "1.1.0",
    // XML namespace URI for the prefix used in `layers` (e.g. "ps-nvr" in
    // "ps-nvr:PS.ProtectedSites.NR"). Only needed for a strict server that
    // rejects a request using an undeclared prefix - most GeoServer/QGIS
    // instances resolve a well-known workspace prefix without this. Empty
    // by default; see SearchModel.js#lookup for where it's used.
    featureNS: raw.featureNS || "",
    infobox: raw.infobox || "",
    // Not part of the disk wfslayer shape - present so the form can render
    // one input regardless of source kind. See toWfsLayer(): omitted from
    // the payload unless the admin actually sets it.
    infoclickIcon: raw.infoclickIcon || "",
    aliasDict: raw.aliasDict || "",
  };
  FIELD_LIST_KEYS.forEach((key) => {
    canonical[key] = toArray(raw[key]);
  });
  return canonical;
}

export function emptySearchSource() {
  return fromWfsLayer({});
}

/**
 * Builds the payload for settings/wfslayer. `raw` is the object as originally
 * loaded (undefined for a new source) - every key on it that the form
 * doesn't model is preserved as-is.
 */
export function toWfsLayer(canonical, raw) {
  const base = raw
    ? { ...raw }
    : {
        // The old form claims dates are "filled in automatically" but never
        // actually sends one (see the plan's "hazard, already demonstrated"
        // section) - new sources created here get a real one.
        date: Date.now().toString(),
      };

  return {
    ...base,
    id: raw ? raw.id : null,
    // omit the key entirely when unset, rather than writing "pid": null,
    // so an unlinked söklager still looks like every other wfslayer on disk
    pid: canonical.pid || undefined,
    caption: canonical.caption,
    internalLayerName: canonical.internalLayerName,
    url: canonical.url,
    layers: canonical.layers,
    searchFields: canonical.searchFields,
    displayFields: canonical.displayFields,
    secondaryLabelFields: canonical.secondaryLabelFields,
    shortDisplayFields: canonical.shortDisplayFields,
    geometryField: canonical.geometryField,
    outputFormat: canonical.outputFormat,
    serverType: canonical.serverType,
    // Omit when it's the default, same reasoning as pid above - a source
    // that never needed this still looks exactly like it did before this
    // field existed.
    wfsVersion:
      canonical.wfsVersion !== "1.1.0" ? canonical.wfsVersion : undefined,
    featureNS: canonical.featureNS || undefined,
    infobox: canonical.infobox,
    infoclickIcon: canonical.infoclickIcon || undefined,
    aliasDict: canonical.aliasDict,
  };
}

/**
 * Round-trip assertion: load a source into the canonical model and write it
 * straight back out with no edits. The result must be identical to what was
 * loaded, key for key - otherwise toWfsLayer() is dropping or renaming
 * something and a real save would corrupt the stored layer. Intended to run
 * in development whenever a source is loaded into the edit form, before the
 * admin has touched anything.
 *
 * The four field-list keys are compared after normalizing through toArray()
 * on both sides, not as raw JSON: every existing wfslayer stores an
 * intentionally empty list as `[""]`, and fromWfsLayer()/toWfsLayer()
 * normalize that to `[]`. That's a deliberate, harmless representation
 * change, not data loss - comparing it byte-for-byte would flag nearly
 * every existing record and drown out real defects like the dropped `date`.
 *
 * @returns {string[]} the keys that differ; empty when the round trip holds.
 */
export function checkRoundTrip(raw) {
  const roundTripped = toWfsLayer(fromWfsLayer(raw), raw);
  const keys = new Set([...Object.keys(raw), ...Object.keys(roundTripped)]);
  const diffs = [];
  keys.forEach((key) => {
    const same = FIELD_LIST_KEYS.includes(key)
      ? JSON.stringify(toArray(raw[key])) ===
        JSON.stringify(toArray(roundTripped[key]))
      : JSON.stringify(raw[key]) === JSON.stringify(roundTripped[key]);
    if (!same) {
      diffs.push(key);
    }
  });
  return diffs;
}

/**
 * Builds the canonical model from one WMS layer's sublayer (layersInfo
 * entry). Only search-related fields are editable through this adapter -
 * everything else about the sublayer or its parent WMS layer (styles,
 * queryable, tiled, auth, the other ~40 WMS-layer fields) is out of scope
 * and preserved untouched by toWmsSublayer().
 *
 * Field names differ from the wfslayer shape (see the plan's naming table):
 * searchPropertyName/searchDisplayName/searchShortDisplayName are
 * comma-separated strings here, not arrays, and there's no aliasDict at all
 * for a WMS-derived source - the disk shape never carries one.
 */
export function fromWmsSublayer(wmsLayer, sublayer) {
  const canonical = {
    kind: "wmssublayer",
    id: sublayer.id,
    pid: wmsLayer.id, // structural, not editable here - set by the WMS layer itself
    caption: sublayer.caption || sublayer.id,
    parentCaption: wmsLayer.caption,
    internalLayerName: "",
    url: sublayer.searchUrl || wmsLayer.url,
    layers: [sublayer.id],
    geometryField: sublayer.searchGeometryField || "",
    outputFormat: sublayer.searchOutputFormat || "GML3",
    wfsVersion: sublayer.searchWfsVersion || "1.1.0",
    featureNS: sublayer.searchFeatureNS || "",
    serverType: wmsLayer.serverType || "geoserver", // inherited, read-only here
    infobox: sublayer.infobox || "",
    infoclickIcon: sublayer.infoclickIcon || "",
    aliasDict: "",
  };
  canonical.searchFields = toArray(sublayer.searchPropertyName);
  canonical.displayFields = toArray(sublayer.searchDisplayName);
  canonical.secondaryLabelFields = toArray(sublayer.secondaryLabelFields);
  canonical.shortDisplayFields = toArray(sublayer.searchShortDisplayName);
  return canonical;
}

/**
 * Builds the payload for settings/wmslayer: the *entire* WMS layer object
 * exactly as loaded, with only the target sublayer's search-related fields
 * patched in (as comma-separated strings, matching the disk shape). Every
 * other sublayer, and every other field on both the layer and the target
 * sublayer, is the same object reference as before - not rebuilt, so there
 * is no reconstruction step that could drop something.
 */
export function toWmsSublayer(canonical, wmsLayer, sublayerId) {
  return {
    ...wmsLayer,
    layersInfo: wmsLayer.layersInfo.map((sl) =>
      sl.id === sublayerId
        ? {
            ...sl,
            searchUrl: canonical.url,
            searchPropertyName: canonical.searchFields.join(","),
            searchDisplayName: canonical.displayFields.join(","),
            secondaryLabelFields: canonical.secondaryLabelFields.join(","),
            searchShortDisplayName: canonical.shortDisplayFields.join(","),
            searchGeometryField: canonical.geometryField,
            searchOutputFormat: canonical.outputFormat,
            searchWfsVersion:
              canonical.wfsVersion !== "1.1.0"
                ? canonical.wfsVersion
                : undefined,
            searchFeatureNS: canonical.featureNS || undefined,
            infobox: canonical.infobox,
            infoclickIcon: canonical.infoclickIcon,
          }
        : sl
    ),
  };
}

/**
 * Removes a WMS sublayer's search config, turning it back into a plain
 * display-only sublayer. This is "delete" for a WMS-derived search source:
 * the sublayer and its parent WMS layer are untouched otherwise, only the
 * search-related fields are cleared. Setting both searchUrl and
 * searchPropertyName to "" is what makes buildUnifiedSources() (the list's
 * data source) stop treating it as a search source at all.
 */
export function clearWmsSublayerSearchConfig(wmsLayer, sublayerId) {
  return {
    ...wmsLayer,
    layersInfo: wmsLayer.layersInfo.map((sl) =>
      sl.id === sublayerId
        ? {
            ...sl,
            searchUrl: "",
            searchPropertyName: "",
            searchDisplayName: "",
            secondaryLabelFields: "",
            searchShortDisplayName: "",
            searchGeometryField: "",
            searchOutputFormat: "",
            searchWfsVersion: "",
            searchFeatureNS: "",
          }
        : sl
    ),
  };
}

/**
 * Round-trip assertion for the WMS-sublayer path. Compares the *canonical*
 * form before vs. after an edit-free round trip, not the raw disk JSON:
 * configTranslator.js resolves every one of these fields with its own
 * `sl.X || default` fallback (e.g. `sl.searchOutputFormat || "GML3"`,
 * `sl.searchUrl || layer.url`), so an absent key and its resolved default
 * are the same thing to every consumer - flagging that difference would be
 * exactly the kind of noise that drowns out a real defect. toWmsSublayer()
 * never reconstructs the layer or any sublayer object (it only spreads onto
 * them), so this is really just confirming fromWmsSublayer() itself is
 * lossless on its own output.
 *
 * @returns {string[]} the keys that differ; empty when the round trip holds.
 */
export function checkWmsSublayerRoundTrip(wmsLayer, sublayerId) {
  const sublayer = wmsLayer.layersInfo.find((sl) => sl.id === sublayerId);
  if (!sublayer) return [];

  const before = fromWmsSublayer(wmsLayer, sublayer);
  const roundTrippedLayer = toWmsSublayer(before, wmsLayer, sublayerId);
  const roundTrippedSublayer = roundTrippedLayer.layersInfo.find(
    (sl) => sl.id === sublayerId
  );
  const after = fromWmsSublayer(roundTrippedLayer, roundTrippedSublayer);

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs = [];
  keys.forEach((key) => {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      diffs.push(key);
    }
  });
  return diffs;
}

/**
 * Validates the fields the form lets the admin edit. Mirrors the legacy
 * form's validateField() exactly, so a source that was valid there stays
 * valid here.
 */
export function validate(canonical) {
  const errors = {};

  if (!canonical.caption) errors.caption = "Visningsnamn krävs.";
  // A wmssublayer's url is genuinely optional - see fromWmsSublayer(), which
  // falls back to the parent WMS layer's own url, and the matching helper
  // text on the form's url field ("Tom = använd WMS-lagrets egen url").
  // Requiring it here would silently break that documented fallback.
  if (canonical.kind !== "wmssublayer" && !canonical.url) {
    errors.url = "Url krävs.";
  }
  if (!canonical.geometryField) errors.geometryField = "Geometrifält krävs.";
  if (canonical.layers.length === 0) {
    errors.layers = "Välj minst ett lager.";
  }
  if (!canonical.outputFormat) errors.outputFormat = "Responstyp krävs.";
  if (!canonical.serverType) errors.serverType = "Servertyp krävs.";

  // The legacy per-sublayer inputs in wmslayerform.jsx never validated these
  // characters - only the legacy wfslayer form (views/search.jsx) did. Keep
  // that leniency for wmssublayer sources so this form doesn't retroactively
  // block re-saving a sublayer whose search fields were already live under
  // the old, unvalidated dialog.
  if (canonical.kind !== "wmssublayer") {
    FIELD_LIST_KEYS.forEach((key) => {
      const values = canonical[key];
      // An intentionally empty list is valid - only reject actual bad tokens.
      const invalid = values.filter((v) => !isValidFieldName(v));
      if (invalid.length > 0) {
        errors[key] = `Ogiltigt tecken i: ${invalid.join(", ")}`;
      }
    });
  }

  return errors;
}
