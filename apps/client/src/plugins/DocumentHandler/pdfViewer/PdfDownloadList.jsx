import { useState, useMemo, useCallback } from "react";
import { PDFDocument } from "pdf-lib";
import {
  Box,
  TextField,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Button,
  Typography,
  Alert,
} from "@mui/material";

function ToolButton({ label, onClick, disabled }) {
  return (
    <Button variant="text" onClick={onClick} disabled={disabled} sx={{ mr: 1 }}>
      <Typography fontWeight="bold" textTransform="none">
        {label}
      </Typography>
    </Button>
  );
}

const PdfDownloadList = ({ pdfFiles = [], options = {} }) => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [mergeError, setMergeError] = useState(null);

  // Build lookup: documentFileName → menu item display title.
  // Flattens nested menus so sub-menu documents are included.
  const menuLookup = useMemo(() => {
    const flatten = (items) =>
      items.flatMap((m) => [m, ...(m.menu?.length ? flatten(m.menu) : [])]);
    const lookup = {};
    flatten(options?.menuConfig?.menu ?? []).forEach((m) => {
      if (m.document) lookup[m.document] = m.title;
    });
    return lookup;
  }, [options]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return pdfFiles;
    return pdfFiles.filter((f) => {
      const titleMatch = f.documentTitle.toLowerCase().includes(term);
      const menuMatch = (
        menuLookup[f.documentFileName]?.toLowerCase() || ""
      ).includes(term);
      return titleMatch || menuMatch;
    });
  }, [pdfFiles, search, menuLookup]);

  const toggleOne = useCallback((fileName) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fileName)) {
        next.delete(fileName);
      } else {
        next.add(fileName);
      }
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected(
      (prev) => new Set([...prev, ...filtered.map((f) => f.documentFileName)])
    );
  }, [filtered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const downloadSelected = useCallback(() => {
    pdfFiles.forEach((file) => {
      if (selected.has(file.documentFileName)) {
        const url = URL.createObjectURL(file.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.documentFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  }, [pdfFiles, selected]);

  const downloadMerged = useCallback(async () => {
    if (selected.size === 0) return;
    setMergeError(null);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of pdfFiles) {
        if (selected.has(file.documentFileName)) {
          const srcBytes = await file.blob.arrayBuffer();
          const srcPdf = await PDFDocument.load(srcBytes);
          const pages = await mergedPdf.copyPages(
            srcPdf,
            srcPdf.getPageIndices()
          );
          pages.forEach((p) => mergedPdf.addPage(p));
        }
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "sammanfogad.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Fel vid sammanslagning av PDF-filer:", err);
      setMergeError(
        "Kunde inte slå samman PDF-filerna. Kontrollera att alla valda filer är giltiga."
      );
    }
  }, [pdfFiles, selected]);

  return (
    <Box>
      <TextField
        size="small"
        placeholder="Sök…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      />

      <Box sx={{ mb: 2 }}>
        <ToolButton
          label="Välj alla"
          onClick={selectAllFiltered}
          disabled={filtered.length === 0}
        />
        <ToolButton
          label="Rensa val"
          onClick={clearSelection}
          disabled={selected.size === 0}
        />
      </Box>

      <List dense>
        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            Inga filer matchar sökningen.
          </Typography>
        )}
        {filtered.map((file) => (
          <ListItem
            key={file.documentFileName}
            disableGutters
            dense
            sx={{ py: 0 }}
          >
            <Checkbox
              edge="start"
              checked={selected.has(file.documentFileName)}
              onChange={() => toggleOne(file.documentFileName)}
              sx={{ mr: 1 }}
            />
            <ListItemText
              primary={`${file.documentTitle}${menuLookup[file.documentFileName] ? ` (${menuLookup[file.documentFileName]})` : ""}`}
            />
          </ListItem>
        ))}
      </List>

      {mergeError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {mergeError}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={downloadSelected}
        disabled={selected.size === 0}
        sx={{ mt: 2 }}
      >
        Ladda ner markerade filer
      </Button>
      <Button
        variant="outlined"
        onClick={downloadMerged}
        disabled={selected.size === 0}
        sx={{ mt: 2 }}
      >
        Ladda ner som sammanslagen PDF
      </Button>
    </Box>
  );
};

export default PdfDownloadList;
