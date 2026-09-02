import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

import { REGULATION_TYPE_HEADINGS } from "./constants";

const heading = (type) => REGULATION_TYPE_HEADINGS[type?.toLowerCase()] ?? type;

/**
 * @summary Lists the detaljplan regulations that apply at the clicked point.
 *
 * @description Presentation is still plain - the readable report format is a
 * separate piece of work. What the structure does carry is the distinction that
 * matters when reading a plan: what applies at this exact point, versus what
 * the plan contains as a whole, with the counts to move between them.
 */
function PlanCheckerView({ localObserver, layerStatus, wmsLayerId }) {
  const [plans, setPlans] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [showAll, setShowAll] = React.useState(false);

  React.useEffect(() => {
    localObserver.subscribe("planChecker.loading", setLoading);
    localObserver.subscribe("planChecker.error", (message) => {
      setError(message);
      setPlans(null);
    });
    localObserver.subscribe("planChecker.result", ({ plans }) => {
      setError(null);
      setPlans(plans);
    });
    return () => {
      localObserver.unsubscribe("planChecker.loading");
      localObserver.unsubscribe("planChecker.error");
      localObserver.unsubscribe("planChecker.result");
    };
  }, [localObserver]);

  const layerWarning =
    layerStatus === "unconfigured" ? (
      <Alert severity="warning">
        Inget planlager är kopplat till verktyget, så planerna kan inte visas i
        kartan. Sökningen fungerar ändå. Ange lagrets id i verktygets
        inställning <code>wmsLayerId</code>.
      </Alert>
    ) : layerStatus === "missing" ? (
      <Alert severity="warning">
        Planlagret ({wmsLayerId}) finns inte i den här kartan, så planerna kan
        inte visas grafiskt. Kontrollera lagret i Lagerhanteraren, eller
        verktygets inställning, med kartans administratör.
      </Alert>
    ) : layerStatus === "hidden" ? (
      <Alert severity="info">
        Planlagret är släckt. Tänd det i Lagerhanteraren för att se planerna i
        kartan — sökningen fungerar ändå.
      </Alert>
    ) : null;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={2}>
        {layerWarning}
        <Alert severity="error">{error}</Alert>
      </Stack>
    );
  }

  if (plans === null) {
    return (
      <Stack spacing={2}>
        {layerWarning}
        <Typography variant="body2">
          Klicka i kartan för att se vilka planbestämmelser som gäller på
          platsen.
        </Typography>
      </Stack>
    );
  }

  if (plans.length === 0) {
    // The distinction that matters most in this tool: no digital plan is not
    // the same as no plan. NGP holds only plans delivered under the national
    // specification, which is a minority of those in force.
    return (
      <Stack spacing={2}>
        {layerWarning}
        <Alert severity="info">
          Ingen digital detaljplan hittades på den klickade punkten. Det betyder
          inte att platsen saknar detaljplan — bara att det inte finns någon
          registrerad i den nationella geodataplattformen.
        </Alert>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      {layerWarning}
      <FormControlLabel
        control={
          <Switch
            size="small"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />
        }
        label="Visa alla bestämmelser i planen"
      />

      {plans.map(({ key, plan, documents, types, truncated }) => (
        <Box key={key}>
          <Typography variant="subtitle1">{plan.namn}</Typography>
          <Typography variant="body2" color="text.secondary">
            Beteckning {plan.beteckning} · {plan.status}
            {plan.datumLagakraft ? ` (${plan.datumLagakraft})` : ""}
          </Typography>

          {documents.length > 0 && (
            <Stack direction="row" spacing={2} sx={{ mt: 1, flexWrap: "wrap" }}>
              {documents.map((d) => (
                <Link
                  key={d.href}
                  href={d.href}
                  target="_blank"
                  rel="noreferrer"
                  variant="body2"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <DownloadIcon fontSize="inherit" />
                  {d.title}
                </Link>
              ))}
            </Stack>
          )}

          {truncated && (
            <Alert severity="warning" sx={{ mt: 1 }}>
              Planen har fler bestämmelser än som hämtats; listan kan vara
              ofullständig.
            </Alert>
          )}

          {types.map(
            ({ type, regulations, all, countAtPoint, countInPlan }) => {
              const shown = showAll ? all : regulations;
              if (shown.length === 0) return null;
              return (
                <Box key={type} sx={{ mt: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                    {heading(type)} — {countAtPoint} av {countInPlan} st
                  </Typography>
                  {shown.map((r) => (
                    <Box key={r.id} sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {r.anvandningsform || r.label}
                      </Typography>
                      <Typography variant="body2">
                        {r.text || r.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {[r.kategori, r.underkategori]
                          .filter(Boolean)
                          .join(" · ")}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            }
          )}

          <Divider sx={{ mt: 2 }} />
        </Box>
      ))}
    </Stack>
  );
}

export default PlanCheckerView;
