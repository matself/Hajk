## The PlanChecker plugin

Shows which **detaljplanebestämmelser** apply at a clicked point, read live from
Lantmäteriet's national geodata platform (NGP) through Hajk's backend proxy.

### Why the tool exists

NGP splits detaljplan data across two services that are useless apart:

- a **visningstjänst** (WMS) that renders the plans with their official styling
  but answers no `GetFeatureInfo` — you can see the plan, but not query it;
- a **söktjänst** carrying every attribute, but no rendering.

PlanChecker combines them. The WMS is an ordinary Hajk layer, configured in
Admin like any other and switched on with the tool. The söktjänst is queried on
each click and supplies the text.

### What the söktjänst actually is

Its `/conformance` advertises only the OGC API Features classes:

```
ogcapi-features-1/1.0/conf/core
ogcapi-features-1/1.0/conf/oas30
ogcapi-features-1/1.0/conf/geojson
ogcapi-features-2/1.0/conf/crs
```

From that alone you would conclude there is no `intersects` operator, only
`bbox`, and that a click has to be sent as a small square and narrowed with a
point-in-polygon test client-side. **That conclusion is wrong.** The catalog
also serves `POST /search` — an item-search taking a GeoJSON `intersects`
geometry and a `query` filter object — which it never mentions in
`/conformance`. It is what Lantmäteriet's own viewer uses, and it gives an
exact hit test server-side. This plugin uses it.

Data is stored as **one collection per municipality**, keyed by the four-digit
kommunkod, but `/search` is purely locational — it spans every collection and
takes no kommunkod. That is a feature, not a gap: a click near a municipal
boundary finds the plan on the other side of it, and nothing has to know which
municipality it is looking at.

Geometries travel in **SWEREF 99 TM (EPSG:3006)**, the collections' storage CRS,
in both directions. When the map runs in something else — EPSG:3857 is the
common case, and is *not* among the CRS the service accepts — the plugin
transforms, which requires `EPSG:3006` under `projections` in the map config.
It says so plainly when that is missing.

### Three searches per click

Mirroring Lantmäteriet's viewer:

| # | Body | Answers |
| --- | --- | --- |
| 1 | `intersects` + `feature.typ = detaljplan` (+ status filter) | Which plans cover the point. These "huvudobjekt" carry the plan's name, dates and documents, but no regulation of their own. |
| 2 | `detaljplan.objektidentitet = <id>` + `intersects` | That plan's regulations **at the point**. |
| 3 | `detaljplan.objektidentitet = <id>` | **All** of that plan's regulations. |

2 and 3 run in parallel per plan. The pair is what lets each heading read
"Egenskapsbestämmelser — 1 av 8 st" and lets the user widen from the clicked
point to the whole plan.

Note that the plan's `assets` are read from the **raw STAC item**, not through
OpenLayers. A STAC item keeps `assets` beside `properties` rather than inside
it, and `ol/format/GeoJSON` lifts only `properties` — parse the response as
OpenLayers features and the plan's documents vanish silently.

### Coverage is partial, and the UI must say so

NGP holds only plans delivered under the national specification — overwhelmingly
recent ones. Most municipalities' gällande detaljplaner are older and simply are
not there. A tool that returned nothing would be read as "no restrictions here",
which is wrong and potentially costly, so the empty state says explicitly that
no *digital* plan was found and that this is not the same as no plan.

### Data shape

Each feature is one *(plan, regulation, geometry)* triple with the plan's own
metadata repeated on it, so grouping needs no second request:

| Shown as | NGP path |
| --- | --- |
| Plan heading | `detaljplan.namn`, `detaljplan.beteckning` |
| Plan status | `detaljplan.status`, `detaljplan.datumLagakraft` |
| Regulation grouping | `feature.typ` |
| Documents | item `assets` (Plankarta, Planhandling, Beslutsprotokoll) |

The document links need proxying of their own. Their `href` points at
Lantmäteriet's **download** endpoint — a sibling path to the söktjänst, not
below it — behind the same credentials, so following one directly puts up a
browser login prompt nobody can answer. The plugin rewrites each href onto
`assetProxyPath`; anything not matching that shape is left untouched rather
than mangled.
| Regulation text | `planbestammelse.bestammelseformulering` |
| Regulation detail | `planbestammelse.anvandningsform` / `kategori` / `underkategori` |

The regulation text arrives as readable Swedish — no lookup against
Planbestämmelsekatalogen is needed, though each carries a
`planbestammelsekatalogreferens` for anyone who wants the canonical entry.

### Requirements

Two things, and neither fails loudly if forgotten:

1. **The backend's NGP proxy must be enabled** — `LANTMATERIET_DETALJPLAN_ACTIVE=true`
   in `apps/backend/.env`, plus credentials; see `.env.example`. When it is not
   enabled nothing is mounted at the route, and the request falls through to
   `express-openapi-validator`, which answers **404 "Not Found: not found"**.
   That 404 means the proxy is off, not that the path is wrong. The backend logs
   which it did at startup: *"LANTMATERIET_DETALJPLAN_ACTIVE is set to … Enabling
   Lantmateriet Detaljplan proxy for API V2"*.
2. **A styled WMS layer, in the map, referenced by `wmsLayerId`.** The
   söktjänst renders nothing, so the WMS is the whole visual half of the tool.
   Note that a layer in `layers.json` is not enough — `layerLoader.flatten()`
   builds the map's layers from the LayerSwitcher's `baselayers` and `groups`
   alone, and the backend strips unreferenced layers from the config before it
   reaches the browser. A layer not placed in the LayerSwitcher tree is never
   added to the map at all.

### The plugin never touches layer visibility

Switching layers on and off is the user's business. The tool watches the plan
layer instead of commanding it, and says so when something is wrong:

| State | What the user sees |
| --- | --- |
| `wmsLayerId` not configured | A warning that no plan layer is connected, naming the setting |
| Layer missing from the map | A warning naming the configured id, pointing at Lagerhanteraren and the tool's setting |
| Layer present but switched off | A note that the layer is off and where to light it, making clear the search still works |
| Layer present and visible | Nothing |

The check subscribes to the layer's `change:visible`, so lighting the layer
clears the notice immediately rather than at the next click. Absence is only
concluded after retrying for about five seconds, because layers load
asynchronously and a layer missing at first render usually is not.

### Example configuration

```jsonc
{
  "type": "planchecker",
  "index": 1,
  "options": {
    "title": "Detaljplan",
    "description": "Klicka i kartan och se vilka planbestämmelser som gäller",
    "proxyPath": "detaljplanproxy", // Path below mapserviceBase where the backend proxy sits.
    "assetProxyPath": "detaljplanassetproxy", // …and where the document proxy sits.
    "planStatuses": ["laga kraft"], // Which plan statuses count. A plan not in force regulates nothing.
    "maxItems": 1000,           // Upper bound per plan. Lantmäteriet's own viewer sends 1000.
    "wmsLayerId": "abc123",     // Hajk id (from layers.json) of the styled WMS layer the tool
                                // watches. Leaving it empty is itself reported, so a tool that
                                // was never configured does not look like a working one.
    "visibleAtStart": false,
    "target": "control",
    "position": "right",
    "height": "dynamic"
  }
}
```

### Known gaps

- **No Admin editor yet.** The options above are edited by hand in the map
  config; there is no `apps/admin/src/views/tools/planchecker.jsx`.
- **Presentation is deliberately plain.** The readable report format, and any
  use of the plan's `assets` (Planbeskrivning, Plankarta, Beslutsprotokoll),
  are still to come.
- **Only the first page is read.** The service pages with an `afterId` cursor;
  a click hitting more than `maxItems` regulations is reported as truncated
  rather than followed.
