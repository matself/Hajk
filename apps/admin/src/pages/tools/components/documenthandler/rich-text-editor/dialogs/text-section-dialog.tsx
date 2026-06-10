import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import FormColorPicker from "@/components/form-components/form-color-picker";
import type { TextSectionAttrs } from "../extensions/text-section";

interface TextSectionDialogProps {
  open: boolean;
  initial?: Partial<TextSectionAttrs>;
  onConfirm: (attrs: TextSectionAttrs) => void;
  onCancel: () => void;
  onRemove?: () => void;
}

export function TextSectionDialog({
  open,
  initial,
  onConfirm,
  onCancel,
  onRemove,
}: TextSectionDialogProps) {
  const { t } = useTranslation();
  const [backgroundColor, setBackgroundColor] = useState(
    initial?.backgroundColor ?? ""
  );
  const [dividerColor, setDividerColor] = useState(
    initial?.dividerColor ?? ""
  );
  const [isAccordion, setIsAccordion] = useState(
    initial?.isAccordion ?? false
  );
  const [accordionTitle, setAccordionTitle] = useState(
    initial?.accordionTitle ?? ""
  );

  function handleConfirm() {
    onConfirm({ backgroundColor, dividerColor, isAccordion, accordionTitle });
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t("dhRichTextEditor.textSection.title")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Alert severity="warning">
            {t("dhRichTextEditor.textSection.colorWarning")}
          </Alert>

          <FormColorPicker
            label={t("dhRichTextEditor.textSection.backgroundColor")}
            value={backgroundColor}
            onChange={setBackgroundColor}
            placeholder={t(
              "dhRichTextEditor.textSection.backgroundColorPlaceholder"
            )}
          />

          <FormColorPicker
            label={t("dhRichTextEditor.textSection.dividerColor")}
            value={dividerColor}
            onChange={setDividerColor}
            placeholder={t(
              "dhRichTextEditor.textSection.dividerColorPlaceholder"
            )}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={isAccordion}
                onChange={(e) => setIsAccordion(e.target.checked)}
              />
            }
            label={t("dhRichTextEditor.textSection.accordion")}
          />

          <TextField
            label={t("dhRichTextEditor.textSection.accordionTitle")}
            value={accordionTitle}
            onChange={(e) => setAccordionTitle(e.target.value)}
            placeholder={t(
              "dhRichTextEditor.textSection.accordionTitlePlaceholder"
            )}
            size="small"
            fullWidth
            disabled={!isAccordion}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        {onRemove && (
          <Button color="error" onClick={onRemove} sx={{ mr: "auto" }}>
            {t("dhRichTextEditor.textSection.remove")}
          </Button>
        )}
        <Button onClick={onCancel}>{t("common.cancel")}</Button>
        <Button variant="contained" onClick={handleConfirm}>
          {t("common.dialog.okBtn")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
