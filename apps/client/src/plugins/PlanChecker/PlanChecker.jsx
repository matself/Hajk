import React from "react";
import Observer from "react-event-observer";

import BaseWindowPlugin from "../BaseWindowPlugin";
import DrawModel from "../../models/DrawModel";

import PlanCheckerModel from "./PlanCheckerModel";
import PlanCheckerView from "./PlanCheckerView";
import { DEFAULT_MEASUREMENT_SETTINGS } from "./constants";

import { Box } from "@mui/material";
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

const DRAWER_VALUE = "planchecker";

/** What the drawer is showing when the app starts (App.jsx seeds localStorage for a locked drawer). */
const drawerShowsPlanCheckerAtStart = (props) => {
  let stored = null;
  try {
    stored = window.localStorage.getItem("activeDrawerContent");
  } catch {
    // Storage can be blocked; the map config below is the fallback anyway.
  }
  return (
    ((stored && stored !== "plugins" ? stored : null) ??
      props.app.config.mapConfig.map.activeDrawerOnStart) === DRAWER_VALUE
  );
};

const PlanChecker = (props) => {
  // With `dockInDrawer` the view lives in Hajk's drawer instead of a floating
  // window. Locked, the drawer sits beside the map rather than over it, so
  // what the map zooms to is never hidden behind the tool.
  const docked = props.options.dockInDrawer === true;

  const [pluginShown, setPluginShown] = React.useState(
    docked
      ? drawerShowsPlanCheckerAtStart(props)
      : (props.options.visibleAtStart ?? false)
  );

  const [localObserver] = React.useState(Observer());

  const [drawModel] = React.useState(
    () =>
      new DrawModel({
        layerName: "pluginPlanChecker",
        map: props.map,
        measurementSettings: DEFAULT_MEASUREMENT_SETTINGS,
        observer: localObserver,
        // The point we draw marks where the user clicked - it is not work of
        // theirs to lose, so it must not trigger the "leave site?" warning.
        reportUnsavedChanges: false,
      })
  );

  const [planCheckerModel] = React.useState(
    () =>
      new PlanCheckerModel({
        app: props.app,
        drawModel: drawModel,
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
      planCheckerModel.reset();
      return;
    }
    drawModel.toggleDrawInteraction("Point");
    return () => drawModel.toggleDrawInteraction("");
  }, [drawModel, planCheckerModel, pluginShown]);

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

  // A docked view is rendered by the drawer, which does not re-render when
  // this component does - so the layer status reaches the view as an event.
  React.useEffect(() => {
    localObserver.publish("planChecker.layerStatus", layerStatus);
  }, [localObserver, layerStatus]);

  // Docked mode: register a drawer button whose content is the view, and listen
  // for clicks only while the drawer is showing it.
  const globalObserver = props.app.globalObserver;
  const viewElement = (
    <PlanCheckerView
      localObserver={localObserver}
      model={planCheckerModel}
      layerStatus={layerStatus}
      wmsLayerId={props.options.wmsLayerId}
    />
  );
  const renderDrawerContent = () => (
    <Box sx={{ p: 2, boxSizing: "border-box", minWidth: 0 }}>{viewElement}</Box>
  );
  // The drawer calls this on every render, so keep it pointing at the latest view.
  const renderDrawerContentRef = React.useRef(renderDrawerContent);
  renderDrawerContentRef.current = renderDrawerContent;

  React.useEffect(() => {
    if (!docked) return;
    globalObserver.publish("core.addDrawerToggleButton", {
      value: DRAWER_VALUE,
      ButtonIcon: MapIcon,
      caption: props.options.title || "Detaljplan",
      drawerTitle: props.options.title || "Detaljplan",
      order: 100,
      // The text is long; the default 250 px drawer is too narrow to read it.
      drawerWidth: Number(props.options.drawerWidth) || 500,
      renderDrawerContent: () => renderDrawerContentRef.current(),
    });
    const onChanged = globalObserver.subscribe(
      "core.drawerContentChanged",
      (value) => setPluginShown(value === DRAWER_VALUE)
    );
    const onHidden = globalObserver.subscribe("core.hideDrawer", () =>
      setPluginShown(false)
    );
    // unsubscribe() on the listener, not on the observer by name: the observer
    // is shared with the whole app, and removing by name would drop its own
    // subscribers too.
    return () => {
      onChanged.unsubscribe();
      onHidden.unsubscribe();
    };
  }, [docked, globalObserver, props.options.title, props.options.drawerWidth]);

  if (docked) return null;

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
      {viewElement}
    </BaseWindowPlugin>
  );
};

export default PlanChecker;
