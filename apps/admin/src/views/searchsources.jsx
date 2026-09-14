import React, { Component } from "react";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Chip from "@material-ui/core/Chip";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";
import CircularProgress from "@material-ui/core/CircularProgress";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import WarningIcon from "@material-ui/icons/Warning";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import SaveIcon from "@material-ui/icons/SaveSharp";

import { hfetch } from "utils/FetchWrapper";
import { prepareProxyUrl } from "../utils/ProxyHelper";
import {
  buildUnifiedSources,
  findOverlaps,
  findIdCollisions,
  findUnlinked,
  findDanglingReferences,
} from "../utils/searchSourceLint";
import { clearWmsSublayerSearchConfig } from "../utils/searchSource";
import SearchSourceForm from "./components/SearchSourceForm";

const defaultState = {
  loading: true,
  error: null,
  layersStore: null,
  sources: [],
  overlaps: [],
  idCollisions: [],
  unlinkedIds: new Set(),
  overlapIds: new Set(),
  collisionIds: new Map(),
  dangling: [],
  formOpen: false,
  // null (add wfslayer) | {kind:"wfslayer", raw} | {kind:"wmssublayer", wmsLayer, sublayerId}
  formTarget: null,
  saving: false,
  saveError: null,
  // null | {kind, caption, ...enough to act on confirm}
  deleteTarget: null,
  deleting: false,
  deleteError: null,
};

/**
 * The Söklager Console: a unified list of every search source Hajk knows
 * about (wfslayer söklager and WMS sublayers carrying search config), with
 * lint checks that no existing screen surfaces (P0), add/edit/delete for
 * wfslayer söklager (P1), and in-place editing of a WMS sublayer's search
 * config (P1 follow-up) — the consolidation Mats actually asked for: no more
 * "go edit this in the Lager tab instead".
 *
 * The WMS-sublayer write is deliberately narrow: settings/wmslayer replaces
 * the *entire* WMS layer object (owned by the 2,557-line Lager form), so the
 * payload is always built by spreading the edited search fields onto the
 * originally loaded object (see searchSource.js#toWmsSublayer) - every other
 * field, and every other sublayer, travels through completely untouched.
 * Structural changes to a WMS layer (which sublayers exist, their styling,
 * auth, etc.) still belong to the Lager tab.
 *
 * Purely additive — the legacy Söktjänster tab (views/search.jsx,
 * models/search.js) and the WMS layer form stay registered and untouched.
 */
export default class SearchSources extends Component {
  constructor(props) {
    super(props);
    this.state = defaultState;
  }

  componentDidMount() {
    this.load({ refetchMaps: true });
  }

  url(key, suffix = "") {
    const config = this.props.config || {};
    return prepareProxyUrl(config[key] + suffix, config.url_proxy);
  }

  // `refetchMaps` controls whether map JSON configs are re-fetched over the
  // network. Editing a söklager only ever changes layersStore, never any
  // map's own tool config, so a post-save/delete refresh (refetchMaps:
  // false, the default) reuses `this.mapConfigsCache` - a plain instance
  // field, not state, since it's a cache the component doesn't render from
  // directly - and only recomputes findDanglingReferences against the fresh
  // layersStore. Only the initial mount needs `refetchMaps: true`.
  load({ refetchMaps = false } = {}) {
    // The backend sends no cache-control header, so a plain fetch can serve a
    // stale response right after editing a source — including right after
    // this view's own save/delete calls.
    hfetch(this.url("url_layers"), { cache: "no-store" })
      .then((res) => res.json())
      .then((layersStore) => {
        const sources = buildUnifiedSources(layersStore);
        const overlaps = findOverlaps(sources);
        const idCollisions = findIdCollisions(sources, layersStore);
        const unlinked = findUnlinked(sources);

        const overlapIds = new Set();
        overlaps.forEach(({ a, b }) => {
          overlapIds.add(a.kind + ":" + a.id);
          overlapIds.add(b.kind + ":" + b.id);
        });
        const collisionIds = new Map();
        idCollisions.forEach((c) => {
          const key = c.source.kind + ":" + c.source.id;
          if (!collisionIds.has(key)) collisionIds.set(key, []);
          collisionIds.get(key).push(c.collidesWithParentCaption);
        });
        const unlinkedIds = new Set(unlinked.map((s) => s.kind + ":" + s.id));

        this.setState({
          layersStore,
          sources,
          overlaps,
          idCollisions,
          unlinkedIds,
          overlapIds,
          collisionIds,
          loading: false,
        });

        if (refetchMaps || !this.mapConfigsCache) {
          this.loadDanglingReferences(layersStore);
        } else {
          this.recomputeDangling(layersStore);
        }
      })
      .catch((error) => {
        console.error(error);
        this.setState({ loading: false, error: error.message });
      });
  }

  loadDanglingReferences(layersStore) {
    hfetch(this.url("url_map_list"), { cache: "no-store" })
      .then((res) => res.json())
      .then((mapNames) => {
        return Promise.all(
          mapNames.map((mapName) =>
            hfetch(this.url("url_map", "/" + mapName), { cache: "no-store" })
              .then((res) => res.json())
              .then((mapConfig) => [mapName, mapConfig])
              .catch(() => [mapName, null])
          )
        );
      })
      .then((entries) => {
        this.mapConfigsCache = entries.filter(([, cfg]) => cfg !== null);
        this.recomputeDangling(layersStore);
      })
      .catch((error) => console.error(error));
  }

  // Reuses whatever map configs are already cached - no network request -
  // to recheck dangling references against a layersStore that just changed.
  recomputeDangling(layersStore) {
    const perMap = (this.mapConfigsCache || []).map(([mapName, mapConfig]) =>
      findDanglingReferences(mapName, mapConfig, layersStore)
    );
    this.setState({ dangling: perMap.flat() });
  }

  findRawWfsLayer(id) {
    return (this.state.layersStore?.wfslayers || []).find((l) => l.id === id);
  }

  findWmsLayer(id) {
    return (this.state.layersStore?.wmslayers || []).find((l) => l.id === id);
  }

  openAddForm() {
    this.setState({ formOpen: true, formTarget: null, saveError: null });
  }

  openEditForm(source) {
    const formTarget =
      source.kind === "wfslayer"
        ? { kind: "wfslayer", raw: this.findRawWfsLayer(source.id) }
        : {
            kind: "wmssublayer",
            wmsLayer: this.findWmsLayer(source.pid),
            sublayerId: source.id,
          };
    this.setState({ formOpen: true, formTarget, saveError: null });
  }

  closeForm() {
    this.setState({ formOpen: false, formTarget: null, saveError: null });
  }

  handleSave(payload) {
    this.setState({ saving: true, saveError: null });
    const isWmsSublayer = this.state.formTarget?.kind === "wmssublayer";
    const url = isWmsSublayer
      ? this.url("url_wmslayer_settings")
      : this.url("url_layer_settings");
    const method = isWmsSublayer
      ? "PUT" // the WMS layer always already exists
      : payload.id !== null
      ? "PUT"
      : "POST";
    hfetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        this.setState({ saving: false, formOpen: false, formTarget: null });
        this.load();
      })
      .catch((error) => {
        this.setState({
          saving: false,
          saveError:
            "Kunde inte spara: " + (error.message || "okänt fel") + ".",
        });
      });
  }

  openDeleteConfirm() {
    const target = this.state.formTarget;
    if (!target) return;
    if (target.kind === "wfslayer") {
      this.setState({
        deleteTarget: {
          kind: "wfslayer",
          id: target.raw.id,
          caption: target.raw.caption,
        },
        deleteError: null,
      });
    } else {
      const sublayer = target.wmsLayer.layersInfo.find(
        (sl) => sl.id === target.sublayerId
      );
      this.setState({
        deleteTarget: {
          kind: "wmssublayer",
          wmsLayer: target.wmsLayer,
          sublayerId: target.sublayerId,
          caption: sublayer?.caption || target.sublayerId,
        },
        deleteError: null,
      });
    }
  }

  closeDeleteConfirm() {
    this.setState({ deleteTarget: null, deleteError: null });
  }

  confirmDelete() {
    const target = this.state.deleteTarget;
    if (!target) return;
    this.setState({ deleting: true, deleteError: null });

    const request =
      target.kind === "wfslayer"
        ? hfetch(this.url("url_layer_settings", "/" + target.id), {
            method: "DELETE",
          })
        : hfetch(this.url("url_wmslayer_settings"), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              clearWmsSublayerSearchConfig(target.wmsLayer, target.sublayerId)
            ),
          });

    request
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        this.setState({
          deleting: false,
          deleteTarget: null,
          formOpen: false,
          formTarget: null,
        });
        this.load();
      })
      .catch((error) => {
        this.setState({
          deleting: false,
          deleteError:
            "Kunde inte radera: " + (error.message || "okänt fel") + ".",
        });
      });
  }

  renderWarnings(source) {
    const key = source.kind + ":" + source.id;
    const chips = [];
    if (this.state.overlapIds.has(key)) {
      chips.push(
        <Tooltip
          key="overlap"
          title="Delar url och lager med en annan sökkälla – samma resultat kan visas dubbelt"
        >
          <Chip
            size="small"
            icon={<WarningIcon />}
            label="Överlapp"
            style={{ marginRight: 4 }}
          />
        </Tooltip>
      );
    }
    if (this.state.collisionIds.has(key)) {
      const others = this.state.collisionIds.get(key).join(", ");
      chips.push(
        <Tooltip
          key="collision"
          title={
            "Id:t finns även som underlager hos: " +
            others +
            " – searchInVisibleLayers kan slå på fel källa när det lagret blir synligt"
          }
        >
          <Chip
            size="small"
            icon={<WarningIcon />}
            label="Id-krock"
            style={{ marginRight: 4 }}
          />
        </Tooltip>
      );
    }
    return chips;
  }

  renderSourceRows() {
    return this.state.sources.map((source) => {
      const key = source.kind + ":" + source.id;
      const linked = !this.state.unlinkedIds.has(key);
      return (
        <TableRow key={key}>
          <TableCell>
            {source.kind === "wfslayer" ? "Söklager" : "WMS-underlager"}
          </TableCell>
          <TableCell>{source.caption}</TableCell>
          <TableCell style={{ fontFamily: "monospace", fontSize: 12 }}>
            {source.id}
          </TableCell>
          <TableCell>
            {linked ? (
              <Tooltip title={"pid: " + source.pid}>
                <span>{source.parentCaption || source.pid}</span>
              </Tooltip>
            ) : (
              <Tooltip title="Ingen pid – knuten WMS-funktionalitet (visa/dölj motsvarande kartlager) är inaktiv för denna källa">
                <span style={{ color: "#999" }}>Ej kopplad</span>
              </Tooltip>
            )}
          </TableCell>
          <TableCell
            style={{
              maxWidth: 320,
              minWidth: 180,
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {source.url}
          </TableCell>
          <TableCell>{source.layers.join(", ")}</TableCell>
          <TableCell>{this.renderWarnings(source)}</TableCell>
          <TableCell>
            <IconButton
              size="small"
              title="Redigera sökkonfiguration"
              onClick={() => this.openEditForm(source)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
      );
    });
  }

  renderDangling() {
    if (this.state.dangling.length === 0) return null;
    return (
      <div style={{ marginTop: 32 }}>
        <Typography variant="h6">
          Trasiga referenser i kartkonfigurationer
        </Typography>
        <Typography variant="body2" style={{ marginBottom: 12 }}>
          Id:n i en kartas sökverktygsinställningar som inte längre finns i
          lagerlistan. Dessa syns idag bara som en console.warn i webbläsaren.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Karta</TableCell>
              <TableCell>Fält</TableCell>
              <TableCell>Saknat id</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {this.state.dangling.map((d, i) => (
              <TableRow key={i}>
                <TableCell>{d.mapName}</TableCell>
                <TableCell style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {d.field}
                </TableCell>
                <TableCell style={{ fontFamily: "monospace", fontSize: 12 }}>
                  {d.id}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  renderForm() {
    const config = this.props.config || {};
    const target = this.state.formTarget;
    const title =
      target?.kind === "wmssublayer"
        ? "Redigera sökkonfiguration (WMS-underlager)"
        : target?.kind === "wfslayer"
        ? "Redigera söklager"
        : "Lägg till söklager";
    // scroll="paper" (the default) keeps the Dialog itself sized to the
    // viewport and scrolls only DialogContent - so DialogTitle and
    // DialogActions below stay fixed and Save/Cancel/Delete never require
    // scrolling past the whole form to reach.
    return (
      <Dialog
        open={this.state.formOpen}
        onClose={() => !this.state.saving && this.closeForm()}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>{title}</DialogTitle>
        <DialogContent dividers>
          {this.state.saveError && (
            <Typography color="error" style={{ marginBottom: 12 }}>
              {this.state.saveError}
            </Typography>
          )}
          <SearchSourceForm
            editTarget={target}
            defaultUrl={config.url_default_server}
            urlProxy={config.url_proxy}
            wmsLayers={this.state.layersStore?.wmslayers}
            onSave={(payload) => this.handleSave(payload)}
          />
        </DialogContent>
        <DialogActions>
          {target && (
            <Button
              style={{ marginRight: "auto", color: "#b71c1c" }}
              onClick={() => this.openDeleteConfirm()}
              disabled={this.state.saving}
              startIcon={<DeleteIcon />}
            >
              {target.kind === "wmssublayer" ? "Ta bort sökkonfig" : "Radera"}
            </Button>
          )}
          <Button onClick={() => this.closeForm()} disabled={this.state.saving}>
            Avbryt
          </Button>
          <Button
            type="submit"
            form="search-source-form"
            variant="contained"
            color="primary"
            disabled={this.state.saving}
            startIcon={
              this.state.saving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
          >
            {target ? "Spara" : "Lägg till"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  renderDeleteConfirm() {
    const target = this.state.deleteTarget;
    const isWmsSublayer = target?.kind === "wmssublayer";
    return (
      <Dialog
        open={!!target}
        onClose={() => !this.state.deleting && this.closeDeleteConfirm()}
      >
        <DialogTitle>
          {isWmsSublayer ? "Ta bort sökkonfiguration?" : "Radera söklager?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isWmsSublayer ? (
              <>
                Sökkonfigurationen för underlagret "{target?.caption}" tas bort.
                Lagret finns kvar i kartan och Lager-fliken precis som innan,
                men slutar vara sökbart tills sökkonfiguration läggs till igen.
              </>
            ) : (
              <>"{target?.caption}" kommer att tas bort permanent.</>
            )}{" "}
            En säkerhetskopia sparas automatiskt i App_Data/.backups innan filen
            skrivs.
          </DialogContentText>
          {this.state.deleteError && (
            <Typography color="error">{this.state.deleteError}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => this.closeDeleteConfirm()}
            disabled={this.state.deleting}
          >
            Avbryt
          </Button>
          <Button
            onClick={() => this.confirmDelete()}
            disabled={this.state.deleting}
            style={{ color: "#b71c1c" }}
            startIcon={
              this.state.deleting ? (
                <CircularProgress size={16} />
              ) : (
                <DeleteIcon />
              )
            }
          >
            {isWmsSublayer ? "Ta bort" : "Radera"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  render() {
    if (this.state.loading) {
      return (
        <div style={{ padding: 32 }}>
          <CircularProgress />
        </div>
      );
    }
    if (this.state.error) {
      return (
        <div style={{ padding: 32 }}>
          <Typography color="error">
            Kunde inte hämta lagerlistan: {this.state.error}
          </Typography>
        </div>
      );
    }
    return (
      <div style={{ padding: 32 }}>
        <Typography variant="h5" gutterBottom>
          Söklager – konsol
        </Typography>
        <Typography variant="body2" style={{ marginBottom: 16 }}>
          Samlad vy över alla sökkällor: söklager (wfslayer) och WMS-underlager
          med sökkonfiguration. Sökkonfigurationen för båda redigeras här,
          direkt — inklusive för WMS-underlager, som tidigare bara kunde
          redigeras i Lager-fliken. Att lägga till eller ta bort själva
          WMS-lagret, eller ändra dess stil/synlighet/behörigheter, görs
          fortfarande i Lager-fliken.
        </Typography>

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => this.openAddForm()}
          style={{ marginBottom: 16 }}
        >
          Lägg till söklager
        </Button>

        <div style={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Typ</TableCell>
                <TableCell>Namn</TableCell>
                <TableCell>Id</TableCell>
                <TableCell>Kopplat kartlager</TableCell>
                <TableCell>Url</TableCell>
                <TableCell>Lager</TableCell>
                <TableCell>Varningar</TableCell>
                <TableCell>Åtgärd</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{this.renderSourceRows()}</TableBody>
          </Table>
        </div>

        {this.renderDangling()}
        {this.renderForm()}
        {this.renderDeleteConfirm()}
      </div>
    );
  }
}
