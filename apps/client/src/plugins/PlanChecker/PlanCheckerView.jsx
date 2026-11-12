import React from "react";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";

import PlanCheckerPlan from "./PlanCheckerPlan";

/**
 * @summary Shows the detaljplan regulations that apply at the clicked point,
 * with the rest of each plan one fold away. See PlanCheckerPlan for the layout.
 */
function PlanCheckerView({ localObserver, model, layerStatus, wmsLayerId }) {
  const [plans, setPlans] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [selectedKey, setSelectedKey] = React.useState(null);

  // Clicking the selected item again lets go of it and returns to marking what
  // applies at the clicked point.
  const onSelect = (ids, key) => {
    if (key === selectedKey) {
      setSelectedKey(null);
      model.showAtPoint();
    } else {
      setSelectedKey(key);
      model.highlightRegulations(ids);
    }
  };

  React.useEffect(() => {
    localObserver.subscribe("planChecker.loading", setLoading);
    localObserver.subscribe("planChecker.error", (message) => {
      setError(message);
      setPlans(null);
    });
    localObserver.subscribe("planChecker.result", ({ plans }) => {
      setError(null);
      setSelectedKey(null);
      setPlans(plans);
    });
    localObserver.subscribe("planChecker.reset", () => {
      setPlans(null);
      setError(null);
      setLoading(false);
      setSelectedKey(null);
    });
    return () => {
      localObserver.unsubscribe("planChecker.loading");
      localObserver.unsubscribe("planChecker.error");
      localObserver.unsubscribe("planChecker.result");
      localObserver.unsubscribe("planChecker.reset");
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

      <Typography variant="caption" color="text.secondary">
        Klicka på en bestämmelse för att se var den gäller i kartan. Texterna är
        lästa ur Lantmäteriets sökkatalog (referensobjekt); syfte, beslut och
        kopplingen mellan bestämmelser ur planens domänobjekt. Rättsligt
        bindande är plandokumenten.
      </Typography>

      {plans.map((plan) => (
        <PlanCheckerPlan
          key={plan.key}
          plan={plan}
          selectedKey={selectedKey}
          onSelect={onSelect}
        />
      ))}
    </Stack>
  );
}

export default PlanCheckerView;
