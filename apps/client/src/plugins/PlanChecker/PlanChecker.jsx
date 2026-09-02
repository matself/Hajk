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

  // Switch the styled plan layer on with the tool. The WMS is the only thing
  // the user actually sees - the söktjänst has no rendering of its own - so a
  // PlanChecker without it shows results for plans that are invisible on the
  // map. Whatever the layer's visibility was before is restored on close, so
  // the tool does not switch off a layer the user had turned on themselves.
  const previousVisibility = React.useRef(null);
  React.useEffect(() => {
    const layerId = props.options.wmsLayerId;
    if (!layerId) return;

    // Layers load asynchronously, so the layer may not exist on first render.
    // Retry briefly rather than silently doing nothing.
    let cancelled = false;
    let attempts = 0;
    const apply = () => {
      if (cancelled) return;
      const layer = props.map
        .getAllLayers()
        .find((l) => l.get("name") === layerId);

      if (!layer) {
        if (attempts++ < 20) return void setTimeout(apply, 250);
        console.warn(
          `PlanChecker: no layer with id "${layerId}" is present in this map, so the plan layer cannot be switched on. Check the plugin's wmsLayerId against layers.json.`
        );
        return;
      }

      if (pluginShown) {
        if (previousVisibility.current === null) {
          previousVisibility.current = layer.getVisible();
        }
        layer.setVisible(true);
      } else if (previousVisibility.current !== null) {
        layer.setVisible(previousVisibility.current);
        previousVisibility.current = null;
      }
    };
    apply();
    return () => {
      cancelled = true;
    };
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
      <PlanCheckerView localObserver={localObserver} />
    </BaseWindowPlugin>
  );
};

export default PlanChecker;
