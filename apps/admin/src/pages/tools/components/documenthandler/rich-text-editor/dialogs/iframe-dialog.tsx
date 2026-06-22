import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { IframeEmbedAttrs } from "../extensions/iframe-embed";

interface IframeDialogProps {
  open: boolean;
  initial?: Partial<IframeEmbedAttrs>;
  onConfirm: (attrs: IframeEmbedAttrs) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const IFRAME_POSITIONS = ["left", "center", "right"] as const;

export function IframeDialog({
  open,
  initial,
  onConfirm,
  onCancel,
  onDelete,
}: IframeDialogProps) {
  const { t } = useTranslation();

  const [src, setSrc] = useState(initial?.src ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [width, setWidth] = useState(initial?.width ?? "");
  const [height, setHeight] = useState(initial?.height ?? "");
  const [position, setPosition] = useState(initial?.position ?? "left");

  // Sync state when the dialog transitions from closed → open.
  // Storing previous prop in state and calling setState during render is the
  // React-recommended pattern for deriving state from previous prop values:
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSrc(initial?.src ?? "");
      setTitle(initial?.title ?? "");
      setWidth(initial?.width ?? "");
      setHeight(initial?.height ?? "");
      setPosition(initial?.position ?? "left");
    }
  }

  function handleConfirm() {
    onConfirm({ src, title, width, height, position });
  }

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{t("dhRichTextEditor.iframe.title")}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            autoFocus
            label={t("dhRichTextEditor.iframe.src")}
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder={t("dhRichTextEditor.link.urlPlaceholder")}
            size="small"
            fullWidth
          />
          <TextField
            label={t("dhRichTextEditor.iframe.iframeTitle")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label={t("dhRichTextEditor.iframe.width")}
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              type="number"
              size="small"
              sx={{ flex: 1 }}
              helperText={t("dhRichTextEditor.iframe.withoutPx")}
            />
            <TextField
              label={t("dhRichTextEditor.iframe.height")}
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              type="number"
              size="small"
              sx={{ flex: 1 }}
              helperText={t("dhRichTextEditor.iframe.withoutPx")}
            />
          </Box>
          <FormControl>
            <FormLabel>
              <Typography variant="body2">
                {t("dhRichTextEditor.iframe.position")}
              </Typography>
            </FormLabel>
            <RadioGroup
              row
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              {IFRAME_POSITIONS.map((val) => (
                <FormControlLabel
                  key={val}
                  value={val}
                  control={<Radio size="small" />}
                  label={t(`dhRichTextEditor.iframe.positions.${val}`)}
                />
              ))}
            </RadioGroup>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <Button
            color="error"
            onClick={onDelete}
            sx={{ mr: "auto" }}
          >
            {t("common.delete")}
          </Button>
        )}
        <Button onClick={onCancel}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!src.trim()}
        >
          {t("common.dialog.okBtn")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
