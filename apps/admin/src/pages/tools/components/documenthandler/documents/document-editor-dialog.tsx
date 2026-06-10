import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Code as CodeIcon,
  Save as SaveIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useDocument, useSaveDocument } from "@/api/documents";
import { ChapterEditorPanel } from "./chapter-editor-panel";

function noop() { /* intentional no-op for initial save ref */ }

// ─── Feature flag ─────────────────────────────────────────────────────────────

/**
 * Set VITE_LEGACY_DOC_EDITOR=1 in .env to fall back to the raw JSON editor.
 * Default: rich-text (TipTap) editor.
 */
const USE_RICH_TEXT_EDITOR =
  import.meta.env.VITE_LEGACY_DOC_EDITOR !== "1";

// ─── Component ────────────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState<"editor" | "source">("editor");

  // State mirrored from ChapterEditorPanel for the Save button in DialogActions
  const [panelDirty, setPanelDirty] = useState(false);
  const [panelPending, setPanelPending] = useState(false);
  const panelSaveRef = useRef<() => void>(noop);

  // ── Document data ──────────────────────────────────────────────────────────
  const [docTitleDraft, setDocTitleDraft] = useState("");

  // Raw JSON fallback state
  const [contentDraft, setContentDraft] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);

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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      lastSyncedDocIdRef.current = undefined;
      setContentDraft("");
      setDocTitleDraft("");
      setContentError(null);
      setTab("editor");
    }
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Raw JSON save (fallback + source tab) ─────────────────────────────────

  function handleRawSave() {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(contentDraft) as Record<string, unknown>;
      setContentError(null);
    } catch {
      setContentError("Ogiltig JSON — rätta syntax och försök igen.");
      return;
    }
    saveDocMutation.mutate({
      title: docTitleDraft || undefined,
      content: parsed,
    });
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const docTitle =
    docTitleDraft !== ""
      ? docTitleDraft
      : (docName ?? t("tools.documenthandler.documents.editDocument"));

  const isRichText = USE_RICH_TEXT_EDITOR;
  const showSourceTab = isRichText; // show "Source" tab alongside the rich editor

  return (
    <Dialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") return;
        onClose();
      }}
      maxWidth="xl"
      fullWidth
      fullScreen
      slotProps={{ paper: { sx: { display: "flex", flexDirection: "column" } } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ flex: 1 }}>{docTitle}</Box>

          {showSourceTab && (
            <Tooltip
              title={
                tab === "editor"
                  ? "Visa rå JSON (källkod)"
                  : "Redigera med rik text"
              }
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={tab === "editor" ? <CodeIcon /> : <EditIcon />}
                onClick={() =>
                  setTab((prev) => (prev === "editor" ? "source" : "editor"))
                }
              >
                {tab === "editor" ? "Källkod" : "Redigera"}
              </Button>
            </Tooltip>
          )}
        </Box>

        {showSourceTab && (
          <Tabs
            value={tab}
            onChange={(_e, v: "editor" | "source") => setTab(v)}
            sx={{ mt: 1 }}
          >
            <Tab label="Redigera" value="editor" />
            <Tab label="JSON-källkod" value="source" />
          </Tabs>
        )}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}
      >
        {docLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 1 }}>
              <TextField
                label={t("tools.documenthandler.documents.documentTitle")}
                value={docTitleDraft}
                onChange={(e) => setDocTitleDraft(e.target.value)}
                size="small"
                sx={{ width: 320 }}
              />
            </Box>

            {/* ── Rich-text editor panel ── */}
            {isRichText && tab === "editor" && activeDocument && (
              <Box sx={{ flex: 1, overflow: "hidden", position: "relative" }}>
                <ChapterEditorPanel
                  document={activeDocument}
                  mapName={mapName}
                  folderName={folderName ?? ""}
                  docName={docName ?? ""}
                  onStateChange={({ isDirty, isPending }) => {
                    setPanelDirty(isDirty);
                    setPanelPending(isPending);
                  }}
                  onSaveRef={panelSaveRef}
                />
              </Box>
            )}

            {/* ── Raw JSON / source tab ── */}
            {(!isRichText || tab === "source") && (
              <Box sx={{ flex: 1, overflow: "auto" }}>
                <Typography variant="caption" color="text.secondary">
                  {t("tools.documenthandler.documents.contentHint")}
                </Typography>
                <TextField
                  multiline
                  minRows={18}
                  maxRows={40}
                  fullWidth
                  value={contentDraft}
                  onChange={(e) => {
                    setContentDraft(e.target.value);
                    setContentError(null);
                  }}
                  error={!!contentError}
                  helperText={contentError}
                  slotProps={{
                    htmlInput: {
                      style: { fontFamily: "monospace", fontSize: 11 },
                    },
                  }}
                  sx={{ mt: 0.5 }}
                />
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {/* Status messages */}
        {(saveDocMutation.isSuccess || saveDocMutation.isError) && (
          <Typography
            variant="body2"
            color={saveDocMutation.isError ? "error" : "success.main"}
            sx={{ mr: "auto", alignSelf: "center", pl: 1 }}
          >
            {saveDocMutation.isError ? t("common.saveFailed") : t("common.saved")}
          </Typography>
        )}

        <Button onClick={onClose}>{t("common.cancel")}</Button>

        {/* Rich-text editor mode: Save button triggers ChapterEditorPanel's save */}
        {isRichText && tab === "editor" && (
          <Button
            variant="contained"
            startIcon={
              panelPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            onClick={() => panelSaveRef.current()}
            disabled={!panelDirty || panelPending || docLoading || !docName}
          >
            {t("common.save")}
          </Button>
        )}

        {/* Raw JSON / source tab mode */}
        {(!isRichText || tab === "source") && (
          <Button
            variant="contained"
            startIcon={
              saveDocMutation.isPending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            onClick={handleRawSave}
            disabled={saveDocMutation.isPending || docLoading || !docName}
          >
            {t("common.save")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
