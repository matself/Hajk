import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  FormControlLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { IframeEmbedAttrs } from "../extensions/iframe-embed";

const IFRAME_POSITIONS = ["left", "center", "right"] as const;

export function IframeEmbedView({ node, editor, updateAttributes, deleteNode }: NodeViewProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const attrs = node.attrs as IframeEmbedAttrs;
  const isEditable = editor.isEditable;

  const [src, setSrc] = useState(attrs.src);
  const [title, setTitle] = useState(attrs.title);
  const [width, setWidth] = useState(attrs.width);
  const [height, setHeight] = useState(attrs.height);
  const [position, setPosition] = useState(attrs.position || "left");

  function openDialog() {
    setSrc(attrs.src);
    setTitle(attrs.title);
    setWidth(attrs.width);
    setHeight(attrs.height);
    setPosition(attrs.position || "left");
    setDialogOpen(true);
  }

  function handleConfirm() {
    updateAttributes({ src, title, width, height, position });
    setDialogOpen(false);
  }

  const displayTitle =
    attrs.title || attrs.src || t("dhRichTextEditor.iframe.defaultTitle");
  const iframeWidth = attrs.width ? parseInt(attrs.width, 10) : undefined;
  const iframeHeight = attrs.height ? parseInt(attrs.height, 10) : undefined;

  return (
    <NodeViewWrapper>
      <Box
        contentEditable={false}
        sx={{
          position: "relative",
          ...(isEditable
            ? {
                border: "2px dashed",
                borderColor: "info.light",
                borderRadius: 1,
                "&:hover .iframe-edit-btn": { opacity: 1 },
              }
            : {}),
          overflow: "hidden",
          display: "inline-block",
          maxWidth: iframeWidth ?? "100%",
        }}
      >
        {attrs.src ? (
          <iframe
            src={attrs.src}
            title={attrs.title || t("dhRichTextEditor.iframe.embeddedTitle")}
            width={iframeWidth ?? 600}
            height={iframeHeight ?? 300}
            style={{ display: "block", border: "none" }}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <Box
            sx={{
              p: 2,
              bgcolor: "info.50",
              minWidth: 300,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              🔗 {displayTitle}
            </Typography>
          </Box>
        )}

        {isEditable && (
          <Tooltip title={t("dhRichTextEditor.iframe.edit")}>
            <IconButton
              className="iframe-edit-btn"
              size="small"
              onClick={openDialog}
              sx={{
                position: "absolute",
                top: 2,
                right: 2,
                opacity: 0,
                transition: "opacity 0.15s",
                bgcolor: "background.paper",
                "&:hover": { bgcolor: "background.default" },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {isEditable && (
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
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
          <Button color="error" onClick={() => { deleteNode(); setDialogOpen(false); }} sx={{ mr: "auto" }}>
            {t("common.delete")}
          </Button>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirm} disabled={!src.trim()}>
            {t("common.dialog.okBtn")}
          </Button>
        </DialogActions>
      </Dialog>
      )}
    </NodeViewWrapper>
  );
}
