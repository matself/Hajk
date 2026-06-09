import React from "react";
import { Box, IconButton } from "@mui/material";
import {
  Add as AddIcon,
  ArrowDownward,
  ArrowUpward,
  Close as CloseIcon,
} from "@mui/icons-material";

import {
  DND_TREE_ACTION_SLOT_SX,
  DND_TREE_ACTIONS_BAR_SX,
  DND_TREE_ICON_BUTTON_SX,
  getTreeActionsBarWidth,
} from "./utils";

export interface TreeItemActionsProps {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAdd?: () => void;
  onRemove?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  showAddSlot?: boolean;
  isDarkMode?: boolean;
  moveUpTitle?: string;
  moveDownTitle?: string;
  addTitle?: string;
  removeTitle?: string;
}

const ActionSlot: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <Box sx={DND_TREE_ACTION_SLOT_SX}>{children}</Box>
);

export const TreeItemActions: React.FC<TreeItemActionsProps> = ({
  onMoveUp,
  onMoveDown,
  onAdd,
  onRemove,
  canMoveUp,
  canMoveDown,
  showAddSlot = true,
  isDarkMode = false,
  moveUpTitle,
  moveDownTitle,
  addTitle,
  removeTitle,
}) => {
  const iconButtonSx = {
    ...DND_TREE_ICON_BUTTON_SX,
    "&:hover": {
      backgroundColor: isDarkMode ? "#2a2a2a" : "#f5f5f5",
    },
  };

  const slotCount = showAddSlot ? 4 : 3;

  return (
    <Box
      sx={{
        ...DND_TREE_ACTIONS_BAR_SX,
        width: getTreeActionsBarWidth(slotCount),
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <ActionSlot>
        {onMoveUp ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={canMoveUp === false}
            sx={{
              ...iconButtonSx,
              opacity: canMoveUp === false ? 0.3 : 1,
            }}
            title={moveUpTitle}
          >
            <ArrowUpward sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </ActionSlot>

      <ActionSlot>
        {onMoveDown ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={canMoveDown === false}
            sx={{
              ...iconButtonSx,
              opacity: canMoveDown === false ? 0.3 : 1,
            }}
            title={moveDownTitle}
          >
            <ArrowDownward sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </ActionSlot>

      <ActionSlot>
        {showAddSlot && onAdd ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            sx={iconButtonSx}
            title={addTitle}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </ActionSlot>

      <ActionSlot>
        {onRemove ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            sx={iconButtonSx}
            title={removeTitle}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </ActionSlot>
    </Box>
  );
};
