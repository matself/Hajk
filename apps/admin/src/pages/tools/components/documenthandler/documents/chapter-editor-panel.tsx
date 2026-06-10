import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useSaveDocument } from "@/api/documents";
import type { Document } from "@/api/documents/types";
import { RichTextEditor } from "../rich-text-editor";
import { ChapterTree } from "./chapter-tree";
import {
  addChildNode,
  createChapterNode,
  findNodeById,
  fromChapterTree,
  removeNodeById,
  toChapterTree,
  updateNodeById,
  type ChapterTreeNode,
} from "./chapter-tree-utils";

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

const CHAPTER_PANEL_WIDTH = 340;

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
  const initialTree = toChapterTree(extractChapters(document.content));
  const [tree, setTree] = useState<ChapterTreeNode[]>(initialTree);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialTree.length > 0 ? initialTree[0].id : null
  );
  const [isDirty, setIsDirty] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const saveDocMutation = useSaveDocument(mapName, folderName, docName);

  // Expose dirty/pending state to parent dialog
  useEffect(() => {
    onStateChange?.({ isDirty, isPending: saveDocMutation.isPending });
  }, [isDirty, saveDocMutation.isPending, onStateChange]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function mutate(updater: (draft: ChapterTreeNode[]) => ChapterTreeNode[]) {
    setTree((prev) => updater(prev));
    setIsDirty(true);
  }

  // ── Chapter HTML changes (from the TipTap editor) ──────────────────────────

  const handleHtmlChange = useCallback((id: string, html: string) => {
    setTree((prev) =>
      updateNodeById(prev, id, (node) => ({
        ...node,
        data: { ...node.data, html },
      }))
    );
    setIsDirty(true);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────────

  function handleSave() {
    const final = fromChapterTree(tree);
    saveDocMutation.mutate(
      { content: { ...document.content, chapters: final } },
      {
        onSuccess: () => {
          setIsDirty(false);
        },
      }
    );
  }

  // Keep the parent dialog's save ref up to date after handleSave is defined
  useEffect(() => {
    if (onSaveRef) onSaveRef.current = handleSave;
  });

  // ── Add chapter ───────────────────────────────────────────────────────────

  function openAddDialog(parentId: string | null) {
    setAddParentId(parentId);
    setAddTitle("");
    setAddDialogOpen(true);
  }

  function handleAdd() {
    if (!addTitle.trim()) return;
    const newNode = createChapterNode(addTitle);
    mutate((prev) => addChildNode(prev, addParentId, newNode));
    setSelectedId(newNode.id);
    setAddTitle("");
    setAddDialogOpen(false);
  }

  // ── Rename chapter ────────────────────────────────────────────────────────

  function handleRenameOpen(id: string) {
    const node = findNodeById(tree, id);
    if (!node) return;
    setRenameTargetId(id);
    setRenameTitle(node.data.header);
    setRenameDialogOpen(true);
  }

  function handleRename() {
    if (!renameTargetId || !renameTitle.trim()) return;
    mutate((prev) =>
      updateNodeById(prev, renameTargetId, (node) => ({
        ...node,
        data: { ...node.data, header: renameTitle.trim() },
      }))
    );
    setRenameDialogOpen(false);
  }

  // ── Delete chapter ────────────────────────────────────────────────────────

  function handleDeleteOpen(id: string) {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  }

  function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    mutate((prev) => removeNodeById(prev, deleteTargetId));
    setSelectedId((prev) => (prev === deleteTargetId ? null : prev));
    setDeleteDialogOpen(false);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const selectedChapter = selectedId ? findNodeById(tree, selectedId) : null;
  const deleteTarget = deleteTargetId
    ? findNodeById(tree, deleteTargetId)
    : null;

  return (
    <Box sx={{ display: "flex", height: "100%", gap: 2, overflow: "hidden" }}>
      {/* ── Chapter tree panel ── */}
      <Box
        sx={{
          width: CHAPTER_PANEL_WIDTH,
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
            <IconButton size="small" onClick={() => openAddDialog(null)}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {tree.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Inga kapitel ännu
            </Typography>
          </Box>
        ) : (
          <ChapterTree
            data={tree}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(next) => {
              setTree(next);
              setIsDirty(true);
            }}
            onAddChild={(parentId) => openAddDialog(parentId)}
            onRename={handleRenameOpen}
            onDelete={handleDeleteOpen}
          />
        )}
      </Box>

      {/* ── Editor panel ── */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}
      >
        {selectedChapter ? (
          <RichTextEditor
            key={selectedId ?? "none"}
            html={selectedChapter.data.html}
            onChange={(html) => handleHtmlChange(selectedId!, html)}
            mapName={mapName}
          />
        ) : (
          <Alert severity="info">
            {tree.length === 0
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
        <DialogTitle>
          {addParentId ? "Nytt underkapitel" : "Nytt kapitel"}
        </DialogTitle>
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
            &quot;{deleteTarget?.data.header ?? "Namnlöst kapitel"}&quot; och
            eventuella underkapitel tas bort permanent.
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
