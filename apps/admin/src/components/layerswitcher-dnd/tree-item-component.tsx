import React from "react";
import {
  SimpleTreeItemWrapper,
  TreeItemComponentProps,
} from "dnd-kit-sortable-tree";
import { Box, Typography } from "@mui/material";
import { DragIndicator } from "@mui/icons-material";

import useAppStateStore from "../../store/use-app-state-store";
import { TreeItemData } from "./types";
import { TreeItemActions } from "./tree-item-actions";
import {
  DND_DRAG_HANDLE_SX,
  DND_ITEM_TITLE_SX,
  DND_TREE_ITEM_CARD_SX,
} from "./utils";

interface TreeItemComponentExtendedProps
  extends TreeItemComponentProps<TreeItemData> {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAdd?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export const TreeItemComponent = React.forwardRef<
  HTMLDivElement,
  TreeItemComponentExtendedProps
>((props, ref) => {
  const { item, onMoveUp, onMoveDown, onAdd, canMoveUp, canMoveDown } = props;
  const isDarkMode = useAppStateStore((s) => s.themeMode === "dark");
  const isGroup = item.type === "group";

  return (
    <SimpleTreeItemWrapper
      {...props}
      ref={ref}
      manualDrag
      showDragHandle={false}
    >
      <Box
        sx={{
          ...DND_TREE_ITEM_CARD_SX,
          background: isDarkMode ? "#1a1a1a" : "#fff",
          border: "1px solid #ddd",
        }}
      >
        <Box
          {...props.handleProps}
          sx={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}
        >
          <DragIndicator sx={DND_DRAG_HANDLE_SX} />
        </Box>

        <Typography
          fontWeight={isGroup ? 600 : 400}
          variant="body2"
          title={item.name}
          sx={{
            ...DND_ITEM_TITLE_SX,
            color: isGroup ? "primary.main" : "text.primary",
          }}
        >
          {item.name}
        </Typography>

        <TreeItemActions
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onAdd={isGroup ? onAdd : undefined}
          onRemove={props.onRemove ? () => props.onRemove?.() : undefined}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
          showAddSlot
          isDarkMode={isDarkMode}
        />
      </Box>
    </SimpleTreeItemWrapper>
  );
});

TreeItemComponent.displayName = "TreeItemComponent";
