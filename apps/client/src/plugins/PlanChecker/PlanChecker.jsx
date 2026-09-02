import React from "react";
import Observer from "react-event-observer";

import BaseWindowPlugin from "../BaseWindowPlugin";
import DrawModel from "../../models/DrawModel";

import PlanCheckerModel from "./PlanCheckerModel";
import PlanCheckerView from "./PlanCheckerView";
import { DEFAULT_MEASUREMENT_SETTINGS } from "./constants";

import MapIcon from "@mui/icons-material/Map";

/**
 * @summary Main component for the PlanChecker plugin.
 *
 * @description Shows which detaljplan regulations apply at a clicked point,
 * read live from Lantmateriet's national geodata platform (NGP) through Hajk's
 * backend proxy. The styled WMS layer for the plans is an ordinary Hajk layer
 * and is only switched on here - it carries no attributes of its own, which is
 * why the two halves have to be combined.
 *
 * Clicks are captured with a DrawModel point interaction rather than a raw map
 * listener, so the tool does not fight the app's own infoclick.
 */
const PlanChecker = (props) => {
  const [pluginShown, setPluginShown] = React.useState(
    props.options.visibleAtStart ?? false
  );

  const [localObserver] = React.useState(Observer());

  const [drawModel] = React.useState(
    () =>
      new DrawModel({
        layerName: "pluginPlanChecker",
        map: props.map,
        measurementSettings: DEFAULT_MEASUREMENT_SETTINGS,
        observer: localObserver,
      })
  );

  const [planCheckerModel] = React.useState(
    () =>
      new PlanCheckerModel({
        app: props.app,
        localObserver: localObserver,
        map: props.map,
        options: props.options,
      })
  );

  // Only listen for clicks while the window is open, and clear the drawn point
  // when it closes, so a stale marker isn't left behind in the map.
  React.useEffect(() => {
    if (!pluginShown) {
      drawModel.toggleDrawInteraction("");
      drawModel.removeDrawnFeatures();
      return;
    }
    drawModel.toggleDrawInteraction("Point");
    return () => drawModel.toggleDrawInteraction("");
  }, [drawModel, pluginShown]);

  // Switch the styled plan layer on with the tool, if one is configured. The
  // WMS is what the user actually sees; the queried layer is invisible.
  React.useEffect(() => {
    const layerId = props.options.wmsLayerId;
    if (!layerId) return;
    const layer = props.map
      .getAllLayers()
      .find((l) => l.get("name") === layerId);
    layer?.setVisible(pluginShown);
  }, [props.map, props.options.wmsLayerId, pluginShown]);

  return (
    <BaseWindowPlugin
      {...props}
      type="planchecker"
      custom={{
        icon: <MapIcon />,
        title: props.options.title || "Planbesked",
        description:
          props.options.description ||
          "Klicka i kartan och se vilka planbestämmelser som gäller",
        height: "dynamic",
        width: 500,
        onWindowHide: () => setPluginShown(false),
        onWindowShow: () => setPluginShown(true),
      }}
    >
      <PlanCheckerView model={planCheckerModel} localObserver={localObserver} />
    </BaseWindowPlugin>
  );
};

export default PlanChecker;
