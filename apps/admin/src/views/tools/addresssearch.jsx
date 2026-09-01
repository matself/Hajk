import React from "react";
import { Component } from "react";
import Button from "@material-ui/core/Button";
import SaveIcon from "@material-ui/icons/SaveSharp";
import { withStyles } from "@material-ui/core/styles";
import { blue } from "@material-ui/core/colors";

const ColorButtonBlue = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(blue[500]),
    backgroundColor: blue[500],
    "&:hover": {
      backgroundColor: blue[700],
    },
  },
}))(Button);

var defaultState = {
  validationErrors: [],
  active: false,
  index: 0,
  target: "toolbar",
  visibleAtStart: false,
  token: "",
  maxHits: 15,
  debounceTime: 350,
  kommunkod: "",
  onlyCurrentAddresses: true,
  zoom: 16,
  enableMapClick: true,
  visibleForGroups: [],
};

class ToolOptions extends Component {
  /**
   *
   */
  constructor() {
    super();
    this.state = defaultState;
    this.type = "addresssearch";
  }

  componentDidMount() {
    var tool = this.getTool();
    if (tool) {
      this.setState({
        active: true,
        index: tool.index,
        target: tool.options.target || "toolbar",
        position: tool.options.position,
        width: tool.options.width,
        height: tool.options.height,
        visibleAtStart: tool.options.visibleAtStart,
        token: tool.options.token || "",
        maxHits: tool.options.maxHits || defaultState.maxHits,
        debounceTime: tool.options.debounceTime || defaultState.debounceTime,
        kommunkod: tool.options.kommunkod || "",
        onlyCurrentAddresses:
          tool.options.onlyCurrentAddresses !== undefined
            ? tool.options.onlyCurrentAddresses
            : defaultState.onlyCurrentAddresses,
        zoom: tool.options.zoom || defaultState.zoom,
        enableMapClick:
          tool.options.enableMapClick !== undefined
            ? tool.options.enableMapClick
            : defaultState.enableMapClick,
        visibleForGroups: tool.options.visibleForGroups
          ? tool.options.visibleForGroups
          : [],
      });
    } else {
      this.setState({
        active: false,
      });
    }
  }

  /**
   *
   */

  handleInputChange(event) {
    const target = event.target;
    const name = target.name;
    var value = target.type === "checkbox" ? target.checked : target.value;
    if (typeof value === "string" && value.trim() !== "") {
      value = !isNaN(Number(value)) ? Number(value) : value;
    }
    this.setState({
      [name]: value,
    });
  }

  // Kommunkod and token must stay strings. The numeric coercion above would
  // turn a municipality code such as 0180 into 180, which matches no kommun.
  handleStringInputChange(event) {
    const target = event.target;
    this.setState({
      [target.name]: target.value,
    });
  }

  getTool() {
    return this.props.model
      .get("toolConfig")
      .find((tool) => tool.type === this.type);
  }

  add(tool) {
    this.props.model.get("toolConfig").push(tool);
  }

  remove(tool) {
    this.props.model.set({
      toolConfig: this.props.model
        .get("toolConfig")
        .filter((tool) => tool.type !== this.type),
    });
  }

  replace(tool) {
    this.props.model.get("toolConfig").forEach((t) => {
      if (t.type === this.type) {
        t.options = tool.options;
        t.index = tool.index;
      }
    });
  }

  save() {
    var tool = {
      type: this.type,
      index: this.state.index,
      options: {
        target: this.state.target,
        position: this.state.position,
        width: this.state.width,
        height: this.state.height,
        visibleAtStart: this.state.visibleAtStart,
        token: this.state.token,
        maxHits: this.state.maxHits,
        debounceTime: this.state.debounceTime,
        kommunkod: this.state.kommunkod,
        onlyCurrentAddresses: this.state.onlyCurrentAddresses,
        zoom: this.state.zoom,
        enableMapClick: this.state.enableMapClick,
        visibleForGroups: this.state.visibleForGroups.map(
          Function.prototype.call,
          String.prototype.trim
        ),
      },
    };

    var existing = this.getTool();

    function update() {
      this.props.model.updateToolConfig(
        this.props.model.get("toolConfig"),
        () => {
          this.props.parent.props.parent.setState({
            alert: true,
            alertMessage: "Uppdateringen lyckades",
          });
        }
      );
    }

    if (!this.state.active) {
      if (existing) {
        this.props.parent.props.parent.setState({
          alert: true,
          confirm: true,
          alertMessage:
            "Verktyget kommer att tas bort. Nuvarande inställningar kommer att gå förlorade. Vill du fortsätta?",
          confirmAction: () => {
            this.remove();
            update.call(this);
            this.setState(defaultState);
          },
        });
      } else {
        this.remove();
        update.call(this);
      }
    } else {
      if (existing) {
        this.replace(tool);
      } else {
        this.add(tool);
      }
      update.call(this);
    }
  }

  handleAuthGrpsChange(event) {
    const target = event.target;
    const value = target.value;
    let groups = [];

    try {
      groups = value.split(",");
    } catch (error) {
      console.log(`Någonting gick fel: ${error}`);
    }

    this.setState({
      visibleForGroups: value !== "" ? groups : [],
    });
  }

  renderVisibleForGroups() {
    if (this.props.parent.props.parent.state.authActive) {
      return (
        <div>
          <label htmlFor="visibleForGroups">Tillträde</label>
          <input
            id="visibleForGroups"
            value={this.state.visibleForGroups}
            type="text"
            name="visibleForGroups"
            onChange={(e) => {
              this.handleAuthGrpsChange(e);
            }}
          />
        </div>
      );
    } else {
      return null;
    }
  }

  /**
   *
   */
  render() {
    return (
      <div>
        <form>
          <p>
            <ColorButtonBlue
              variant="contained"
              className="btn"
              onClick={(e) => {
                e.preventDefault();
                this.save();
              }}
              startIcon={<SaveIcon />}
            >
              Spara
            </ColorButtonBlue>
          </p>
          <div>
            <input
              id="active"
              name="active"
              type="checkbox"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              checked={this.state.active}
            />
            &nbsp;
            <label htmlFor="active">Aktiverad</label>
          </div>
          <div className="separator">Fönsterinställningar</div>
          <div>
            <label htmlFor="index">Sorteringsordning</label>
            <input
              id="index"
              name="index"
              type="number"
              min="0"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.index}
            />
          </div>
          <div>
            <label htmlFor="target">Verktygsplacering</label>
            <select
              id="target"
              name="target"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.target}
            >
              <option value="toolbar">Drawer</option>
              <option value="left">Widget left</option>
              <option value="right">Widget right</option>
              <option value="control">Control button</option>
            </select>
          </div>
          <div>
            <label htmlFor="position">
              Fönsterplacering{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Placering av verktygets fönster. Anges som antingen 'left' eller 'right'."
              />
            </label>
            <select
              id="position"
              name="position"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.position}
            >
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label htmlFor="width">
              Fönsterbredd{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Bredd i pixlar på verktygets fönster. Anges som ett numeriskt värde. Lämna tomt för att använda standardbredd."
              />
            </label>
            <input
              id="width"
              name="width"
              type="number"
              min="0"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.width}
            />
          </div>
          <div>
            <label htmlFor="height">
              Fönsterhöjd{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Höjd i pixlar på verktygets fönster. Anges antingen numeriskt (pixlar), 'dynamic' för att automatiskt anpassa höjden efter innehållet eller 'auto' att använda maximal höjd."
              />
            </label>
            <input
              id="height"
              name="height"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.height}
            />
          </div>
          <div className="separator">Adressök</div>
          <div>
            <label htmlFor="token">
              Token{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Bearer-token för Lantmäteriets Belägenhetsadress Direkt. Lämna tomt om token är konfigurerad i backend (LANTMATERIET_BELAGENHETSADRESS_TOKEN i .env), vilket är att föredra - då når den aldrig webbläsaren."
              />
            </label>
            <input
              id="token"
              name="token"
              type="text"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.token}
            />
          </div>
          <div>
            <label htmlFor="maxHits">Max antal träffar</label>
            <input
              id="maxHits"
              name="maxHits"
              type="number"
              min="1"
              max="500"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.maxHits}
            />
          </div>
          <div>
            <label htmlFor="debounceTime">
              Fördröjning (ms){" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Hur länge verktyget väntar efter senaste tangenttryckningen innan det söker. Varje sökning är ett anrop mot Lantmäteriet, så ett högre värde ger färre anrop men en trögare upplevelse."
              />
            </label>
            <input
              id="debounceTime"
              name="debounceTime"
              type="number"
              min="0"
              step="50"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.debounceTime}
            />
          </div>
          <div>
            <label htmlFor="kommunkod">
              Kommunkod{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Fyrsiffrig kommunkod enligt Rikets indelningar, t.ex. 0180 för Stockholm. Begränsar sökningen till en kommun. Lämna tomt för hela landet."
              />
            </label>
            <input
              id="kommunkod"
              name="kommunkod"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.kommunkod}
            />
          </div>
          <div>
            <label htmlFor="zoom">
              Zoomnivå{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Zoomnivå som kartan går till när en adress väljs. En adresspunkt saknar utbredning, så det finns ingen omfattning att anpassa kartan efter."
              />
            </label>
            <input
              id="zoom"
              name="zoom"
              type="number"
              min="0"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.zoom}
            />
          </div>
          <div>
            <input
              id="onlyCurrentAddresses"
              name="onlyCurrentAddresses"
              type="checkbox"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              checked={this.state.onlyCurrentAddresses}
            />
            &nbsp;
            <label htmlFor="onlyCurrentAddresses">
              Visa endast gällande adresser (uteslut reserverade)
            </label>
          </div>
          <div>
            <input
              id="enableMapClick"
              name="enableMapClick"
              type="checkbox"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              checked={this.state.enableMapClick}
            />
            &nbsp;
            <label htmlFor="enableMapClick">
              Tillåt att hämta närmaste adress genom att klicka i kartan
            </label>
          </div>
          <div className="separator">Övriga inställningar</div>
          <div>
            <input
              id="visibleAtStart"
              name="visibleAtStart"
              type="checkbox"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              checked={this.state.visibleAtStart}
            />
            &nbsp;
            <label htmlFor="visibleAtStart">Synlig vid start</label>
          </div>
          {this.renderVisibleForGroups()}
        </form>
      </div>
    );
  }
}

export default ToolOptions;
