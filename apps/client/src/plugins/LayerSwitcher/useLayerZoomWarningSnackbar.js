import { useCallback, useEffect, useState } from "react";

import useSnackbar from "../../hooks/useSnackbar";
import { useMapZoom } from "./LayerSwitcherProvider";

const layerUsesMinMaxZoom = (minZoom, maxZoom) => {
  const minZ = minZoom ?? 0;
  const maxZ = maxZoom ?? 0;
  return (maxZ > 0 && maxZ < Infinity) || (minZ > 0 && minZ < Infinity);
};

// TODO
// move to Higher order component

export const useLayerZoomWarningSnackbar = (
  layerMinZoom,
  layerMaxZoom,
  toggled,
  minMaxZoomAlertOnToggleOnly,
  layerId,
  caption,
  map
) => {
  const mapZoom = useMapZoom();
  const visible = mapZoom >= layerMinZoom && mapZoom <= layerMaxZoom;

  const { addToSnackbar, removeFromSnackbar } = useSnackbar();
  const [prevVisible, setPrevVisible] = useState(visible);
  const [prevToggled, setPrevToggled] = useState(toggled);

  const zoomToVisibleScale = useCallback(() => {
    if (!map) return;
    const view = map.getView();
    const currentZoom = view.getZoom();
    // OL layer visibility is `zoom > minZoom && zoom <= maxZoom` (minZoom is
    // exclusive), so zooming in to exactly minZoom still hides the layer.
    const targetZoom =
      currentZoom <= layerMinZoom
        ? layerMinZoom + 0.01
        : currentZoom > layerMaxZoom
          ? layerMaxZoom
          : currentZoom;
    view.animate({ zoom: targetZoom, duration: 300 });
  }, [map, layerMinZoom, layerMaxZoom]);

  useEffect(() => {
    if (layerUsesMinMaxZoom(layerMinZoom, layerMaxZoom)) {
      // show warning on layer toggle
      if (toggled !== prevToggled) {
        if (toggled && !visible) {
          addToSnackbar(layerId, caption, false, zoomToVisibleScale);
        } else if (!toggled) {
          removeFromSnackbar(layerId, caption);
        }
        setPrevToggled(toggled);
      }

      // Show warning on zoom in/out
      if (visible !== prevVisible) {
        if (visible || !toggled) {
          removeFromSnackbar(layerId, caption);
        } else {
          if (toggled && !minMaxZoomAlertOnToggleOnly) {
            addToSnackbar(layerId, caption, false, zoomToVisibleScale);
          }
        }
        setPrevVisible(visible);
      }
    }
  }, [
    addToSnackbar,
    removeFromSnackbar,
    layerId,
    caption,
    layerMinZoom,
    layerMaxZoom,
    visible,
    prevVisible,
    toggled,
    prevToggled,
    minMaxZoomAlertOnToggleOnly,
    zoomToVisibleScale,
  ]);
};
