import React from "react";
import { Component } from "react";

const defaultState = {
  validationErrors: [],
  id: "",
  caption: "",
  internalLayerName: "",
  content: "",
  date: "Fylls i per automatik",
  url: "",
  attribution: "",
  opacity: 1,
  minZoom: -1,
  maxZoom: -1,
  layerType: "XYZ",
  infoVisible: false,
  infoTitle: "",
  infoText: "",
  infoUrl: "",
  infoUrlText: "",
  infoOpenDataLink: "",
  infoOwner: "",
};

class XYZLayerForm extends Component {
  constructor() {
    super();
    this.state = defaultState;
  }

  componentDidMount() {
    this.setState(defaultState);
  }

  validate() {
    var errors = [];
    if (!this.state.url) errors.push("url");
    if (!this.state.caption) errors.push("caption");
    this.setState({ validationErrors: errors });
    return errors.length === 0;
  }

  getLayer() {
    return {
      id: this.state.id,
      caption: this.state.caption,
      internalLayerName: this.state.internalLayerName,
      content: this.state.content,
      date: new Date().getTime().toString(),
      url: this.state.url,
      attribution: this.state.attribution,
      opacity: parseFloat(this.state.opacity) || 1,
      minZoom: parseInt(this.state.minZoom, 10) || -1,
      maxZoom: parseInt(this.state.maxZoom, 10) || -1,
      type: "XYZ",
      infoVisible: this.state.infoVisible,
      infoTitle: this.state.infoTitle,
      infoText: this.state.infoText,
      infoUrl: this.state.infoUrl,
      infoUrlText: this.state.infoUrlText,
      infoOpenDataLink: this.state.infoOpenDataLink,
      infoOwner: this.state.infoOwner,
    };
  }

  fieldHasError(field) {
    return this.state.validationErrors.includes(field)
      ? "validation-error"
      : "";
  }

  render() {
    return (
      <div>
        <p>
          <label>Visningsnamn*</label>
          <input
            type="text"
            className={`control-fixed-width ${this.fieldHasError("caption")}`}
            value={this.state.caption}
            onChange={(e) => this.setState({ caption: e.target.value })}
          />
        </p>
        <p>
          <label>Internt namn</label>
          <input
            type="text"
            className="control-fixed-width"
            value={this.state.internalLayerName}
            onChange={(e) =>
              this.setState({ internalLayerName: e.target.value })
            }
          />
        </p>
        <p>
          <label>URL-mall*</label>
          <input
            type="text"
            className={`control-fixed-width ${this.fieldHasError("url")}`}
            placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            value={this.state.url}
            onChange={(e) => this.setState({ url: e.target.value })}
          />
        </p>
        <p>
          <label>Attribution</label>
          <input
            type="text"
            className="control-fixed-width"
            value={this.state.attribution}
            onChange={(e) => this.setState({ attribution: e.target.value })}
          />
        </p>
        <p>
          <label>Opacitet (0–1)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            className="control-fixed-width"
            value={this.state.opacity}
            onChange={(e) => this.setState({ opacity: e.target.value })}
          />
        </p>
        <p>
          <label>Min zoom (-1 = ingen gräns)</label>
          <input
            type="number"
            className="control-fixed-width"
            value={this.state.minZoom}
            onChange={(e) => this.setState({ minZoom: e.target.value })}
          />
        </p>
        <p>
          <label>Max zoom (-1 = ingen gräns)</label>
          <input
            type="number"
            className="control-fixed-width"
            value={this.state.maxZoom}
            onChange={(e) => this.setState({ maxZoom: e.target.value })}
          />
        </p>
        <p>
          <label>Beskrivning</label>
          <input
            type="text"
            className="control-fixed-width"
            value={this.state.content}
            onChange={(e) => this.setState({ content: e.target.value })}
          />
        </p>
        <div className="separator">Infodokument</div>
        <p>
          <label>Visa infodokument</label>
          <input
            type="checkbox"
            checked={this.state.infoVisible}
            onChange={(e) => this.setState({ infoVisible: e.target.checked })}
          />
        </p>
        {this.state.infoVisible && (
          <div>
            <p>
              <label>Rubrik</label>
              <input
                type="text"
                className="control-fixed-width"
                value={this.state.infoTitle}
                onChange={(e) => this.setState({ infoTitle: e.target.value })}
              />
            </p>
            <p>
              <label>Text</label>
              <textarea
                className="control-fixed-width"
                value={this.state.infoText}
                onChange={(e) => this.setState({ infoText: e.target.value })}
              />
            </p>
            <p>
              <label>Länk (URL)</label>
              <input
                type="text"
                className="control-fixed-width"
                value={this.state.infoUrl}
                onChange={(e) => this.setState({ infoUrl: e.target.value })}
              />
            </p>
            <p>
              <label>Länktext</label>
              <input
                type="text"
                className="control-fixed-width"
                value={this.state.infoUrlText}
                onChange={(e) =>
                  this.setState({ infoUrlText: e.target.value })
                }
              />
            </p>
            <p>
              <label>Öppna data-länk</label>
              <input
                type="text"
                className="control-fixed-width"
                value={this.state.infoOpenDataLink}
                onChange={(e) =>
                  this.setState({ infoOpenDataLink: e.target.value })
                }
              />
            </p>
            <p>
              <label>Ägare</label>
              <input
                type="text"
                className="control-fixed-width"
                value={this.state.infoOwner}
                onChange={(e) => this.setState({ infoOwner: e.target.value })}
              />
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default XYZLayerForm;
