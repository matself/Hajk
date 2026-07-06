import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

import OsmSearchModel from "./OsmSearchModel";
import OsmSearchView from "./OsmSearchView";

import TravelExploreIcon from "@mui/icons-material/TravelExplore";

/**
 * @summary Main component for the OsmSearch-plugin.
 * @description Lets the user search for places using the OSM Nominatim
 * geocoding service, then zooms/pans the map to the selected result.
 */
function OsmSearch(props) {
  const [osmSearchModel] = React.useState(
    () =>
      new OsmSearchModel({
        map: props.map,
        options: props.options,
      })
  );

  const onWindowHide = () => {
    osmSearchModel.clearResult();
  };

  return (
    <BaseWindowPlugin
      {...props}
      type="OsmSearch"
      custom={{
        icon: <TravelExploreIcon />,
        title: "OSM-sökning",
        description: "Sök efter platser i OpenStreetMap",
        height: "dynamic",
        width: 400,
        onWindowHide: onWindowHide,
      }}
    >
      <OsmSearchView model={osmSearchModel} />
    </BaseWindowPlugin>
  );
}

export default OsmSearch;
