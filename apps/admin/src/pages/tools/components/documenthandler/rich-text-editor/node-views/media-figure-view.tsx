import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, IconButton, Tooltip } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import {
  AudioDialog,
  ImageDialog,
  VideoDialog,
} from "../dialogs/media-dialog";
import type { MediaFigureAttrs } from "../extensions/media-figure";

interface MediaFigureViewProps extends NodeViewProps {
  imageList?: string[];
  videoList?: string[];
  audioList?: string[];
}

const EDIT_TOOLTIP_KEYS = {
  image: "dhRichTextEditor.media.editImage",
  video: "dhRichTextEditor.media.editVideo",
  audio: "dhRichTextEditor.media.editAudio",
} as const;

export function MediaFigureView({
  node,
  updateAttributes,
  deleteNode,
  imageList,
  videoList,
  audioList,
}: MediaFigureViewProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const attrs = node.attrs as MediaFigureAttrs;

  const previewStyle: React.CSSProperties = {
    maxWidth: attrs.width ? `${attrs.width}px` : "100%",
    maxHeight: 300,
    display: "block",
  };

  function handleConfirm(newAttrs: MediaFigureAttrs) {
    updateAttributes(newAttrs);
    setDialogOpen(false);
  }

  const dialogProps = {
    open: dialogOpen,
    initial: attrs,
    onConfirm: handleConfirm,
    onCancel: () => setDialogOpen(false),
    onDelete: () => {
      deleteNode();
      setDialogOpen(false);
    },
  };

  return (
    <NodeViewWrapper>
      <Box
        component="figure"
        contentEditable={false}
        sx={{
          display: "inline-block",
          position: "relative",
          border: "2px dashed",
          borderColor: "divider",
          borderRadius: 1,
          p: 0.5,
          m: 0,
          "&:hover .media-edit-btn": { opacity: 1 },
        }}
      >
        {attrs.mediaType === "audio" ? (
          <Box
            sx={{
              p: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
              minWidth: 180,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            🔊{" "}
            <span style={{ fontSize: 12, color: "#666", wordBreak: "break-all" }}>
              {attrs.src || t("dhRichTextEditor.media.audioPlaceholder")}
            </span>
          </Box>
        ) : (
          <img
            src={attrs.src || "data:,"}
            alt={attrs.alt}
            style={previewStyle}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}

        {attrs.caption && (
          <Box
            component="figcaption"
            sx={{ fontSize: 11, color: "text.secondary", px: 0.5 }}
          >
            {attrs.caption}
          </Box>
        )}

        <Tooltip title={t(EDIT_TOOLTIP_KEYS[attrs.mediaType])}>
          <IconButton
            className="media-edit-btn"
            size="small"
            onClick={() => setDialogOpen(true)}
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
      </Box>

      {attrs.mediaType === "image" && (
        <ImageDialog {...dialogProps} srcList={imageList} />
      )}
      {attrs.mediaType === "video" && (
        <VideoDialog {...dialogProps} srcList={videoList} />
      )}
      {attrs.mediaType === "audio" && (
        <AudioDialog {...dialogProps} srcList={audioList} />
      )}
    </NodeViewWrapper>
  );
}
