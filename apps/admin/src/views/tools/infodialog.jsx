import React from "react";
import { Component } from "react";
import Button from "@material-ui/core/Button";
import SaveIcon from "@material-ui/icons/SaveSharp";
import AddIcon from "@material-ui/icons/Add";
import DeleteIcon from "@material-ui/icons/Delete";
import { withStyles } from "@material-ui/core/styles";
import { blue, green, red } from "@material-ui/core/colors";
import RichEditor from "../components/RichEditor.jsx";

const ColorButtonBlue = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(blue[500]),
    backgroundColor: blue[500],
    "&:hover": {
      backgroundColor: blue[700],
    },
  },
}))(Button);

const ColorButtonGreen = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(green[500]),
    backgroundColor: green[500],
    "&:hover": {
      backgroundColor: green[700],
    },
  },
}))(Button);

const ColorButtonRed = withStyles((theme) => ({
  root: {
    color: theme.palette.getContrastText(red[500]),
    backgroundColor: red[500],
    "&:hover": {
      backgroundColor: red[700],
    },
  },
}))(Button);

// New dialogs always default to the Rich text (HTML) editor. Only dialogs
// that were already saved as Markdown (useLegacyNonMarkdownRenderer: false,
// e.g. hand-edited JSON from before this editor existed) fall back to the
// plain-textarea Markdown source view, so we never silently reinterpret
// content and lose formatting.
function createDialog() {
  return {
    name: `dialog-${Date.now()}`,
    title: "Ny dialog",
    description: "",
    target: "control",
    icon: "",
    headerText: "",
    text: "",
    allowDangerousHtml: false,
    useLegacyNonMarkdownRenderer: true,
    buttonText: "Stäng",
    primaryButtonVariant: "",
    abortText: "",
    prompt: false,
    visibleAtStart: false,
    showOnlyOnce: false,
    lastModified: "",
    visibleForGroups: [],
  };
}

var defaultState = {
  validationErrors: [],
  active: false,
  index: 0,
  dialogs: [],
  selected: 0,
};

class ToolOptions extends Component {
  constructor() {
    super();
    this.state = defaultState;
    this.type = "infodialog";
  }

  componentDidMount() {
    var tool = this.getTool();
    if (tool) {
      var options = Array.isArray(tool.options) ? tool.options : [tool.options];
      this.setState({
        active: true,
        index: tool.index,
        dialogs: options.map((o) => ({
          ...createDialog(),
          ...o,
          visibleForGroups: o.visibleForGroups || [],
        })),
        selected: 0,
      });
    } else {
      this.setState({
        active: false,
        dialogs: [],
      });
    }
  }

  getTool() {
    return this.props.model
      .get("toolConfig")
      .find((tool) => tool.type === this.type);
  }

  add(tool) {
    this.props.model.get("toolConfig").push(tool);
  }

  remove() {
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

  validate() {
    const errors = [];
    const names = this.state.dialogs.map((d) => (d.name || "").trim());

    if (this.state.dialogs.length === 0) {
      errors.push(
        "Lägg till minst en dialog, eller avmarkera Aktiverad för att ta bort verktyget."
      );
    }

    names.forEach((n, i) => {
      if (!n) {
        errors.push(`Dialog ${i + 1} saknar ett namn.`);
      }
    });

    const duplicates = [
      ...new Set(names.filter((n, i) => n && names.indexOf(n) !== i)),
    ];
    if (duplicates.length > 0) {
      errors.push(`Namnen måste vara unika: ${duplicates.join(", ")}`);
    }

    return errors;
  }

  save() {
    if (this.state.active) {
      const errors = this.validate();
      if (errors.length > 0) {
        this.setState({ validationErrors: errors });
        return;
      }
    }
    this.setState({ validationErrors: [] });

    var tool = {
      type: this.type,
      index: this.state.index,
      options: this.state.dialogs.map((d) => ({
        ...d,
        visibleForGroups: (d.visibleForGroups || [])
          .map((g) => g.trim())
          .filter((g) => g !== ""),
      })),
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

  addDialog() {
    const dialogs = [...this.state.dialogs, createDialog()];
    this.setState({ dialogs, selected: dialogs.length - 1 });
  }

  removeDialog(i) {
    const dialogs = this.state.dialogs.filter((_, idx) => idx !== i);
    this.setState({
      dialogs,
      selected: Math.max(0, Math.min(this.state.selected, dialogs.length - 1)),
    });
  }

  updateDialog(i, patch) {
    const dialogs = this.state.dialogs.map((d, idx) =>
      idx === i ? { ...d, ...patch } : d
    );
    this.setState({ dialogs });
  }

  handleAuthGrpsChange(i, event) {
    const value = event.target.value;
    let groups = [];
    try {
      groups = value.split(",");
    } catch (error) {
      console.log(`Någonting gick fel: ${error}`);
    }
    this.updateDialog(i, { visibleForGroups: value !== "" ? groups : [] });
  }

  renderVisibleForGroups(i, dialog) {
    if (this.props.parent.props.parent.state.authActive) {
      return (
        <div>
          <label htmlFor={`visibleForGroups-${i}`}>Tillträde</label>
          <input
            id={`visibleForGroups-${i}`}
            value={dialog.visibleForGroups}
            type="text"
            onChange={(e) => this.handleAuthGrpsChange(i, e)}
          />
        </div>
      );
    }
    return null;
  }

  renderDialogList() {
    return (
      <ul className="config-layer-list">
        {this.state.dialogs.map((d, i) => (
          <li
            key={d.name + i}
            className={
              i === this.state.selected ? "layer-item selected" : "layer-item"
            }
            onClick={() => this.setState({ selected: i })}
          >
            <span>{d.title || d.name || `Dialog ${i + 1}`}</span>
          </li>
        ))}
      </ul>
    );
  }

  renderTextEditor(i, dialog) {
    if (dialog.useLegacyNonMarkdownRenderer) {
      return (
        <div>
          <label>Text</label>
          <RichEditor
            display={true}
            html={dialog.text}
            onUpdate={(html) => this.updateDialog(i, { text: html })}
          />
        </div>
      );
    }

    // This dialog was saved as Markdown (e.g. hand-edited JSON from before
    // this editor existed). We show it as raw source rather than risk
    // reinterpreting Markdown syntax as literal text in the rich editor.
    return (
      <div>
        <label className="long-label" htmlFor="text">
          Text (Markdown-källkod, om det är en äldre dialog)
        </label>
        <textarea
          id="text"
          value={dialog.text}
          rows={12}
          onChange={(e) => this.updateDialog(i, { text: e.target.value })}
        />
        <div>
          <input
            id="allowDangerousHtml"
            type="checkbox"
            checked={dialog.allowDangerousHtml}
            onChange={(e) =>
              this.updateDialog(i, { allowDangerousHtml: e.target.checked })
            }
          />
          &nbsp;
          <label className="long-label" htmlFor="allowDangerousHtml">
            Tillåt HTML-taggar inuti Markdown-texten
          </label>
        </div>
      </div>
    );
  }

  renderDialogEditor() {
    const i = this.state.selected;
    const dialog = this.state.dialogs[i];
    if (!dialog) {
      return <p>Lägg till en dialog för att komma igång.</p>;
    }

    return (
      <div key={dialog.name}>
        <div className="separator">Identitet</div>
        <div>
          <label className="long-label" htmlFor="name">
            Namn (unikt, styr visning om redan visad en gång)
          </label>
          <input
            id="name"
            type="text"
            value={dialog.name}
            onChange={(e) => this.updateDialog(i, { name: e.target.value })}
          />
        </div>
        <div>
          <label className="long-label" htmlFor="title">
            Titel (visas på knappen)
          </label>
          <input
            id="title"
            type="text"
            value={dialog.title}
            onChange={(e) => this.updateDialog(i, { title: e.target.value })}
          />
        </div>
        <div>
          <label className="long-label" htmlFor="description">
            Beskrivning (verktygstips)
          </label>
          <input
            id="description"
            type="text"
            value={dialog.description}
            onChange={(e) =>
              this.updateDialog(i, { description: e.target.value })
            }
          />
        </div>

        <div className="separator">Placering</div>
        <div>
          <label htmlFor="target">Knappens placering</label>
          <select
            id="target"
            value={dialog.target}
            onChange={(e) => this.updateDialog(i, { target: e.target.value })}
          >
            <option value="left">Vänster meny</option>
            <option value="right">Höger meny</option>
            <option value="control">Kartkontroll</option>
            <option value="hidden">
              Dold (visas bara automatiskt/programmatiskt)
            </option>
          </select>
        </div>
        <div>
          <label className="long-label" htmlFor="icon">
            Ikon (MUI-ikonnamn, t.ex. helpcenter)
          </label>
          <input
            id="icon"
            type="text"
            value={dialog.icon}
            onChange={(e) => this.updateDialog(i, { icon: e.target.value })}
          />
        </div>

        <div className="separator">Innehåll</div>
        <div>
          <label htmlFor="headerText">Rubrik i dialogrutan</label>
          <input
            id="headerText"
            type="text"
            value={dialog.headerText}
            onChange={(e) =>
              this.updateDialog(i, { headerText: e.target.value })
            }
          />
        </div>
        {this.renderTextEditor(i, dialog)}

        <div className="separator">Knappar</div>
        <div>
          <label htmlFor="buttonText">Text i stängknappen</label>
          <input
            id="buttonText"
            type="text"
            value={dialog.buttonText}
            onChange={(e) =>
              this.updateDialog(i, { buttonText: e.target.value })
            }
          />
        </div>
        <div>
          <label htmlFor="primaryButtonVariant">Stängknappens utseende</label>
          <select
            id="primaryButtonVariant"
            value={dialog.primaryButtonVariant}
            onChange={(e) =>
              this.updateDialog(i, { primaryButtonVariant: e.target.value })
            }
          >
            <option value="">Standard (text)</option>
            <option value="outlined">Konturerad</option>
            <option value="contained">Fylld</option>
          </select>
        </div>
        <div>
          <label className="long-label" htmlFor="abortText">
            Text i avbryt-knappen (valfritt, lämna tomt för att dölja knappen)
          </label>
          <input
            id="abortText"
            type="text"
            value={dialog.abortText}
            onChange={(e) =>
              this.updateDialog(i, { abortText: e.target.value })
            }
          />
        </div>
        <div>
          <input
            id="prompt"
            type="checkbox"
            checked={dialog.prompt}
            onChange={(e) => this.updateDialog(i, { prompt: e.target.checked })}
          />
          &nbsp;
          <label className="long-label" htmlFor="prompt">
            Lägg till ett textfält i dialogen
          </label>
        </div>

        <div className="separator">Synlighet</div>
        <div>
          <input
            id="visibleAtStart"
            type="checkbox"
            checked={dialog.visibleAtStart}
            onChange={(e) =>
              this.updateDialog(i, { visibleAtStart: e.target.checked })
            }
          />
          &nbsp;
          <label htmlFor="visibleAtStart">
            Visa automatiskt när kartan öppnas
          </label>
        </div>
        <div>
          <input
            id="showOnlyOnce"
            type="checkbox"
            checked={dialog.showOnlyOnce}
            onChange={(e) =>
              this.updateDialog(i, { showOnlyOnce: e.target.checked })
            }
          />
          &nbsp;
          <label className="long-label" htmlFor="showOnlyOnce">
            Visa bara automatiskt en gång per användare
          </label>
        </div>
        <div>
          <label className="long-label" htmlFor="lastModified">
            Senast ändrad (visar dialogen igen för alla, oavsett övrig
            synlighet)
          </label>
          <input
            id="lastModified"
            type="text"
            className="control-fixed-width"
            value={dialog.lastModified}
            onChange={(e) =>
              this.updateDialog(i, { lastModified: e.target.value })
            }
          />
          &nbsp;
          <Button
            variant="outlined"
            className="btn"
            onClick={(e) => {
              e.preventDefault();
              this.updateDialog(i, { lastModified: new Date().toISOString() });
            }}
          >
            Uppdatera till nu
          </Button>
        </div>
        {this.renderVisibleForGroups(i, dialog)}

        <p>
          <ColorButtonRed
            variant="contained"
            className="btn"
            onClick={(e) => {
              e.preventDefault();
              this.removeDialog(i);
            }}
            startIcon={<DeleteIcon />}
          >
            Ta bort dialog
          </ColorButtonRed>
        </p>
      </div>
    );
  }

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
          {this.state.validationErrors.length > 0 && (
            <div>
              {this.state.validationErrors.map((error, i) => (
                <p key={i} style={{ color: red[700] }}>
                  {error}
                </p>
              ))}
            </div>
          )}
          <div>
            <input
              id="active"
              name="active"
              type="checkbox"
              onChange={(e) => this.setState({ active: e.target.checked })}
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
              onChange={(e) => this.setState({ index: Number(e.target.value) })}
              value={this.state.index}
            />
          </div>

          <div className="separator">Dialoger</div>
          <p>
            <ColorButtonGreen
              variant="contained"
              className="btn"
              onClick={(e) => {
                e.preventDefault();
                this.addDialog();
              }}
              startIcon={<AddIcon />}
            >
              Lägg till dialog
            </ColorButtonGreen>
          </p>
          <div style={{ display: "flex" }}>
            <aside style={{ minWidth: 220, marginRight: 20 }}>
              {this.renderDialogList()}
            </aside>
            <article style={{ flex: 1 }}>{this.renderDialogEditor()}</article>
          </div>
        </form>
      </div>
    );
  }
}

export default ToolOptions;
