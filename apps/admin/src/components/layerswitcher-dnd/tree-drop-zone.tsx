import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Box, Tooltip, Typography } from "@mui/material";

import useAppStateStore from "../../store/use-app-state-store";

interface TreeDropZoneProps {
  children: React.ReactNode;
  id: string;
  title?: string;
  titleIcon?: React.ReactNode;
  minHeight?: number;
}

export const TreeDropZone: React.FC<TreeDropZoneProps> = ({
  children,
  id,
  title,
  titleIcon,
  minHeight = 280,
}) => {
  const isDarkMode = useAppStateStore((s) => s.themeMode === "dark");

  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight,
        p: 1,
        borderRadius: 2,
        border: isOver ? "2px dashed" : "1px solid",
        borderColor: isOver ? "primary.main" : "#ddd",
        backgroundColor: isOver
          ? isDarkMode
            ? "#1e293b"
            : "#e3f2fd"
          : isDarkMode
          ? "#121212"
          : "#fafafa",
        transition: "all 0.2s ease",
      }}
    >
      {title &&
        (titleIcon ? (
          <Tooltip title={title}>
            <Box
              component="span"
              sx={{ display: "inline-flex", mb: 1 }}
              aria-label={title}
            >
              {titleIcon}
            </Box>
          </Tooltip>
        ) : (
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
            {title}
          </Typography>
        ))}
      {children}
    </Box>
  );
};
