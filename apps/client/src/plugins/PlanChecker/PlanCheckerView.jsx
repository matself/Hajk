import React from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

/**
 * @summary Lists the detaljplan regulations that apply at the clicked point.
 *
 * @description Deliberately plain for now - the readable report format is a
 * separate piece of work. What matters here is that every field NGP returns
 * has somewhere to land, so the shape of the data is visible while the
 * presentation is still being decided.
 */
function PlanCheckerView({ model, localObserver }) {
  const [plans, setPlans] = React.useState(null);
  const [truncated, setTruncated] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    localObserver.subscribe("planChecker.loading", setLoading);
    localObserver.subscribe("planChecker.error", (message) => {
      setError(message);
      setPlans(null);
    });
    localObserver.subscribe("planChecker.result", ({ plans, truncated }) => {
      setError(null);
      setPlans(plans);
      setTruncated(truncated);
    });
    return () => {
      localObserver.unsubscribe("planChecker.loading");
      localObserver.unsubscribe("planChecker.error");
      localObserver.unsubscribe("planChecker.result");
    };
  }, [localObserver]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (plans === null) {
    return (
      <Typography variant="body2">
        Klicka i kartan för att se vilka planbestämmelser som gäller på platsen.
      </Typography>
    );
  }

  if (plans.length === 0) {
    // The distinction that matters most in this tool: no digital plan is not
    // the same as no regulations. NGP only holds plans delivered under the
    // national specification.
    return (
      <Alert severity="info">
        Ingen digital detaljplan hittades på den klickade punkten i kommun{" "}
        {model.getOptions().kommunkod}. Det betyder inte att platsen saknar
        detaljplan — bara att det inte finns någon registrerad i den nationella
        geodataplattformen.
      </Alert>
    );
  }

  return (
    <Stack spacing={2}>
      {truncated && (
        <Alert severity="warning">
          Träfflistan kan vara ofullständig, gränsen för antal hämtade
          bestämmelser nåddes.
        </Alert>
      )}

      {plans.map(({ key, plan, types }) => (
        <Box key={key}>
          <Typography variant="subtitle1">{plan.namn || key}</Typography>
          <Typography variant="body2" color="text.secondary">
            {plan.beteckning} · {plan.status}
            {plan.datumLagakraft ? ` ${plan.datumLagakraft}` : ""}
          </Typography>

          {types.map(({ type, regulations }) => (
            <Box key={type} sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                {type}
              </Typography>
              {regulations.map((r) => (
                <Box key={r.id} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {r.regulation.bestammelseformulering || r.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {[
                      r.regulation.anvandningsform,
                      r.regulation.kategori,
                      r.regulation.underkategori,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Typography>
                </Box>
              ))}
            </Box>
          ))}

          <Divider sx={{ mt: 1 }} />
        </Box>
      ))}
    </Stack>
  );
}

export default PlanCheckerView;
