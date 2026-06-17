import React from "react";
import type { NodeRendererProps } from "react-arborist";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import {
  Delete as DeleteIcon,
  Description as DocumentIcon,
  Folder as FolderIcon,
  Edit as EditIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import type { DocTreeNode } from "./types.ts";

interface DocumentsTreeNodeProps extends NodeRendererProps<DocTreeNode> {
  selectedDocId: string | null;
  selectedNodeId: string | null;
  activeFolderName: string | null;
  onOpenDocument: (folderName: string, docName: string) => void;
  onDeleteFolder: (folderName: string) => void;
  onDeleteDocument: (folderName: string, docName: string) => void;
}

export const DocumentsTreeNode = React.forwardRef<
  HTMLDivElement,
  DocumentsTreeNodeProps
>(function DocumentsTreeNode(
  {
    style,
    node,
    dragHandle,
    selectedDocId,
    selectedNodeId,
    activeFolderName,
    onOpenDocument,
    onDeleteFolder,
    onDeleteDocument,
  },
  ref
) {
  const { t } = useTranslation();
  const { kind, name, title, folderName, docCount } = node.data;
  const isFolder = kind === "folder";
  const isSelectedDoc = !isFolder && node.id === selectedDocId;
  const isSelectedNode = node.id === selectedNodeId;
  const isActiveFolder = isFolder && name === activeFolderName;
  const isHighlighted = isSelectedDoc || isSelectedNode;

  function handleRowClick() {
    node.select();
    if (isFolder) {
      node.toggle();
    }
  }

  function handleOpenDocument(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isFolder && folderName) {
      onOpenDocument(folderName, name);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (isFolder) {
      onDeleteFolder(name);
    } else if (folderName) {
      onDeleteDocument(folderName, name);
    }
  }

  const canDeleteFolder = isFolder && (docCount ?? 0) === 0;

  return (
    <Box
      ref={ref}
      style={style}
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        cursor: "pointer",
        backgroundColor: isHighlighted
          ? theme.palette.action.selected
          : "transparent",
        "&:hover": {
          backgroundColor: isHighlighted
            ? theme.palette.action.selected
            : theme.palette.action.hover,
          "& .doc-tree-actions": { opacity: 1 },
        },
      })}
      onClick={handleRowClick}
    >
      {/* Drag handle (only for documents, folders are not draggable) */}
      <Box
        ref={isFolder ? undefined : dragHandle}
        sx={{
          cursor: isFolder ? "default" : "grab",
          display: "flex",
          color: "text.disabled",
          flexShrink: 0,
          width: 20,
          justifyContent: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isFolder && (
          <svg
            width="10"
            height="16"
            viewBox="0 0 10 16"
            fill="currentColor"
            style={{ opacity: 0.4 }}
          >
            <circle cx="3" cy="3" r="1.5" />
            <circle cx="7" cy="3" r="1.5" />
            <circle cx="3" cy="8" r="1.5" />
            <circle cx="7" cy="8" r="1.5" />
            <circle cx="3" cy="13" r="1.5" />
            <circle cx="7" cy="13" r="1.5" />
          </svg>
        )}
      </Box>

      {/* Icon */}
      <Box sx={{ display: "flex", flexShrink: 0, mr: 0.5 }}>
        {isFolder ? (
          <FolderIcon
            fontSize="small"
            sx={{
              color: isActiveFolder ? "primary.main" : "text.secondary",
            }}
          />
        ) : (
          <DocumentIcon fontSize="small" sx={{ color: "text.secondary" }} />
        )}
      </Box>

      {/* Title + inline count for folders */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 0.75,
          overflow: "hidden",
        }}
      >
        <Typography
          variant="body2"
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: isFolder ? 600 : 400,
            flexShrink: 1,
          }}
        >
          {title || name}
        </Typography>
        {isFolder && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{ whiteSpace: "nowrap", flexShrink: 0 }}
          >
            {docCount ?? 0} {t("tools.documenthandler.documents.documentsCount")}
          </Typography>
        )}
      </Box>

      {/* Actions — shown on hover */}
      <Box
        className="doc-tree-actions"
        sx={{
          display: "flex",
          flexShrink: 0,
          opacity: 0,
          transition: "opacity 150ms",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Edit button for documents */}
        {!isFolder && (
          <Tooltip title={t("tools.documenthandler.documents.editDocument")}>
            <IconButton
              size="small"
              onClick={handleOpenDocument}
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        )}

        {/* Delete button */}
        <Tooltip
          title={
            isFolder
              ? canDeleteFolder
                ? t("tools.documenthandler.documents.deleteFolder")
                : t("tools.documenthandler.documents.deleteFolderDisabled")
              : t("tools.documenthandler.documents.deleteDocument")
          }
        >
          <span>
            <IconButton
              size="small"
              disabled={isFolder && !canDeleteFolder}
              onClick={handleDelete}
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
});
