import React from "react";
import { Box, Tooltip } from "@mui/material";
import { SubdirectoryArrowRight } from "@mui/icons-material";
import { useDroppable } from "@dnd-kit/core";
import {
  createGroupIntoDropId,
  GROUP_INTO_DROP_TARGET_HEIGHT_PX,
  GROUP_INTO_DROP_TARGET_WIDTH_PX,
} from "./utils";

interface GroupIntoDropTargetProps {
  groupId: string;
  enabled: boolean;
  isActive: boolean;
  isDarkMode: boolean;
  title: string;
  elementId?: string;
}

export const GroupIntoDropTarget: React.FC<GroupIntoDropTargetProps> = ({
  groupId,
  enabled,
  isActive,
  isDarkMode,
  title,
  elementId,
}) => {
  const { setNodeRef } = useDroppable({
    id: createGroupIntoDropId(groupId),
    disabled: !enabled,
  });

  return (
    <Tooltip title={title} placement="top">
      <Box
        id={elementId}
        ref={setNodeRef}
        sx={{
          width: GROUP_INTO_DROP_TARGET_WIDTH_PX,
          height: GROUP_INTO_DROP_TARGET_HEIGHT_PX,
          minWidth: GROUP_INTO_DROP_TARGET_WIDTH_PX,
          borderRadius: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          alignSelf: "center",
          transition: "all 0.15s ease",
          backgroundColor: isActive
            ? isDarkMode
              ? "rgba(102, 187, 106, 0.28)"
              : "rgba(76, 175, 80, 0.2)"
            : isDarkMode
              ? "rgba(255, 255, 255, 0.04)"
              : "rgba(0, 0, 0, 0.03)",
          border: isActive
            ? `2px dashed ${isDarkMode ? "#66bb6a" : "#43a047"}`
            : `2px dashed ${isDarkMode ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.15)"}`,
          boxShadow: isActive
            ? `inset 0 0 0 1px ${
                isDarkMode
                  ? "rgba(102, 187, 106, 0.45)"
                  : "rgba(67, 160, 71, 0.35)"
              }`
            : "none",
        }}
      >
        <SubdirectoryArrowRight
          sx={{
            fontSize: 28,
            color: isActive
              ? isDarkMode
                ? "#81c784"
                : "#2e7d32"
              : isDarkMode
                ? "rgba(255,255,255,0.45)"
                : "rgba(0,0,0,0.38)",
          }}
        />
      </Box>
    </Tooltip>
  );
};
