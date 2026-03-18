import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PdfDownloadList from "./PdfDownloadList";

const PdfDownloadDialog = ({ open, onClose, model, options }) => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (
      open &&
      model &&
      typeof model.getAllDocumentsContainedInMenu === "function"
    ) {
      setLoading(true);
      setError(null);
      model
        .getAllDocumentsContainedInMenu()
        .then((docs) => {
          const pdfDocs = docs.filter((doc) => doc.type === "pdf");
          setPdfFiles(pdfDocs);
        })
        .catch((err) => {
          console.error("Fel vid hämtning av PDF-dokument: ", err);
          setError("Kunde inte hämta PDF-dokument. Försök igen senare.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [open, model]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Ladda ner PDF
        <IconButton
          aria-label="Stäng"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {loading && <CircularProgress />}
        {error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && (
          <PdfDownloadList pdfFiles={pdfFiles} options={options} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfDownloadDialog;
