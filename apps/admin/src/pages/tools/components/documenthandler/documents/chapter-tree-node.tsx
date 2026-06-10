import React from "react";
import type { NodeRendererProps } from "react-arborist";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import {
  AddCircleOutlined as AddChildIcon,
  Delete as DeleteIcon,
  DragIndicator,
  Edit as EditIcon,
} from "@mui/icons-material";
import type { ChapterTreeNode } from "./chapter-tree-utils";

interface ChapterTreeNodeProps extends NodeRendererProps<ChapterTreeNode> {
  selectedId: string | null;
  onAddChild: (parentId: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ChapterTreeNodeRenderer = React.forwardRef<
  HTMLDivElement,
  ChapterTreeNodeProps
>(function ChapterTreeNodeRenderer(
  { style, node, dragHandle, selectedId, onAddChild, onRename, onDelete },
  ref
) {
  const isSelected = node.id === selectedId;
  const titleText = node.data.data.header || "Namnlöst kapitel";
  const isPlaceholder = !node.data.data.header;

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
        width: "100%",
        boxSizing: "border-box",
        overflow: "hidden",
        minWidth: 0,
        cursor: "pointer",
        backgroundColor: isSelected
          ? theme.palette.action.selected
          : "transparent",
        "&:hover": {
          backgroundColor: isSelected
            ? theme.palette.action.selected
            : theme.palette.action.hover,
          "& .chapter-tree-actions": { opacity: 1 },
        },
      })}
      onClick={() => node.select()}
    >
      <Box
        ref={dragHandle}
        sx={{
          cursor: "grab",
          display: "flex",
          color: "text.disabled",
          flexShrink: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <DragIndicator fontSize="small" />
      </Box>

      <Box
        onClick={(e) => {
          if (node.data.children.length === 0) return;
          e.stopPropagation();
          node.toggle();
        }}
        sx={{
          width: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: node.data.children.length > 0 ? "pointer" : "default",
          fontSize: 12,
          color: "text.secondary",
          transition: "transform 150ms",
          transform: node.isOpen ? "rotate(90deg)" : "rotate(0deg)",
          flexShrink: 0,
        }}
      >
        {node.data.children.length > 0 ? "▶" : ""}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Tooltip title={titleText}>
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: node.data.children.length > 0 ? 600 : 400,
              fontStyle: isPlaceholder ? "italic" : undefined,
              opacity: isPlaceholder ? 0.5 : 1,
            }}
          >
            {titleText}
          </Typography>
        </Tooltip>
      </Box>

      <Box
        className="chapter-tree-actions"
        sx={{
          display: "flex",
          flexShrink: 0,
          opacity: isSelected ? 1 : 0,
          transition: "opacity 150ms",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Tooltip title="Lägg till underkapitel">
          <IconButton
            size="small"
            onClick={() => onAddChild(node.id)}
            sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            <AddChildIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Byt namn">
          <IconButton
            size="small"
            onClick={() => onRename(node.id)}
            sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Ta bort kapitel">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(node.id)}
            sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
});
