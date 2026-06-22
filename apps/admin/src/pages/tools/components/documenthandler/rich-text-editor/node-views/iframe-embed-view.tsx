import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { Edit as EditIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { IframeEmbedAttrs } from "../extensions/iframe-embed";
import { IframeDialog } from "../dialogs/iframe-dialog";

export function IframeEmbedView({ node, editor, updateAttributes, deleteNode }: NodeViewProps) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const attrs = node.attrs as IframeEmbedAttrs;
  const isEditable = editor.isEditable;

  function handleConfirm(newAttrs: IframeEmbedAttrs) {
    updateAttributes(newAttrs);
    setDialogOpen(false);
  }

  function handleDelete() {
    deleteNode();
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
        )}
      </Box>

      {isEditable && (
        <IframeDialog
          open={dialogOpen}
          initial={attrs}
          onConfirm={handleConfirm}
          onCancel={() => setDialogOpen(false)}
          onDelete={handleDelete}
        />
      )}
    </NodeViewWrapper>
  );
}
