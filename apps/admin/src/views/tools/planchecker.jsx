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
  target: "control",
  position: "right",
  height: "dynamic",
  visibleAtStart: false,
  title: "Detaljplan",
  description: "Klicka i kartan och se vilka planbestämmelser som gäller",
  wmsLayerId: "",
  planStatuses: "laga kraft",
  maxItems: 1000,
  proxyPath: "detaljplanproxy",
  assetProxyPath: "detaljplanassetproxy",
  visibleForGroups: [],
};

class ToolOptions extends Component {
  /**
   *
   */
  constructor() {
    super();
    this.state = defaultState;
    this.type = "planchecker";
  }

  componentDidMount() {
    var tool = this.getTool();
    if (tool) {
      this.setState({
        active: true,
        index: tool.index,
        target: tool.options.target || defaultState.target,
        position: tool.options.position || defaultState.position,
        width: tool.options.width,
        height: tool.options.height || defaultState.height,
        visibleAtStart: tool.options.visibleAtStart,
        title: tool.options.title || defaultState.title,
        description: tool.options.description || defaultState.description,
        wmsLayerId: tool.options.wmsLayerId || "",
        // Stored as an array, edited as a comma separated list.
        planStatuses: Array.isArray(tool.options.planStatuses)
          ? tool.options.planStatuses.join(", ")
          : defaultState.planStatuses,
        maxItems: tool.options.maxItems || defaultState.maxItems,
        proxyPath: tool.options.proxyPath || defaultState.proxyPath,
        assetProxyPath:
          tool.options.assetProxyPath || defaultState.assetProxyPath,
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

  // Values that must stay strings. A Hajk layer id is often all digits (1328,
  // for instance), and the numeric coercion above would turn it into a number
  // that then matches no layer, since ids are compared as strings.
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
        title: this.state.title,
        description: this.state.description,
        wmsLayerId: this.state.wmsLayerId,
        // Back to an array, dropping blanks so a trailing comma is harmless.
        planStatuses: this.state.planStatuses
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s !== ""),
        maxItems: this.state.maxItems,
        proxyPath: this.state.proxyPath,
        assetProxyPath: this.state.assetProxyPath,
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
          <div className="separator">Detaljplan</div>
          <div>
            <label htmlFor="title">Titel</label>
            <input
              id="title"
              name="title"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.title}
            />
          </div>
          <div>
            <label htmlFor="description">Beskrivning</label>
            <input
              id="description"
              name="description"
              type="text"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.description}
            />
          </div>
          <div>
            <label htmlFor="wmsLayerId">
              Planlager{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Id för det WMS-lager som visar detaljplanerna i kartan. Hämtas från Lagerhanteraren och måste vara samma id som lagret har i lagerlistan. Verktyget tänder eller släcker aldrig lagret - det är användarens val - men varnar om lagret saknas i kartan eller är släckt. Sökningen fungerar även utan lagret, men då syns inga planer i kartan."
              />
            </label>
            <input
              id="wmsLayerId"
              name="wmsLayerId"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.wmsLayerId}
            />
          </div>
          <div>
            <label htmlFor="planStatuses">
              Planstatus{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Kommaseparerad lista över vilka planstatusar som ska tas med. Standard är 'laga kraft', vilket är vad Lantmäteriets egen visningstjänst använder - en plan som inte vunnit laga kraft reglerar ännu ingenting. Lämna tomt för att ta med alla statusar."
              />
            </label>
            <input
              id="planStatuses"
              name="planStatuses"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.planStatuses}
            />
          </div>
          <div>
            <label htmlFor="maxItems">
              Max antal bestämmelser{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Övre gräns för hur många planbestämmelser som hämtas per plan. Lantmäteriets egen visningstjänst använder 1000. Nås gränsen visas en varning om att listan kan vara ofullständig."
              />
            </label>
            <input
              id="maxItems"
              name="maxItems"
              type="number"
              min="1"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleInputChange(e);
              }}
              value={this.state.maxItems}
            />
          </div>
          <div className="separator">Avancerat</div>
          <div>
            <label htmlFor="proxyPath">
              Sökproxy{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Sökväg under mapserviceBase där backendens proxy mot Lantmäteriets söktjänst är monterad. Ändra bara om proxyn monterats någon annanstans i backend. Kräver att LANTMATERIET_DETALJPLAN_ACTIVE är satt i backendens .env."
              />
            </label>
            <input
              id="proxyPath"
              name="proxyPath"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.proxyPath}
            />
          </div>
          <div>
            <label htmlFor="assetProxyPath">
              Dokumentproxy{" "}
              <i
                className="fa fa-question-circle"
                data-toggle="tooltip"
                title="Sökväg under mapserviceBase där backendens proxy för planhandlingarna är monterad. Planhandlingarna ligger på en annan adress än söktjänsten men bakom samma inloggning, och länkarna hamnar i en inloggningsruta om de inte går via proxyn."
              />
            </label>
            <input
              id="assetProxyPath"
              name="assetProxyPath"
              type="text"
              className="control-fixed-width"
              onChange={(e) => {
                this.handleStringInputChange(e);
              }}
              value={this.state.assetProxyPath}
            />
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
