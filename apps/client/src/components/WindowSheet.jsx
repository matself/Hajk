import React, { useEffect, useRef } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { Sheet } from "react-modal-sheet";
import { useTransform } from "motion/react";

const WindowSheet = ({
  isOpen,
  onClose,
  title,
  snapPoints = [0, 0.4, 0.7, 1],
  initialSnap = 1,
  zIndex = 1198,
  onSnap,
  disablePadding = false,
  globalObserver,
  minimizeOnFocusMapClick = false,
  children,
}) => {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const paddingBottom = useTransform(() => sheetRef.current?.y.get() ?? 0);

  useEffect(() => {
    if (!minimizeOnFocusMapClick || !globalObserver) return;
    const sub = globalObserver.subscribe("core.focusMapClick", () => {
      if (isOpen) {
        sheetRef.current?.snapTo(1);
      }
    });
    return () => sub.unsubscribe();
  }, [globalObserver, isOpen, minimizeOnFocusMapClick]);

  return (
    <Sheet
      ref={sheetRef}
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={snapPoints}
      initialSnap={initialSnap}
      detent="full"
      disableScrollLocking
      onSnap={onSnap}
      style={{ zIndex }}
    >
      <Sheet.Container
        style={{
          backgroundColor: `color-mix(in srgb, ${theme.palette.background.paper} 90%, transparent)`,
          backdropFilter: "blur(12px)",
          color: theme.palette.text.primary,
          boxShadow: theme.shadows[24],
        }}
      >
        <Sheet.Header>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              pt: 1,
              pb: 0.5,
            }}
          >
            <Sheet.DragIndicator />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 600, mt: 0.5, mb: 1 }}
            >
              {title}
            </Typography>
            <div
              style={{
                height: "2px",
                width: "100%",
                backgroundColor: theme.palette.primary.main,
              }}
            />
          </Box>
        </Sheet.Header>
        <Sheet.Content disableDrag scrollStyle={{ paddingBottom }}>
          <Box
            sx={{
              padding: disablePadding ? 0 : 2,
              userSelect: "none",
              outline: "none",
              "& a:not([class*='Mui'])": {
                color: theme.palette.primary.light,
              },
            }}
          >
            {children}
          </Box>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
};

export default WindowSheet;
