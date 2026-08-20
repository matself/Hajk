import { useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Collapse,
  Link,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

/**
 * Renders the technical details as a plain key/value list, skipping anything
 * that wasn't relevant to this particular failure. The same text is what the
 * copy button puts on the clipboard, so a user can paste it straight into a
 * support ticket.
 */
function formatDetails(technicalDetails) {
  return Object.entries(technicalDetails)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
    .map(([key, value]) => `${key}: ${value}`);
}

export default function StartupError({
  loadErrorTitle,
  loadErrorMessage,
  actions = [],
  technicalDetails = {},
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const detailRows = formatDetails(technicalDetails);

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(detailRows.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard access can be denied (or missing on insecure origins). The
      // details are visible on screen anyway, so there's nothing to recover.
      setCopied(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        pl: { xs: 2, sm: 10 },
        pr: { xs: 2, sm: 10 },
        py: 6,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 720 }}>
        <Alert severity="error">
          <AlertTitle>{loadErrorTitle}</AlertTitle>
          {loadErrorMessage}
        </Alert>

        {actions.length > 0 && (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            sx={{ mt: 3 }}
          >
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || "outlined"}
                href={action.href}
                onClick={action.onClick}
              >
                {action.text}
              </Button>
            ))}
          </Stack>
        )}

        {detailRows.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Link
              component="button"
              type="button"
              underline="hover"
              onClick={() => setDetailsOpen(!detailsOpen)}
            >
              {detailsOpen
                ? "Dölj teknisk information"
                : "Visa teknisk information"}
            </Link>
            <Collapse in={detailsOpen}>
              <Paper variant="outlined" sx={{ mt: 1, p: 2 }}>
                <Typography
                  component="pre"
                  variant="body2"
                  sx={{
                    m: 0,
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {detailRows.join("\n")}
                </Typography>
                <Button size="small" sx={{ mt: 2 }} onClick={copyDetails}>
                  {copied ? "Kopierat" : "Kopiera"}
                </Button>
              </Paper>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  );
}
