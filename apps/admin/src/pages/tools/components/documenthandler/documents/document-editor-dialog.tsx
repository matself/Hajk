import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { Save as SaveIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useDocument, useSaveDocument } from "@/api/documents";

interface DocumentEditorDialogProps {
  open: boolean;
  mapName: string;
  folderName?: string;
  docName?: string;
  onClose: () => void;
}

export function DocumentEditorDialog({
  open,
  mapName,
  folderName,
  docName,
  onClose,
}: DocumentEditorDialogProps) {
  const { t } = useTranslation();

  const [contentDraft, setContentDraft] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);
  const [docTitleDraft, setDocTitleDraft] = useState("");

  const { data: activeDocument, isLoading: docLoading } = useDocument(
    mapName,
    folderName,
    docName
  );

  const saveDocMutation = useSaveDocument(
    mapName,
    folderName ?? "",
    docName ?? ""
  );

  const lastSyncedDocIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (activeDocument && activeDocument.id !== lastSyncedDocIdRef.current) {
      lastSyncedDocIdRef.current = activeDocument.id;
      setDocTitleDraft(activeDocument.title);
      setContentDraft(JSON.stringify(activeDocument.content, null, 2));
      setContentError(null);
    }
  }, [activeDocument]);

  // Reset drafts when the dialog closes so stale data doesn't show on next open
  useEffect(() => {
    if (!open) {
      lastSyncedDocIdRef.current = undefined;
      setContentDraft("");
      setDocTitleDraft("");
      setContentError(null);
    }
  }, [open]);

  function handleSave() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(contentDraft) as Record<string, unknown>;
      setContentError(null);
    } catch {
      setContentError("Invalid JSON — please correct syntax before saving.");
      return;
    }
    saveDocMutation.mutate({
      title: docTitleDraft || undefined,
      content: parsed,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        {docTitleDraft !== ""
          ? docTitleDraft
          : (docName ??
            t("tools.documenthandler.documents.editDocument"))}
      </DialogTitle>

      <DialogContent>
        {docLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <TextField
              label={t("tools.documenthandler.documents.documentTitle")}
              value={docTitleDraft}
              onChange={(e) => setDocTitleDraft(e.target.value)}
              size="small"
              fullWidth
            />

            <Box>
              <Typography variant="caption" color="text.secondary">
                {t("tools.documenthandler.documents.contentHint")}
              </Typography>
              <TextField
                multiline
                minRows={14}
                maxRows={30}
                fullWidth
                value={contentDraft}
                onChange={(e) => {
                  setContentDraft(e.target.value);
                  setContentError(null);
                }}
                error={!!contentError}
                helperText={contentError}
                inputProps={{ style: { fontFamily: "monospace", fontSize: 12 } }}
                sx={{ mt: 0.5 }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {saveDocMutation.isSuccess && (
          <Typography
            variant="body2"
            color="success.main"
            sx={{ mr: "auto", alignSelf: "center", pl: 1 }}
          >
            {t("common.saved")}
          </Typography>
        )}
        {saveDocMutation.isError && (
          <Typography
            variant="body2"
            color="error"
            sx={{ mr: "auto", alignSelf: "center", pl: 1 }}
          >
            {t("common.saveFailed")}
          </Typography>
        )}
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          startIcon={
            saveDocMutation.isPending ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          onClick={handleSave}
          disabled={saveDocMutation.isPending || docLoading || !docName}
        >
          {t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
