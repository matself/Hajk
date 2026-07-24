import React from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

import type { MailFormViewProps } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const stripPluginParam = (url: string): string => {
  const urlObj = new URL(url, window.location.origin);
  urlObj.searchParams.delete("p");
  return urlObj.toString().replace(window.location.origin, "");
};

const MailFormView: React.FC<MailFormViewProps> = ({ app, options }) => {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [mapLink, setMapLink] = React.useState("");
  const [emailTouched, setEmailTouched] = React.useState(false);

  // Fetch the current map link on mount, then keep it fresh whenever the
  // map view/layers change - same event Anchor ("Dela") listens to.
  // Strip the p= parameter so opening the link doesn't re-activate MailForm.
  React.useEffect(() => {
    let cancelled = false;

    app.anchorModel.getAnchor().then((url) => {
      if (!cancelled) {
        setMapLink(stripPluginParam(url));
      }
    });

    const subscription = app.globalObserver.subscribe(
      "core.mapUpdated",
      ({ url }: { url: string }) => {
        setMapLink(stripPluginParam(url));
      }
    );

    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [app]);

  const emailIsValid = EMAIL_REGEX.test(email.trim());
  const canSubmit = emailIsValid && message.trim().length > 0 && mapLink !== "";

  const mailtoHref = React.useMemo(() => {
    if (!canSubmit) {
      return undefined;
    }

    const subject = options.subject || "Synpunkt från kartan";
    const body = [
      message.trim(),
      "",
      `Från: ${email.trim()}`,
      `Kartlänk: ${mapLink}`,
    ].join("\n");

    const params = new URLSearchParams({ subject, body });
    // URLSearchParams encodes spaces as "+", mailto links expect "%20".
    return `mailto:${options.recipientEmail}?${params
      .toString()
      .replace(/\+/g, "%20")}`;
  }, [
    canSubmit,
    options.subject,
    options.recipientEmail,
    message,
    email,
    mapLink,
  ]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {options.instructions && (
        <Alert severity="info">{options.instructions}</Alert>
      )}
      <TextField
        label="Din e-postadress"
        type="email"
        required
        fullWidth
        size="small"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setEmailTouched(true)}
        error={emailTouched && !emailIsValid}
        helperText={
          emailTouched && !emailIsValid ? "Ange en giltig e-postadress" : " "
        }
      />
      <TextField
        label="Länk till aktuell vy"
        fullWidth
        size="small"
        value={mapLink}
        slotProps={{ input: { readOnly: true } }}
        helperText="Skickas med automatiskt så att mottagaren kan se vad du ser"
      />
      <TextField
        label="Din synpunkt"
        required
        multiline
        minRows={4}
        fullWidth
        size="small"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        variant="contained"
        color="primary"
        fullWidth
        startIcon={<SendIcon />}
        component="a"
        href={mailtoHref}
        disabled={!canSubmit}
      >
        Skicka som e-post
      </Button>
      <Typography variant="caption" color="textSecondary">
        Öppnar ditt e-postprogram med ett färdigifyllt meddelande. Du skickar
        det själv därifrån.
      </Typography>
    </Box>
  );
};

export default MailFormView;
