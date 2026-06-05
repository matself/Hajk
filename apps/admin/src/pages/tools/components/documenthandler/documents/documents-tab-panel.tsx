import React from "react";
import { Box, Typography, Alert } from "@mui/material";
import { Description as DocumentIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";

/**
 * TODO: Replace the placeholder content below with the real document editor.
 * This is where the equivalent of the legacy documenteditor.jsx will live.
 * Track as a follow-up issue.
 */

interface DocumentsTabPanelProps {
  documentId?: string;
}

export function DocumentsTabPanel({ documentId }: DocumentsTabPanelProps) {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <DocumentIcon color="action" />
        <Typography variant="h6">
          {t("tools.documenthandler.documents.title")}
        </Typography>
      </Box>

      {!documentId ? (
        <Alert severity="info">
          {t("tools.documenthandler.documents.noDocumentSelected")}
        </Alert>
      ) : (
        <Alert severity="info">
          {t("tools.documenthandler.documents.openedDocumentDummy", {
            id: documentId,
          })}
        </Alert>
      )}
    </Box>
  );
}
