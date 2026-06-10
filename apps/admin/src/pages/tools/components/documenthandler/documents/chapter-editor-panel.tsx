import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  KeyboardArrowDown as DownIcon,
  KeyboardArrowUp as UpIcon,
} from "@mui/icons-material";
import { useSaveDocument } from "@/api/documents";
import type { Document } from "@/api/documents/types";
import { RichTextEditor } from "@/components/dh-rich-text-editor";

// ─── Chapter type ─────────────────────────────────────────────────────────────

export interface Chapter {
  header: string;
  headerIdentifier: string;
  html: string;
  keywords: unknown[];
  geoObjects: unknown[];
  chapters: Chapter[];
}

function extractChapters(content: Record<string, unknown>): Chapter[] {
  const raw = content.chapters;
  if (!Array.isArray(raw)) return [];
  return raw as Chapter[];
}

function buildId(ch: Chapter, idx: number) {
  return ch.headerIdentifier || `chapter-${idx}`;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ChapterEditorPanelProps {
  document: Document;
  mapName: string;
  folderName: string;
  docName: string;
  /** Called whenever dirty/saving state changes so the dialog can render the Save button */
  onStateChange?: (state: { isDirty: boolean; isPending: boolean }) => void;
  /** Called by the dialog's Save button — triggers the actual save */
  onSaveRef?: React.MutableRefObject<() => void>;
}

export function ChapterEditorPanel({
  document,
  mapName,
  folderName,
  docName,
  onStateChange,
  onSaveRef,
}: ChapterEditorPanelProps) {
  const [chapters, setChapters] = useState<Chapter[]>(() =>
    extractChapters(document.content)
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    chapters.length > 0 ? 0 : null
  );
  const [isDirty, setIsDirty] = useState(false);

  // Per-chapter html drafts (keyed by index) — stored in state so they can be
  // read during render without triggering the react-hooks/refs rule.
  const [htmlDrafts, setHtmlDrafts] = useState<Record<number, string>>({});

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const saveDocMutation = useSaveDocument(mapName, folderName, docName);

  // Expose dirty/pending state to parent dialog
  useEffect(() => {
    onStateChange?.({ isDirty, isPending: saveDocMutation.isPending });
  }, [isDirty, saveDocMutation.isPending, onStateChange]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function mutate(updater: (draft: Chapter[]) => Chapter[]) {
    setChapters((prev) => {
      const next = updater(prev);
      return next;
    });
    setIsDirty(true);
  }

  // ── Chapter HTML changes (from the TipTap editor) ──────────────────────────

  const handleHtmlChange = useCallback(
    (idx: number, html: string) => {
      setHtmlDrafts((prev) => ({ ...prev, [idx]: html }));
      setIsDirty(true);
    },
    []
  );

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave() {
    const final = chapters.map((ch, i) => ({
      ...ch,
      html: htmlDrafts[i] ?? ch.html,
    }));
    saveDocMutation.mutate(
      { content: { ...document.content, chapters: final } },
      {
        onSuccess: () => {
          setIsDirty(false);
          setHtmlDrafts({});
        },
      }
    );
  }

  // Keep the parent dialog's save ref up to date after handleSave is defined
  useEffect(() => { if (onSaveRef) onSaveRef.current = handleSave; });

  // ── Add chapter ───────────────────────────────────────────────────────────

  function handleAdd() {
    if (!addTitle.trim()) return;
    const identifier = addTitle
      .toLowerCase()
      .replace(/[åä]/g, "a")
      .replace(/ö/g, "o")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const newChapter: Chapter = {
      header: addTitle.trim(),
      headerIdentifier: identifier,
      html: "",
      keywords: [],
      geoObjects: [],
      chapters: [],
    };
    mutate((prev) => {
      const next = [...prev, newChapter];
      setSelectedIdx(next.length - 1);
      return next;
    });
    setAddTitle("");
    setAddDialogOpen(false);
  }

  // ── Rename chapter ────────────────────────────────────────────────────────

  function handleRenameOpen() {
    if (selectedIdx === null) return;
    setRenameTitle(chapters[selectedIdx].header);
    setRenameDialogOpen(true);
  }

  function handleRename() {
    if (selectedIdx === null || !renameTitle.trim()) return;
    mutate((prev) =>
      prev.map((ch, i) =>
        i === selectedIdx ? { ...ch, header: renameTitle.trim() } : ch
      )
    );
    setRenameDialogOpen(false);
  }

  // ── Delete chapter ────────────────────────────────────────────────────────

  function handleDeleteConfirm() {
    if (selectedIdx === null) return;
    mutate((prev) => prev.filter((_, i) => i !== selectedIdx));
    setSelectedIdx(
      (prev) => (prev === null ? null : Math.max(0, prev - 1))
    );
    setDeleteDialogOpen(false);
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  function moveChapter(idx: number, direction: "up" | "down") {
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= chapters.length) return;
    mutate((prev) => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
    // Swap html drafts so indices stay consistent after reorder
    setHtmlDrafts((prev) => {
      const idxVal = prev[idx] ?? chapters[idx]?.html ?? "";
      const targetVal = prev[target] ?? chapters[target]?.html ?? "";
      return { ...prev, [idx]: targetVal, [target]: idxVal };
    });
    setSelectedIdx(target);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const selectedChapter = selectedIdx !== null ? chapters[selectedIdx] : null;
  const currentHtml =
    selectedIdx !== null
      ? (htmlDrafts[selectedIdx] ?? selectedChapter?.html ?? "")
      : "";

  return (
    <Box sx={{ display: "flex", height: "100%", gap: 2, overflow: "hidden" }}>
      {/* ── Chapter list panel ── */}
      <Box
        sx={{
          width: 240,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: 1,
            py: 0.5,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            Kapitel
          </Typography>
          <Tooltip title="Lägg till kapitel">
            <IconButton size="small" onClick={() => setAddDialogOpen(true)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {chapters.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Inga kapitel ännu
            </Typography>
          </Box>
        ) : (
          <List dense sx={{ flex: 1, overflow: "auto", p: 0 }}>
            {chapters.map((ch, idx) => (
              <ListItem
                key={buildId(ch, idx)}
                disablePadding
                secondaryAction={
                  <Box sx={{ display: "flex" }}>
                    <Tooltip title="Flytta upp">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => moveChapter(idx, "up")}
                          disabled={idx === 0}
                        >
                          <UpIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Flytta ner">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => moveChapter(idx, "down")}
                          disabled={idx === chapters.length - 1}
                        >
                          <DownIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemButton
                  selected={selectedIdx === idx}
                  onClick={() => setSelectedIdx(idx)}
                  sx={{ pr: 8 }}
                >
                  <ListItemText
                    primary={ch.header || `Kapitel ${idx + 1}`}
                    primaryTypographyProps={{
                      variant: "body2",
                      noWrap: true,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {/* Chapter actions */}
        {selectedIdx !== null && (
          <>
            <Divider />
            <Box
              sx={{
                display: "flex",
                gap: 0.5,
                px: 1,
                py: 0.5,
                bgcolor: "background.paper",
              }}
            >
              <Tooltip title="Byt namn">
                <IconButton size="small" onClick={handleRenameOpen}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Ta bort kapitel">
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </>
        )}
      </Box>

      {/* ── Editor panel ── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {selectedChapter ? (
          <RichTextEditor
            key={selectedIdx ?? 0}
            html={currentHtml}
            onChange={(html) => handleHtmlChange(selectedIdx!, html)}
            mapName={mapName}
          />
        ) : (
          <Alert severity="info">
            {chapters.length === 0
              ? "Lägg till ett kapitel för att börja redigera."
              : "Välj ett kapitel till vänster."}
          </Alert>
        )}
      </Box>

      {/* ── Add dialog ── */}
      <Dialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Nytt kapitel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Kapiteltitel"
            value={addTitle}
            onChange={(e) => setAddTitle(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!addTitle.trim()}
          >
            Lägg till
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Rename dialog ── */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => setRenameDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Byt namn på kapitel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Kapiteltitel"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            size="small"
            fullWidth
            sx={{ mt: 1 }}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDialogOpen(false)}>Avbryt</Button>
          <Button
            variant="contained"
            onClick={handleRename}
            disabled={!renameTitle.trim()}
          >
            Byt namn
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete dialog ── */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
      >
        <DialogTitle>Ta bort kapitel?</DialogTitle>
        <DialogContent>
          <Typography>
            &quot;
            {selectedIdx !== null
              ? chapters[selectedIdx]?.header || `Kapitel ${selectedIdx + 1}`
              : ""}
            &quot; tas bort permanent.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Avbryt</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
          >
            Ta bort
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
