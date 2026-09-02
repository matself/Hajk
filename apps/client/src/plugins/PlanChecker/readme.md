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
2. **A styled WMS layer configured and referenced by `wmsLayerId`.** The
   söktjänst renders nothing, so the WMS is the whole visual half of the tool.

### Example configuration

```jsonc
{
  "type": "planchecker",
  "index": 1,
  "options": {
    "title": "Planbesked",
    "description": "Klicka i kartan och se vilka planbestämmelser som gäller",
    "proxyPath": "detaljplanproxy", // Path below mapserviceBase where the backend proxy sits.
    "planStatuses": ["laga kraft"], // Which plan statuses count. A plan not in force regulates nothing.
    "maxItems": 1000,           // Upper bound per plan. Lantmäteriet's own viewer sends 1000.
    "wmsLayerId": "abc123",     // Hajk id (from layers.json) of the styled WMS layer to switch
                                // on with the tool. Effectively required: the söktjänst has no
                                // rendering, so without it results refer to plans the user
                                // cannot see. A warning is logged if the id matches no layer.
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
