import React, { useEffect, useState } from "react";
import Observer from "react-event-observer";

import BaseWindowPlugin from "../BaseWindowPlugin";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

import MapillaryModel from "./MapillaryModel";
import MapillaryView from "./MapillaryView";

import type { MapillaryProps } from "./types";

const Mapillary: React.FC<MapillaryProps> = (props) => {
  const [displayViewer, setDisplayViewer] = useState(false);

  const [localObserver] = useState(() => Observer());

  const [model] = useState(
    () =>
      new MapillaryModel({
        map: props.map,
        localObserver,
        ...props.options,
      })
  );

  useEffect(() => {
    localObserver.subscribe("locationChanged", () => setDisplayViewer(true));
  }, [localObserver]);

  const onWindowShow = () => {
    model.activate();
  };

  const onWindowHide = () => {
    model.deactivate();
    setDisplayViewer(false);
  };

  const onResize = () => {
    model.resize();
  };

  return (
    <BaseWindowPlugin
      {...props}
      type="Mapillary"
      custom={{
        icon: <PhotoCameraIcon />,
        title: props.options.title || "Mapillary",
        description:
          props.options.description || "Titta hur området ser ut från gatan",
        height: 300,
        width: 400,
        top: undefined,
        left: undefined,
        onWindowShow,
        onWindowHide,
        onResize,
        disablePadding: true,
      }}
    >
      <MapillaryView
        localObserver={localObserver}
        displayViewer={displayViewer}
      />
    </BaseWindowPlugin>
  );
};

export default Mapillary;
