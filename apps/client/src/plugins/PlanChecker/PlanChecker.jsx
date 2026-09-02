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

  // The model subscribes to the DrawModel in its constructor, so it has to be
  // let go of explicitly when the plugin unmounts.
  React.useEffect(() => () => planCheckerModel.destroy(), [planCheckerModel]);

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

  // Watch the styled plan layer rather than commanding it. Turning layers on
  // and off is the user's business, so the tool only reports when the layer it
  // depends on is missing or switched off - results that describe plans nobody
  // can see on the map are worse than a warning saying why.
  const [layerStatus, setLayerStatus] = React.useState("ok");
  React.useEffect(() => {
    const layerId = props.options.wmsLayerId;
    if (!pluginShown) {
      setLayerStatus("ok");
      return;
    }
    // An unset id used to mean "say nothing", which made a tool that had simply
    // never been configured indistinguishable from a working one.
    if (!layerId) {
      setLayerStatus("unconfigured");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let layer = null;
    const onVisibilityChange = () =>
      setLayerStatus(layer.getVisible() ? "ok" : "hidden");

    const attach = () => {
      if (cancelled) return;
      layer = props.map.getAllLayers().find((l) => l.get("name") === layerId);

      // Layers load asynchronously, so absence at first render means nothing.
      if (!layer) {
        if (attempts++ < 20) return void setTimeout(attach, 250);
        return setLayerStatus("missing");
      }

      onVisibilityChange();
      layer.on("change:visible", onVisibilityChange);
    };
    attach();

    return () => {
      cancelled = true;
      layer?.un("change:visible", onVisibilityChange);
    };
  }, [props.map, props.options.wmsLayerId, pluginShown]);

  return (
    <BaseWindowPlugin
      {...props}
      type="planchecker"
      custom={{
        icon: <MapIcon />,
        title: props.options.title || "Detaljplan",
        description:
          props.options.description ||
          "Klicka i kartan och se vilka planbestämmelser som gäller",
        height: "dynamic",
        width: 500,
        onWindowHide: () => setPluginShown(false),
        onWindowShow: () => setPluginShown(true),
      }}
    >
      <PlanCheckerView
        localObserver={localObserver}
        layerStatus={layerStatus}
        wmsLayerId={props.options.wmsLayerId}
      />
    </BaseWindowPlugin>
  );
};

export default PlanChecker;
