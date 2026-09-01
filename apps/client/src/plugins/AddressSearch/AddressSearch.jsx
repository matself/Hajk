import React from "react";
import BaseWindowPlugin from "../BaseWindowPlugin";

import AddressSearchModel from "./AddressSearchModel";
import AddressSearchView from "./AddressSearchView";

import HomeWorkIcon from "@mui/icons-material/HomeWork";

/**
 * @summary Main component for the AddressSearch-plugin.
 * @description Lets the user search Lantmäteriet's Belägenhetsadress Direkt for
 * an address and zooms the map to it, or pick the nearest address by clicking
 * in the map. All calls go through the backend's belagenhetsadressproxy.
 */
function AddressSearch(props) {
  const [addressSearchModel] = React.useState(
    () =>
      new AddressSearchModel({
        map: props.map,
        app: props.app,
        options: props.options,
      })
  );

  const onWindowHide = () => {
    addressSearchModel.reset();
  };

  return (
    <BaseWindowPlugin
      {...props}
      type="AddressSearch"
      custom={{
        icon: <HomeWorkIcon />,
        title: "Adressök",
        description: "Sök belägenhetsadresser från Lantmäteriet",
        height: "dynamic",
        width: 400,
        onWindowHide: onWindowHide,
      }}
    >
      <AddressSearchView model={addressSearchModel} />
    </BaseWindowPlugin>
  );
}

export default AddressSearch;
