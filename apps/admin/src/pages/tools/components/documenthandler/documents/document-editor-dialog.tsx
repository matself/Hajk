import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useDocument, useSaveDocument } from "@/api/documents";
import type { Document } from "@/api/documents/types";
import {
  CHAPTER_PANEL_WIDTH,
  ChapterEditorPanel,
} from "./chapter-editor-panel";
import { DocumentViewPanel } from "./document-view-panel";

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
  const [tab, setTab] = useState<"editor" | "view" | "source">("editor");
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [draftDocument, setDraftDocument] = useState<Document | null>(null);
  const getDraftRef = useRef<() => Document>(() => null as unknown as Document);

  // State mirrored from ChapterEditorPanel for the Save button in DialogActions
  const [panelDirty, setPanelDirty] = useState(false);
  const [panelPending, setPanelPending] = useState(false);
  const panelSaveRef = useRef<() => void>(noop);

  // ── Document data ──────────────────────────────────────────────────────────
  const [docTitleDraft, setDocTitleDraft] = useState("");

  // Raw JSON fallback state
  const [contentDraft, setContentDraft] = useState("");
  const [contentError, setContentError] = useState<string | null>(null);

  // Saved baseline for dirty detection (not updated on query refetch)
  const [savedTitle, setSavedTitle] = useState("");
  const [savedContentJson, setSavedContentJson] = useState("");

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
      const title = activeDocument.title ?? "";
      const contentJson = JSON.stringify(activeDocument.content, null, 2);
      setDocTitleDraft(title);
      setContentDraft(contentJson);
      setSavedTitle(title);
      setSavedContentJson(contentJson);
      setContentError(null);
    }
  }, [activeDocument]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) {
      lastSyncedDocIdRef.current = undefined;
      setContentDraft("");
      setDocTitleDraft("");
      setSavedTitle("");
      setSavedContentJson("");
      setContentError(null);
      setTab("editor");
      setConfirmCloseOpen(false);
      setDraftDocument(null);
      getDraftRef.current = () => null as unknown as Document;
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
      setContentError(t("tools.documenthandler.documents.invalidJson"));
      return;
    }
    saveDocMutation.mutate(
      {
        title: docTitleDraft || undefined,
        content: parsed,
      },
      {
        onSuccess: () => {
          setSavedTitle(docTitleDraft);
          setSavedContentJson(contentDraft);
          setPanelDirty(false);
        },
      }
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const docTitle =
    docTitleDraft !== ""
      ? docTitleDraft
      : (docName ?? t("tools.documenthandler.documents.editDocument"));

  const isRichText = USE_RICH_TEXT_EDITOR;
  const showSourceTab = isRichText; // show "Source" tab alongside the rich editor

  const titleChanged = docTitleDraft !== savedTitle;
  const contentChanged = contentDraft !== savedContentJson;
  const sourceTabDirty = titleChanged || contentChanged;
  const editorTabDirty = titleChanged || panelDirty;
  const isDirty = isRichText
    ? tab === "source"
      ? sourceTabDirty
      : editorTabDirty
    : sourceTabDirty;

  function requestClose() {
    if (isDirty) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  }

  function handleConfirmDiscard() {
    setConfirmCloseOpen(false);
    onClose();
  }

  return (
    <>
      <Dialog
        open={open}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          requestClose();
        }}
        maxWidth="xl"
        fullWidth
        fullScreen
        slotProps={{ paper: { sx: { display: "flex", flexDirection: "column", position: "relative" } } }}
      >
        <Tooltip title={t("common.cancel")}>
          <IconButton
            onClick={requestClose}
            aria-label={t("common.cancel")}
            size="small"
            sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            maxWidth: 1440,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <DialogTitle sx={{ pb: showSourceTab ? 0 : undefined, pr: 6, fontWeight: "bold" }}>
            {docTitle}
          </DialogTitle>

          {showSourceTab && (
            <Tabs
              value={tab}
              onChange={(_e, v: "editor" | "view" | "source") => {
                if (v === "view") setDraftDocument(getDraftRef.current());
                setTab(v);
              }}
              sx={{ px: 3 }}
            >
              <Tab label={t("tools.documenthandler.documents.editorTab")} value="editor" />
              <Tab label={t("tools.documenthandler.documents.viewTab")} value="view" />
              <Tab label={t("tools.documenthandler.documents.sourceTab")} value="source" />
            </Tabs>
          )}

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
                {/* ── View panel ── */}
                {isRichText && tab === "view" && activeDocument && (
                  <Box sx={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                    <DocumentViewPanel
                      document={draftDocument ?? activeDocument}
                      mapName={mapName}
                    />
                  </Box>
                )}

                {/* ── Rich-text editor panel (kept mounted to preserve unsaved edits) ── */}
                {isRichText && activeDocument && (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      minWidth: 0,
                      position: "relative",
                      display: tab === "editor" ? "flex" : "none",
                    }}
                  >
                    <ChapterEditorPanel
                      key={activeDocument.id}
                      document={activeDocument}
                      mapName={mapName}
                      folderName={folderName ?? ""}
                      docName={docName ?? ""}
                      docTitle={docTitleDraft}
                      onDocTitleChange={setDocTitleDraft}
                      onStateChange={({ isDirty, isPending }) => {
                        setPanelDirty(isDirty);
                        setPanelPending(isPending);
                      }}
                      onSaveRef={panelSaveRef}
                      onSaveSuccess={() => setSavedTitle(docTitleDraft)}
                      getDraftRef={getDraftRef}
                    />
                  </Box>
                )}

                {/* ── Raw JSON / source tab ── */}
                {(!isRichText || tab === "source") && (
                  <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                    {!isRichText && (
                      <TextField
                        label={t("tools.documenthandler.documents.documentTitle")}
                        value={docTitleDraft}
                        onChange={(e) => setDocTitleDraft(e.target.value)}
                        size="small"
                        fullWidth
                        sx={{ mb: 1, maxWidth: CHAPTER_PANEL_WIDTH, flexShrink: 0 }}
                      />
                    )}
                    <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                      {t("tools.documenthandler.documents.contentHint")}
                    </Typography>
                    <Box
                      sx={{
                        mt: 0.5,
                        flex: 1,
                        minHeight: 0,
                        border: "1px solid",
                        borderColor: contentError ? "error.main" : "divider",
                        borderRadius: 1,
                        overflow: "hidden",
                        display: "flex",
                        "&:focus-within": { borderColor: "primary.main", borderWidth: 2 },
                      }}
                    >
                      <Box
                        component="textarea"
                        value={contentDraft}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                          setContentDraft(e.target.value);
                          setContentError(null);
                        }}
                        spellCheck={false}
                        sx={{
                          flex: 1,
                          fontFamily: "monospace",
                          fontSize: 11,
                          border: "none",
                          outline: "none",
                          resize: "none",
                          p: 1,
                          overflow: "auto",
                          bgcolor: "background.paper",
                          color: "text.primary",
                        }}
                      />
                    </Box>
                    {contentError && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                        {contentError}
                      </Typography>
                    )}
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

            <Button onClick={requestClose}>{t("common.cancel")}</Button>

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
                disabled={
                  !editorTabDirty ||
                  panelPending ||
                  docLoading ||
                  !docName
                }
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
                disabled={
                  !sourceTabDirty ||
                  saveDocMutation.isPending ||
                  docLoading ||
                  !docName
                }
              >
                {t("common.save")}
              </Button>
            )}
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog
        open={confirmCloseOpen}
        onClose={() => setConfirmCloseOpen(false)}
        aria-labelledby="unsaved-changes-dialog-title"
        aria-describedby="unsaved-changes-dialog-description"
      >
        <DialogTitle id="unsaved-changes-dialog-title">
          {t("tools.documenthandler.documents.unsavedChangesTitle")}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="unsaved-changes-dialog-description">
            {t("tools.documenthandler.documents.unsavedChangesMessage")}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setConfirmCloseOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDiscard}>
            {t("tools.documenthandler.documents.discardChanges")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
