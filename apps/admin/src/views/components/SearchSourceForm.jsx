import React, { useEffect, useMemo, useState } from "react";
import TextField from "@material-ui/core/TextField";
import MenuItem from "@material-ui/core/MenuItem";
import Button from "@material-ui/core/Button";
import Chip from "@material-ui/core/Chip";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";
import Divider from "@material-ui/core/Divider";
import RefreshIcon from "@material-ui/icons/Refresh";

import InfoclickEditor from "./InfoclickEditor";
import {
  fromWfsLayer,
  toWfsLayer,
  fromWmsSublayer,
  toWmsSublayer,
  validate,
  checkRoundTrip,
  checkWmsSublayerRoundTrip,
} from "../../utils/searchSource";
import {
  listFeatureTypes,
  describeFeatureType,
  isGeometryType,
} from "../../utils/describeFeatureType";

const FIELD_LIST_SPECS = [
  {
    key: "searchFields",
    label: "Sökfält",
    // Intentionally optional: SearchModel.js supports a source with no
    // searchFields at all (spatial-only search - the admin just can't type
    // a text query against it). Don't mark this required or validate it
    // non-empty; that would block a legitimate, already-supported config.
    help: "Styr vilka attribut sökning sker mot. Kan lämnas tom för ett lager som bara ska vara sökbart via ritad yta/markering.",
  },
  {
    key: "displayFields",
    label: "Primära visningsfält",
    help: "Visas i sökresultatlistan, och som etikett i kartan om aktiverat.",
  },
  {
    key: "secondaryLabelFields",
    label: "Sekundära visningsfält",
    help: "Visas med mindre text under de primära visningsfälten.",
  },
  {
    key: "shortDisplayFields",
    label: "Visningsfält i kartan",
    help: "Visas som etikett bredvid sökresultat i kartan.",
  },
];

function FieldListEditor({ label, help, values, attributeOptions, onChange }) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const additions = draft
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (additions.length > 0) {
      // Functional update: the attribute-picker below can fire its own
      // onChange in the same tick (e.g. blurring this field by clicking
      // the picker), and each call needs to see the OTHER's addition
      // rather than both computing off the same stale `values` prop and
      // one silently clobbering the other.
      onChange((prev) => [
        ...prev,
        ...additions.filter((v) => !prev.includes(v)),
      ]);
    }
    setDraft("");
  }

  function remove(value) {
    onChange((prev) => prev.filter((v) => v !== value));
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <Typography variant="subtitle2">
        {label}
        {help && (
          <span
            style={{ color: "#888", fontWeight: 400, marginLeft: 6 }}
            title={help}
          >
            (?)
          </span>
        )}
      </Typography>
      <div style={{ marginBottom: 6 }}>
        {values.length === 0 && (
          <Typography variant="body2" style={{ color: "#999" }}>
            Inga fält valda.
          </Typography>
        )}
        {values.map((value) => (
          <Chip
            key={value}
            label={value}
            size="small"
            onDelete={() => remove(value)}
            style={{ marginRight: 4, marginBottom: 4 }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <TextField
          size="small"
          placeholder="Skriv fältnamn, kommaseparerat"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          style={{ minWidth: 260 }}
        />
        {attributeOptions && attributeOptions.length > 0 && (
          <TextField
            select
            size="small"
            value=""
            label="Lägg till attribut"
            style={{ minWidth: 220 }}
            onChange={(e) => {
              const name = e.target.value;
              if (name) {
                onChange((prev) =>
                  prev.includes(name) ? prev : [...prev, name]
                );
              }
            }}
          >
            {attributeOptions.map((attr) => (
              <MenuItem key={attr.name} value={attr.name}>
                {attr.name}
                {attr.type ? ` (${attr.type})` : ""}
              </MenuItem>
            ))}
          </TextField>
        )}
      </div>
    </div>
  );
}

/**
 * Full search-config editor, for either origin a search source can have:
 *
 *   editTarget === null                                     add a new wfslayer söklager
 *   editTarget = { kind: "wfslayer", raw }                   edit an existing söklager
 *   editTarget = { kind: "wmssublayer", wmsLayer, sublayerId } edit a WMS sublayer's
 *                                                              search config in place
 *
 * The WMS-sublayer path is deliberately narrow: it only ever touches the
 * search-related fields on ONE layersInfo entry (searchUrl, searchPropertyName,
 * etc.) via toWmsSublayer(), which spreads onto the original objects rather
 * than rebuilding them - so the other ~40 fields on the WMS layer, and every
 * other sublayer, are never at risk. Structural things (which WMS layer, which
 * sublayer, its caption, its styling) stay out of scope and are shown
 * read-only - those still belong to the Lager tab.
 *
 * Writes go through the onSave callback (this component only builds the
 * payload and validates it) - the caller (SearchSources) owns the actual
 * fetch (to the right endpoint for the right kind) and list refresh.
 *
 * Renders fields only, no Save/Cancel/Delete buttons - the caller renders
 * those in a Dialog's fixed DialogActions (outside the scrolling content) and
 * wires Save to <form id="search-source-form">'s submit via the HTML `form`
 * attribute, so they stay reachable without scrolling through the whole form.
 *
 * @param {object|null} editTarget
 * @param {string} defaultUrl - prefilled for a new wfslayer (config.url_default_server)
 * @param {string} urlProxy - config.url_proxy, forwarded to every WFS request
 * @param {Array} wmsLayers - layersStore.wmslayers, for the "Kopplat kartlager" picker
 * @param {(payload: object) => void} onSave - called with a ready-to-send
 *   payload (a wfslayer, or a full wmslayer with one sublayer patched) once
 *   validation passes
 */
export default function SearchSourceForm({
  editTarget,
  defaultUrl,
  urlProxy,
  wmsLayers,
  onSave,
}) {
  const kind = editTarget?.kind || "wfslayer";
  const isWmsSublayer = kind === "wmssublayer";
  const raw = kind === "wfslayer" ? editTarget?.raw : null;
  const sublayer = isWmsSublayer
    ? editTarget.wmsLayer.layersInfo.find(
        (sl) => sl.id === editTarget.sublayerId
      )
    : null;

  const [canonical, setCanonical] = useState(() => {
    if (isWmsSublayer) return fromWmsSublayer(editTarget.wmsLayer, sublayer);
    const c = fromWfsLayer(raw || {});
    if (!raw && defaultUrl) c.url = defaultUrl;
    return c;
  });
  const [errors, setErrors] = useState({});
  const [featureTypes, setFeatureTypes] = useState([]);
  const [featureTypesLoading, setFeatureTypesLoading] = useState(false);
  const [featureTypesError, setFeatureTypesError] = useState(null);
  const [attributesCache, setAttributesCache] = useState({});
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [attributesError, setAttributesError] = useState(null);
  const [roundTripWarning, setRoundTripWarning] = useState(null);

  const selectedTypeName = canonical.layers[0];

  // Round-trip assertion (see plan's "the discipline that prevents it"):
  // load the source, write it straight back with no edits, and the result
  // must be byte-for-byte what was loaded. Runs once per edit session, dev
  // only - a real save always goes through the edited canonical model, this
  // only proves the adapter itself is lossless.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const diffs = isWmsSublayer
      ? checkWmsSublayerRoundTrip(editTarget.wmsLayer, editTarget.sublayerId)
      : raw
      ? checkRoundTrip(raw)
      : [];
    if (diffs.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        "[SearchSourceForm] round-trip check failed for keys:",
        diffs,
        "- the adapter is dropping or renaming data."
      );
      setRoundTripWarning(diffs);
    }
    // Only meaningful against the source we opened the form with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editing an existing wfslayer: load the feature type list for its own URL
  // right away, so the layer picker below shows the current selection and
  // lets the admin change it without retyping the URL. A WMS sublayer's
  // typename is fixed (it's the sublayer itself) - just fetch its attributes.
  useEffect(() => {
    if (isWmsSublayer) {
      fetchAttributesFor(selectedTypeName, canonical.url);
      return;
    }
    if (raw && raw.url) {
      handleLoadFeatureTypes(raw.url);
    }
    if (raw && selectedTypeName) {
      fetchAttributesFor(selectedTypeName, raw.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setField(key, valueOrUpdater) {
    setCanonical((c) => ({
      ...c,
      [key]:
        typeof valueOrUpdater === "function"
          ? valueOrUpdater(c[key])
          : valueOrUpdater,
    }));
  }

  function handleLoadFeatureTypes(urlOverride) {
    const url = urlOverride || canonical.url;
    if (!url) {
      setFeatureTypesError("Ange en url först.");
      return;
    }
    setFeatureTypesLoading(true);
    setFeatureTypesError(null);
    listFeatureTypes(url, { proxy: urlProxy })
      .then((types) => setFeatureTypes(types))
      .catch((err) =>
        setFeatureTypesError(
          err.message || "Kunde inte hämta lagerlistan från tjänsten."
        )
      )
      .finally(() => setFeatureTypesLoading(false));
  }

  function fetchAttributesFor(typeName, urlOverride, { force = false } = {}) {
    if (!typeName) return;
    const cached = attributesCache[typeName];
    if (cached !== undefined && !force) {
      if (Array.isArray(cached)) autofillGeometryField(cached);
      return;
    }
    setAttributesLoading(true);
    setAttributesError(null);
    describeFeatureType(urlOverride || canonical.url, typeName, {
      proxy: urlProxy,
    })
      .then((attributes) => {
        setAttributesCache((c) => ({ ...c, [typeName]: attributes }));
        autofillGeometryField(attributes);
      })
      .catch(() => {
        setAttributesCache((c) => ({ ...c, [typeName]: false }));
        setAttributesError(
          "Kunde inte hämta attributlistan från tjänsten. Ange attributnamn manuellt."
        );
      })
      .finally(() => setAttributesLoading(false));
  }

  function autofillGeometryField(attributes) {
    setCanonical((c) => {
      if (c.geometryField) return c; // never override an existing value
      const geometryAttr = attributes.find((a) => isGeometryType(a.type));
      return geometryAttr ? { ...c, geometryField: geometryAttr.name } : c;
    });
  }

  function selectFeatureType(name) {
    // Switching to a genuinely different type invalidates any geometryField
    // already on canonical.geometryField - it may not exist on the new
    // type. Clear it first so autofillGeometryField()'s "never override an
    // existing value" guard doesn't leave the old type's geometry column
    // name pointing at an attribute the new type doesn't have.
    setCanonical((c) =>
      c.layers[0] === name ? c : { ...c, geometryField: "" }
    );
    setField("layers", [name]);
    fetchAttributesFor(name, canonical.url);
  }

  const rawAttributes = attributesCache[selectedTypeName];
  const attributes = Array.isArray(rawAttributes) ? rawAttributes : [];
  const nonGeometryAttributes = useMemo(
    () => attributes.filter((a) => !isGeometryType(a.type)),
    [attributes]
  );
  const geometryAttributes = useMemo(
    () => attributes.filter((a) => isGeometryType(a.type)),
    [attributes]
  );

  function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(canonical);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    const payload = isWmsSublayer
      ? toWmsSublayer(canonical, editTarget.wmsLayer, editTarget.sublayerId)
      : toWfsLayer(canonical, raw);
    onSave(payload);
  }

  return (
    <form id="search-source-form" onSubmit={handleSubmit}>
      {roundTripWarning && (
        <Typography
          variant="body2"
          style={{
            background: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 16,
          }}
        >
          Utvecklarvarning: laddning/sparning av det här objektet rundtrippar
          inte utan ändringar för fälten: {roundTripWarning.join(", ")}. Se
          konsolen.
        </Typography>
      )}

      {isWmsSublayer && (
        <Typography
          variant="body2"
          style={{
            background: "#e8f0fe",
            border: "1px solid #c6dafc",
            borderRadius: 4,
            padding: "8px 12px",
            marginBottom: 16,
          }}
        >
          Redigerar sökkonfiguration för underlagret <b>{canonical.caption}</b>{" "}
          i WMS-lagret <b>{canonical.parentCaption}</b>. Övriga egenskaper hos
          lagret (stil, synlighet, behörigheter m.m.) redigeras fortfarande i
          Lager-fliken.
        </Typography>
      )}

      <Typography variant="subtitle1" gutterBottom>
        Anslutning
      </Typography>
      <Grid container spacing={2} style={{ marginBottom: 8 }}>
        <Grid item xs={isWmsSublayer ? 12 : 8}>
          <TextField
            fullWidth
            required
            label={isWmsSublayer ? "Url (WFS-söktjänst)" : "Url"}
            helperText={
              isWmsSublayer
                ? "Tom = använd WMS-lagrets egen url. Ange en annan url om söktjänsten (WFS) ligger på ett annat ställe än WMS-tjänsten."
                : undefined
            }
            value={canonical.url}
            error={!!errors.url}
            onChange={(e) => setField("url", e.target.value)}
          />
        </Grid>
        {!isWmsSublayer && (
          <Grid item xs={4} style={{ display: "flex", alignItems: "flex-end" }}>
            <Button
              variant="outlined"
              startIcon={
                featureTypesLoading ? (
                  <CircularProgress size={16} />
                ) : (
                  <RefreshIcon />
                )
              }
              onClick={() => handleLoadFeatureTypes()}
              disabled={featureTypesLoading}
            >
              Hämta lagerlista
            </Button>
          </Grid>
        )}
        <Grid item xs={6}>
          {/* Deliberately a closed list, not free text: this must be exactly
              the set SearchModel.js's outputFormat switch understands
              (client/src/models/SearchModel.js) - anything else is rejected
              client-side with no server round-trip at all ("Output format
              now allowed"), so a free-text value here could only ever
              produce a silently broken söklager. */}
          <TextField
            select
            fullWidth
            required
            label="Responstyp"
            value={canonical.outputFormat}
            error={!!errors.outputFormat}
            onChange={(e) => setField("outputFormat", e.target.value)}
          >
            <MenuItem value="application/json">application/json</MenuItem>
            <MenuItem value="application/vnd.geo+json">
              application/vnd.geo+json
            </MenuItem>
            <MenuItem value="GML3">GML3</MenuItem>
            <MenuItem value="GML32">GML32</MenuItem>
            <MenuItem value="GML2">GML2</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={6}>
          {isWmsSublayer ? (
            <TextField
              fullWidth
              disabled
              label="Servertyp"
              helperText="Ärvs från WMS-lagret, redigeras i Lager-fliken."
              value={canonical.serverType}
            />
          ) : (
            <TextField
              select
              fullWidth
              required
              label="Servertyp"
              value={canonical.serverType}
              error={!!errors.serverType}
              onChange={(e) => setField("serverType", e.target.value)}
            >
              <MenuItem value="geoserver">GeoServer</MenuItem>
              <MenuItem value="qgis">QGIS Server</MenuItem>
              <MenuItem value="arcgis">ArcGIS Server</MenuItem>
              <MenuItem value="mapserver">MapServer</MenuItem>
            </TextField>
          )}
        </Grid>
      </Grid>

      {featureTypesError && (
        <Typography variant="body2" color="error" style={{ marginBottom: 8 }}>
          {featureTypesError}
        </Typography>
      )}

      {!isWmsSublayer && (
        <>
          <Divider style={{ margin: "16px 0" }} />
          <Typography variant="subtitle1" gutterBottom>
            Lager
          </Typography>
          {errors.layers && (
            <Typography variant="body2" color="error">
              {errors.layers}
            </Typography>
          )}
          {featureTypes.length > 0 ? (
            <div style={{ maxHeight: 180, overflowY: "auto", marginBottom: 8 }}>
              {featureTypes.map((ft) => (
                <div key={ft.name}>
                  <label style={{ cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="featureType"
                      checked={selectedTypeName === ft.name}
                      onChange={() => selectFeatureType(ft.name)}
                    />{" "}
                    {ft.name}
                    {ft.title && ft.title !== ft.name ? ` (${ft.title})` : ""}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            selectedTypeName && (
              <Typography variant="body2" style={{ marginBottom: 8 }}>
                Valt lager: <code>{selectedTypeName}</code> (hämta lagerlistan
                för att byta)
              </Typography>
            )
          )}
        </>
      )}

      <div style={{ marginTop: isWmsSublayer ? 16 : 0, marginBottom: 8 }}>
        {isWmsSublayer && (
          <Typography variant="body2" style={{ marginBottom: 4 }}>
            Lager: <code>{selectedTypeName}</code>
          </Typography>
        )}
        <Button
          size="small"
          onClick={() =>
            fetchAttributesFor(selectedTypeName, canonical.url, {
              force: true,
            })
          }
          disabled={!selectedTypeName || attributesLoading}
        >
          {attributesLoading ? "Hämtar attribut…" : "Hämta attribut"}
        </Button>
        {attributesError && (
          <Typography
            variant="body2"
            color="error"
            style={{ display: "inline", marginLeft: 8 }}
          >
            {attributesError}
          </Typography>
        )}
        {attributes.length > 0 && (
          <Typography
            variant="body2"
            style={{ display: "inline", marginLeft: 8, color: "#666" }}
          >
            {attributes.length} attribut hämtade för {selectedTypeName}.
          </Typography>
        )}
      </div>

      {!isWmsSublayer && (
        <>
          <Divider style={{ margin: "16px 0" }} />
          <Typography variant="subtitle1" gutterBottom>
            Namn
          </Typography>
          <Grid container spacing={2} style={{ marginBottom: 8 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                required
                label="Visningsnamn"
                helperText={
                  errors.caption ||
                  "Visas för användaren, bl.a. i sökresultatlistan."
                }
                error={!!errors.caption}
                value={canonical.caption}
                onChange={(e) => setField("caption", e.target.value)}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Visningsnamn Admin UI"
                helperText="Visas inte för användaren, bara internt i Admin."
                value={canonical.internalLayerName}
                onChange={(e) => setField("internalLayerName", e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Kopplat kartlager"
                helperText="Om sökträffar från det här söklagret också visas som ett WMS-lager i kartan: koppla dem här så tänds Visa/dölj motsvarande kartlager (sökverktygets inställningar) för det här söklagret."
                value={canonical.pid || ""}
                onChange={(e) => setField("pid", e.target.value || null)}
              >
                <MenuItem value="">— Ingen koppling —</MenuItem>
                {(wmsLayers || []).map((wms) => (
                  <MenuItem key={wms.id} value={wms.id}>
                    {wms.caption}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </>
      )}

      <Divider style={{ margin: "16px 0" }} />
      <Typography variant="subtitle1" gutterBottom>
        Inforuta
      </Typography>
      <InfoclickEditor
        key={(raw?.id ?? editTarget?.sublayerId) || "new"}
        initialValue={canonical.infobox}
        onChange={(html) => setField("infobox", html)}
        availableAttributes={nonGeometryAttributes}
        fetchingAttributes={attributesLoading}
        fetchError={attributesError}
        onFetchAttributes={() =>
          fetchAttributesFor(selectedTypeName, canonical.url, { force: true })
        }
      />
      {isWmsSublayer && (
        <TextField
          fullWidth
          label="Inforuta-ikon"
          helperText="Ikon som visas i sökresultatet, om satt."
          value={canonical.infoclickIcon}
          onChange={(e) => setField("infoclickIcon", e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}

      {!isWmsSublayer && (
        <>
          <Divider style={{ margin: "16px 0" }} />
          <Typography variant="subtitle1" gutterBottom>
            Attributmappning
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            value={canonical.aliasDict}
            onChange={(e) => setField("aliasDict", e.target.value)}
          />
        </>
      )}

      <Divider style={{ margin: "16px 0" }} />
      {FIELD_LIST_SPECS.map((spec) => (
        <FieldListEditor
          key={spec.key}
          label={spec.label}
          help={spec.help}
          values={canonical[spec.key]}
          attributeOptions={nonGeometryAttributes}
          onChange={(values) => setField(spec.key, values)}
        />
      ))}
      {(errors.searchFields ||
        errors.displayFields ||
        errors.secondaryLabelFields ||
        errors.shortDisplayFields) && (
        <Typography variant="body2" color="error" style={{ marginBottom: 12 }}>
          {errors.searchFields ||
            errors.displayFields ||
            errors.secondaryLabelFields ||
            errors.shortDisplayFields}
        </Typography>
      )}

      <TextField
        fullWidth
        required
        label="Geometrifält"
        error={!!errors.geometryField}
        helperText={
          errors.geometryField ||
          "Fylls i automatiskt från attributlistan om möjligt."
        }
        value={canonical.geometryField}
        onChange={(e) => setField("geometryField", e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {geometryAttributes.length > 0 && (
        <TextField
          select
          size="small"
          label="Välj geometrifält"
          value=""
          style={{ minWidth: 260, marginBottom: 24 }}
          onChange={(e) =>
            e.target.value && setField("geometryField", e.target.value)
          }
        >
          {geometryAttributes.map((attr) => (
            <MenuItem key={attr.name} value={attr.name}>
              {attr.name}
              {attr.type ? ` (${attr.type})` : ""}
            </MenuItem>
          ))}
        </TextField>
      )}
    </form>
  );
}
