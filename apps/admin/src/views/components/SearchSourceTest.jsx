import React, { useState } from "react";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import PlayArrowIcon from "@material-ui/icons/PlayArrow";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import ReportProblemOutlinedIcon from "@material-ui/icons/ReportProblemOutlined";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";

import { testSearchSource } from "../../utils/testSearchSource";

const LEVELS = {
  ok: { Icon: CheckCircleOutlineIcon, color: "#2e7d32" },
  info: { Icon: InfoOutlinedIcon, color: "#1565c0" },
  warn: { Icon: ReportProblemOutlinedIcon, color: "#ed6c02" },
  error: { Icon: ErrorOutlineIcon, color: "#c62828" },
};

const MAX_HITS_SHOWN = 5;

// The value to show for one returned feature in the hit list: the first
// configured display field that has a plain-text value, else the first
// search field's.
function hitLabel(props, source) {
  const field = [...source.displayFields, ...source.searchFields].find(
    (f) => typeof props[f] === "string" && props[f] !== ""
  );
  return field ? props[field] : null;
}

/**
 * "Testa söklager" section of SearchSourceForm: runs one real search with
 * the form's current (unsaved) values and lists what it found. Nothing is
 * saved. See utils/testSearchSource.js for what is checked and why.
 *
 * @param {object} source - the form's current canonical söklager
 * @param {string} urlProxy - config.url_proxy
 * @param {() => object} getTestContext - what to test against ({ mapName,
 *   projection, projections, usesSource, searchProxy }), read at click time
 *   since the map configs load in the background
 */
export default function SearchSourceTest({ source, urlProxy, getTestContext }) {
  const [term, setTerm] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  function run() {
    setRunning(true);
    setResult(null);
    testSearchSource(source, {
      term,
      proxy: urlProxy,
      map: getTestContext ? getTestContext() : null,
    })
      .then(setResult)
      .catch((error) =>
        setResult({
          checks: [{ level: "error", text: error.message || String(error) }],
          features: [],
        })
      )
      .finally(() => setRunning(false));
  }

  const hits = result
    ? result.features
        .map((props) => hitLabel(props, source))
        .filter(Boolean)
        .slice(0, MAX_HITS_SHOWN)
    : [];

  return (
    <div>
      <Typography variant="subtitle1" gutterBottom>
        Testa söklager
      </Typography>
      <Typography variant="body2" style={{ color: "#666", marginBottom: 12 }}>
        Gör en riktig sökning mot tjänsten med inställningarna ovan, på samma
        sätt som kartan gör, och visar vad som skulle gå fel. Inget sparas.
      </Typography>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <TextField
          size="small"
          label="Sökord (valfritt)"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            // Enter would otherwise submit (= save) the surrounding form.
            if (e.key === "Enter") {
              e.preventDefault();
              if (!running) run();
            }
          }}
          style={{ minWidth: 260 }}
        />
        <Button
          type="button"
          variant="outlined"
          onClick={run}
          disabled={running}
          startIcon={
            running ? <CircularProgress size={16} /> : <PlayArrowIcon />
          }
        >
          Testa
        </Button>
      </div>

      {result && (
        <div style={{ marginTop: 12 }}>
          {result.checks.map((check, i) => {
            const { Icon, color } = LEVELS[check.level] || LEVELS.info;
            return (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                <Icon style={{ color, fontSize: 20, flexShrink: 0 }} />
                <Typography variant="body2">{check.text}</Typography>
              </div>
            );
          })}
          {hits.length > 0 && (
            <Typography variant="body2" style={{ color: "#666", marginTop: 4 }}>
              Träffar: {hits.join(", ")}
              {result.features.length > hits.length ? " …" : ""}
            </Typography>
          )}
        </div>
      )}
    </div>
  );
}
