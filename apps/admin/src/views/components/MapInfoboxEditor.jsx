import React from "react";
import { Component } from "react";
import InfoclickEditor from "./InfoclickEditor";

/**
 * Wraps InfoclickEditor for the map-level "Infobox" override
 * (layerswitcher.options.baselayers[]/groups[].layers[].infobox in a map
 * config), as opposed to the layer-level "Infoklick" template edited in
 * wmslayerform.jsx/vectorlayerform.jsx. Unlike the layer-level editor,
 * this one field applies to the whole layer at once - for a WMS layer
 * with multiple sublayers, it overwrites every sublayer's own infobox
 * identically when non-empty, so attribute lookup here is necessarily
 * per-sublayer-you-pick rather than tied to one fixed sublayer.
 */
class MapInfoboxEditor extends Component {
  constructor(props) {
    super(props);
    const sublayers = this.getSublayers();
    this.state = {
      selectedSublayer: sublayers[0]?.id || "",
      availableAttributes: [],
      fetchingAttributes: false,
      fetchError: null,
    };
  }

  getSublayers() {
    const { layer } = this.props;
    if (!layer) {
      return [];
    }
    if (layer.type === "WMS" && Array.isArray(layer.layersInfo)) {
      return layer.layersInfo.map((li) => ({
        id: li.id,
        caption: li.caption || li.id,
      }));
    }
    if (layer.type === "Vector" && layer.layer) {
      return [{ id: layer.layer, caption: layer.caption || layer.layer }];
    }
    return [];
  }

  fetchAttributes = () => {
    const { model, layer } = this.props;
    const { selectedSublayer } = this.state;
    if (!model || !layer || !selectedSublayer) {
      return;
    }
    this.setState({ fetchingAttributes: true, fetchError: null });
    model.getWFSLayerDescription(layer.url, selectedSublayer, (result) => {
      if (Array.isArray(result)) {
        this.setState({
          availableAttributes: result.map((r) => ({
            name: r.name,
            type: r.localType,
          })),
          fetchingAttributes: false,
        });
      } else {
        this.setState({
          fetchingAttributes: false,
          fetchError: "Vektorlager saknas. Attribut måste väljas manuellt.",
        });
      }
    });
  };

  render() {
    const sublayers = this.getSublayers();
    return (
      <div className="MapInfoboxEditor">
        <p className="MapInfoboxEditor-note">
          Denna infobox gäller för hela lagret i just den här kartan. Om den
          fylls i skriver den över lagrets vanliga infoklick-mall (inklusive
          alla sublagers egna mallar, om det är ett WMS-lager) - bara för denna
          karta. Lämna tom för att använda lagrets egna infoklick-inställningar.
        </p>
        {sublayers.length > 1 && (
          <div className="MapInfoboxEditor-sublayerPicker">
            <label>Hämta attribut från sublager: </label>
            <select
              value={this.state.selectedSublayer}
              onChange={(e) =>
                this.setState({
                  selectedSublayer: e.target.value,
                  availableAttributes: [],
                })
              }
            >
              {sublayers.map((sl) => (
                <option key={sl.id} value={sl.id}>
                  {sl.caption}
                </option>
              ))}
            </select>
          </div>
        )}
        <InfoclickEditor
          initialValue={this.props.initialValue}
          onChange={this.props.onChange}
          availableAttributes={this.state.availableAttributes}
          fetchingAttributes={this.state.fetchingAttributes}
          fetchError={this.state.fetchError}
          onFetchAttributes={this.fetchAttributes}
        />
      </div>
    );
  }
}

export default MapInfoboxEditor;
