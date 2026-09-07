import React from "react";
import { createPortal } from "react-dom";
import propTypes from "prop-types";
import withSnackbar from "components/WithSnackbar";

import { Menu, MenuItem } from "@mui/material";
import FolderSpecial from "@mui/icons-material/FolderSpecial";

import Dialog from "../components/Dialog/Dialog";
import ControlButton from "components/ControlButton";

class Preset extends React.PureComponent {
  static propTypes = {
    appModel: propTypes.object.isRequired,
  };

  state = {
    anchorEl: null,
    dialogOpen: false,
  };

  constructor(props) {
    super(props);
    this.type = "Preset"; // Special case - plugins that don't use BaseWindowPlugin must specify .type here
    this.config = props.appModel.config.mapConfig.tools.find(
      (t) => t.type === "preset"
    );

    this.appModel = props.appModel;
    this.globalObserver = props.appModel.globalObserver;

    // If config wasn't found, it means that Preset is not configured. Quit.
    if (this.config === undefined) return;

    // Else, if we're still here, go on.
    this.options = this.config.options;
    this.map = props.appModel.getMap();
    this.title = this.options.title || "Genvägar";

    this.location = null;
    this.zoom = null;
    this.layers = null;
  }

  // Show dropdown menu, anchored to the element clicked
  handleClick = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  // Extracts map-information from the provided link and returns the
  // information as an object. A preset link may be a full URL from the Dela
  // tool (https://host/path?m=map_1&x=…&l=…&gl=…), the same link with the state
  // carried in the hash (…#m=map_1&x=…), or just the query string (?m=map_1&x=…).
  // The layer ids are case-sensitive, so the string must not be lower-cased.
  getMapInfoFromMapLink = (mapLink) => {
    let paramString = mapLink;
    try {
      const url = new URL(mapLink, document.location.href);
      // Prefer the search part; fall back to the hash for hash-based app state.
      // If the link carried neither (e.g. a bare "m=..&x=.." parameter string),
      // keep the original string and let URLSearchParams parse it directly.
      const fromUrl = url.search.length > 1 ? url.search : url.hash;
      if (fromUrl) paramString = fromUrl;
    } catch {
      // Not a resolvable URL - treat the whole string as the parameter part.
    }
    const queryParams = new URLSearchParams(paramString.replace(/^[#?]/, ""));
    const x = queryParams.get("x");
    const y = queryParams.get("y");
    const z = queryParams.get("z");
    const l = queryParams.get("l");
    const gl = queryParams.get("gl");

    // If the animate method on the view class is called with x and y as integers the app completely hangs without any error thrown from OL.
    // the '* 1.0' is a workaround until OL has fixed the issue.
    const location = x && y ? [x * 1.0, y * 1.0] : null;
    const zoom = location ? z : null; // no need to zoom if we don't have a position.
    return { location, zoom, layers: l, groupLayers: gl };
  };

  handleItemClick = (event, item) => {
    const { location, zoom, layers, groupLayers } = this.getMapInfoFromMapLink(
      item.presetUrl
    );
    // A usable preset link must carry a position (x/y) or a layer selection.
    if (location || layers) {
      this.handleClose(); // Ensure that popup menu is closed
      this.location = location;
      this.zoom = location ? zoom || this.map.getView().getZoom() : null;

      this.layers = layers;
      this.groupLayers = groupLayers;

      // If the link contains layers we open the dialog where the user can choose to
      // proceed.
      if (layers) {
        this.openDialog();
      } // If the link does not contain layers, we can simply fly to the new location
      // without toggling layers and so on.
      else {
        this.flyTo(this.map.getView(), this.location, this.zoom);
      }
    } // If the provided url is not a valid map-link, warn the user.
    else {
      this.props.enqueueSnackbar(
        "Länken till platsen är tyvärr felaktig. Kontakta administratören av karttjänsten för att åtgärda felet.",
        {
          variant: "warning",
        }
      );
      console.error(
        "Fel i verktyget Genvägar. Länken til : \n" +
          item.name +
          "\n" +
          item.presetUrl +
          "\när tyvärr felaktig. Någon av följande parametrar saknas: &x=, &y=, &z= eller innehåller fel."
      );
    }
  };

  renderMenuItems = () => {
    const menuItems = [];
    this.options.presetList.forEach((item, index) => {
      menuItems.push(
        <MenuItem
          key={index}
          onClick={(event) => this.handleItemClick(event, item)}
        >
          {item.name}
        </MenuItem>
      );
    });
    return menuItems;
  };

  flyTo(view, location, zoom) {
    if (!location) {
      return;
    }
    const duration = 1500;
    view.animate({
      center: location,
      zoom: zoom,
      duration: duration,
    });
  }

  openDialog = () => {
    this.setState({
      dialogOpen: true,
    });
  };

  closeDialog = () => {
    this.setState({
      dialogOpen: false,
    });
    // Apply the preset's layer selection through the same mechanism the map
    // uses for the l=/gl= URL parameters. It handles regular layers, group
    // (WMS) layers and their sublayer selection, background layers and label
    // styles - none of which the tool's earlier hand-rolled toggling did, so
    // a preset that included a WMS group layer would switch the layer on with
    // no active sublayers and the map server would reject the GetMap request.
    this.appModel.setLayerVisibilityFromParams(
      this.layers,
      this.groupLayers ?? undefined
    );
    this.flyTo(this.map.getView(), this.location, this.zoom);
  };

  abortDialog = () => {
    this.setState({
      dialogOpen: false,
    });
  };

  renderDialog() {
    if (this.state.dialogOpen) {
      return createPortal(
        <Dialog
          options={{
            text: "Alla tända lager i kartan, inklusive bakgrundskartan, kommer nu att släckas. Genvägens fördefinierade lager tänds istället.",
            headerText: "Visa genväg",
            buttonText: "OK",
            abortText: "Avbryt",
            useLegacyNonMarkdownRenderer: true,
          }}
          open={this.state.dialogOpen}
          onClose={this.closeDialog}
          onAbort={this.abortDialog}
        />,
        document.getElementById("windows-container")
      );
    } else {
      return null;
    }
  }

  render() {
    // If config for Control isn't found, or if the config doesn't contain any presets, quit.
    if (
      this.config === undefined ||
      (Object.hasOwn(this.config, "options") &&
        this.config.options.presetList.length < 1)
    ) {
      return null;
    } else {
      const { anchorEl } = this.state;
      const open = Boolean(anchorEl);
      return (
        <>
          <ControlButton
            tooltip={this.title}
            ariaLabel={this.title}
            onClick={this.handleClick}
          >
            <FolderSpecial />
          </ControlButton>
          <Menu
            id="render-props-menu"
            anchorEl={anchorEl}
            open={open}
            onClose={this.handleClose}
          >
            {this.renderMenuItems()}
          </Menu>
          {this.renderDialog()}
        </>
      );
    }
  }
}

export default withSnackbar(Preset);
