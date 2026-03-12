import React, { useCallback, useEffect, useRef, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { Sheet } from "react-modal-sheet";
import { useTransform } from "motion/react";

import { isMobile } from "../../utils/IsMobile";
import Window from "../../components/Window";
import FeaturePropsParsing from "../../components/FeatureInfo/FeaturePropsParsing";

import MapClickViewerView from "./MapClickViewerView";
import { MapClickViewerContext } from "./MapClickViewerContext";

const snapPoints = [0, 0.4, 0.7, 1];

const MapClickViewer = (props) => {
  const { appModel, globalObserver, infoclickOptions } = props;
  const { activeMap } = appModel.config;
  const theme = useTheme();

  const [open, setOpen] = useState(false);
  const [featureCollections, setFeatureCollections] = useState([]);

  const sheetRef = useRef(null);
  const currentSnapRef = useRef(1);
  const paddingBottom = useTransform(() => sheetRef.current?.y.get() ?? 0);

  const featurePropsParsing = useRef();

  useEffect(() => {
    featurePropsParsing.current = new FeaturePropsParsing({
      globalObserver: globalObserver,
      options: infoclickOptions || [],
    });
  }, [globalObserver, infoclickOptions]);

  const closeWindow = useCallback(() => {
    setOpen(false);
    setFeatureCollections([]);
    appModel.highlight(false);
    globalObserver.publish("mapClick.removeMarker");
  }, [appModel, globalObserver]);

  const panMapAboveSheet = useCallback(
    (snapIndex) => {
      currentSnapRef.current = snapIndex;
      if (snapIndex === 0) return;

      const map = appModel.getMap();
      const { x, y } = appModel.getClickLocationData();
      const view = map.getView();
      const mapSize = map.getSize();
      if (!mapSize) return;

      const sheetFraction = snapPoints[snapIndex];
      const visibleHeight = mapSize[1] * (1 - sheetFraction);
      const targetCenterY = visibleHeight / 2;
      const resolution = view.getResolution();

      const offsetY = (mapSize[1] / 2 - targetCenterY) * resolution;

      view.animate({
        center: [x, y - offsetY],
        duration: 300,
      });
    },
    [appModel]
  );

  useEffect(() => {
    const mapClickObserver = globalObserver.subscribe(
      "mapClick.featureCollections",
      (fc) => {
        if (fc.length > 0) {
          setFeatureCollections(fc);
          setOpen(true);
          if (isMobile) {
            panMapAboveSheet(currentSnapRef.current);
            globalObserver.publish("core.focusMapClick");
          }
          globalObserver.publish("analytics.trackEvent", {
            eventName: "pluginShown",
            pluginName: "mapclickviewer",
            activeMap: activeMap,
          });
        } else {
          closeWindow();
        }
      }
    );

    const focusWindowObserver = isMobile
      ? globalObserver.subscribe("core.focusWindow", () => {
        closeWindow();
      })
      : null;

    return () => {
      mapClickObserver.unsubscribe();
      focusWindowObserver?.unsubscribe();
    };
  }, [closeWindow, globalObserver, activeMap]);

  const { height, position, title, width } = props.infoclickOptions;

  const contextValue = {
    appModel: props.appModel,
    featurePropsParsing: featurePropsParsing.current,
  };

  if (isMobile) {
    return (
      <Sheet
        ref={sheetRef}
        isOpen={open}
        onClose={closeWindow}
        snapPoints={snapPoints}
        initialSnap={1}
        detent="full"
        disableScrollLocking
        onSnap={panMapAboveSheet}
        style={{ zIndex: 1199 }}
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
                sx={{ fontWeight: 600, mt: 0.5 }}
              >
                {title || "Information"}
              </Typography>
            </Box>
          </Sheet.Header>
          <Sheet.Content disableDrag scrollStyle={{ paddingBottom }}>
            <Box sx={{
              padding: 2,
              userSelect: "none",
              outline: "none",
              "& a:not([class*='Mui'])": { color: theme.palette.primary.light, }
            }}>
              <MapClickViewerContext.Provider value={contextValue}>
                <MapClickViewerView featureCollections={featureCollections} />
              </MapClickViewerContext.Provider>
            </Box>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    );
  }

  return (
    <Window
      globalObserver={props.globalObserver}
      title={title || "Information"}
      open={open}
      height={height || "dynamic"}
      width={width || 400}
      position={position || "right"}
      mode="window"
      forceBringToFrontOnEvent={"mapClick.featureCollections"}
      onClose={closeWindow}
    >
      <MapClickViewerContext.Provider value={contextValue}>
        <MapClickViewerView featureCollections={featureCollections} />
      </MapClickViewerContext.Provider>
    </Window>
  );
};

export default MapClickViewer;
