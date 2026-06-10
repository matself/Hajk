import { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import type { MediaFigureAttrs, MediaType } from "../extensions/media-figure";

interface MediaDialogProps {
  open: boolean;
  initial?: Partial<MediaFigureAttrs>;
  imageList?: string[];
  videoList?: string[];
  audioList?: string[];
  onConfirm: (attrs: MediaFigureAttrs) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const MEDIA_TYPES: MediaType[] = ["image", "video", "audio"];
const POSITIONS = ["left", "center", "right", "floatLeft", "floatRight"] as const;

export function MediaDialog({
  open,
  initial,
  imageList = [],
  videoList = [],
  audioList = [],
  onConfirm,
  onCancel,
  onDelete,
}: MediaDialogProps) {
  const { t } = useTranslation();
  const [mediaType, setMediaType] = useState<MediaType>(
    initial?.mediaType ?? "image"
  );
  const [src, setSrc] = useState(initial?.src ?? "");
  const [alt, setAlt] = useState(initial?.alt ?? "");
  const [width, setWidth] = useState<string>(
    initial?.width != null ? String(initial.width) : ""
  );
  const [height, setHeight] = useState<string>(
    initial?.height != null ? String(initial.height) : ""
  );
  const [caption, setCaption] = useState(initial?.caption ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [popup, setPopup] = useState(initial?.popup ?? false);
  const [position, setPosition] = useState(initial?.position ?? "left");
  // Compute aspect ratio from initial dimensions for locked resizing
  const aspectRatio =
    initial?.width && initial?.height ? initial.width / initial.height : null;

  function handleWidthChange(v: string) {
    setWidth(v);
    if (aspectRatio && v) {
      const w = parseInt(v, 10);
      if (!isNaN(w)) setHeight(String(Math.round(w / aspectRatio)));
    }
  }

  function handleHeightChange(v: string) {
    setHeight(v);
    if (aspectRatio && v) {
      const h = parseInt(v, 10);
      if (!isNaN(h)) setWidth(String(Math.round(h * aspectRatio)));
    }
  }

  function handleConfirm() {
    onConfirm({
      src,
      alt,
      mediaType,
      width: width ? parseInt(width, 10) || null : null,
      height: height ? parseInt(height, 10) || null : null,
      caption,
      source,
      popup,
      position,
    });
  }

  const srcList =
    mediaType === "video"
      ? videoList
      : mediaType === "audio"
      ? audioList
      : imageList;

  const typeLabel = t(`dhRichTextEditor.media.types.${mediaType}`);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>
        {initial?.src
          ? t("dhRichTextEditor.media.editTitle")
          : t("dhRichTextEditor.media.insertTitle")}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <FormControl size="small" fullWidth>
            <Select<MediaType>
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
            >
              {MEDIA_TYPES.map((type) => (
                <MenuItem key={type} value={type}>
                  {t(`dhRichTextEditor.media.types.${type}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            autoFocus
            label={
              mediaType === "audio"
                ? t("dhRichTextEditor.media.audioUrl")
                : t("dhRichTextEditor.media.srcUrl", { type: typeLabel })
            }
            value={src}
            onChange={(e) => setSrc(e.target.value)}
            placeholder={t("dhRichTextEditor.media.uploadPathPlaceholder")}
            size="small"
            fullWidth
            select={srcList.length > 0}
          >
            {srcList.length > 0 &&
              srcList.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
          </TextField>

          {mediaType !== "audio" && (
            <TextField
              label={t("dhRichTextEditor.media.altText")}
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              size="small"
              fullWidth
            />
          )}

          {mediaType !== "audio" && (
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                label={t("dhRichTextEditor.media.width")}
                value={width}
                onChange={(e) => handleWidthChange(e.target.value)}
                type="number"
                size="small"
                sx={{ flex: 1 }}
              />
              <TextField
                label={t("dhRichTextEditor.media.height")}
                value={height}
                onChange={(e) => handleHeightChange(e.target.value)}
                type="number"
                size="small"
                sx={{ flex: 1 }}
              />
            </Box>
          )}

          <TextField
            label={t("dhRichTextEditor.media.caption")}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            size="small"
            fullWidth
          />

          <TextField
            label={t("dhRichTextEditor.media.source")}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            size="small"
            fullWidth
          />

          {mediaType === "image" && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={popup}
                    onChange={(e) => setPopup(e.target.checked)}
                  />
                }
                label={t("dhRichTextEditor.media.openInPopup")}
              />

              <FormControl>
                <FormLabel>
                  <Typography variant="body2">
                    {t("dhRichTextEditor.media.position")}
                  </Typography>
                </FormLabel>
                <RadioGroup
                  row
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                >
                  {POSITIONS.map((val) => (
                    <FormControlLabel
                      key={val}
                      value={val}
                      control={<Radio size="small" />}
                      label={t(`dhRichTextEditor.media.positions.${val}`)}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {onDelete && (
          <Button color="error" onClick={onDelete} sx={{ mr: "auto" }}>
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
