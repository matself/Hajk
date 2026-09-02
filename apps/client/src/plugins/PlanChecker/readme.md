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

It is **OGC API Features**, not WFS, despite being widely described as the
latter. Its `/conformance` lists only:

```
ogcapi-features-1/1.0/conf/core
ogcapi-features-1/1.0/conf/oas30
ogcapi-features-1/1.0/conf/geojson
ogcapi-features-2/1.0/conf/crs
```

Three consequences shape this plugin:

1. **There is no `intersects`, only `bbox`.** A click is sent as a small square
   (`clickBufferMeters`) and the result is then narrowed with
   `geometry.intersectsCoordinate()`. Without that second step the tool would
   report regulations whose *bounding box* merely overlaps the click.
2. **`bbox` is read in the collection's storage CRS unless `bbox-crs` says
   otherwise**, and a wrong CRS returns an empty `FeatureCollection` rather than
   an error. Both `bbox-crs` and `crs` are therefore always sent explicitly.
3. **EPSG:3857 is not among the accepted CRS** (the SWEREF 99 zones, RT90 and
   CRS84 are), and a Hajk map is quite likely to be in it. When the map's
   projection is not accepted, the plugin asks in SWEREF 99 TM and lets
   OpenLayers transform both ways — which requires `EPSG:3006` under
   `projections` in the map config. It says so plainly when that is missing.

Data is **one collection per municipality**, keyed by the four-digit kommunkod.

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
| Regulation text | `planbestammelse.bestammelseformulering` |
| Regulation detail | `planbestammelse.anvandningsform` / `kategori` / `underkategori` |

The regulation text arrives as readable Swedish — no lookup against
Planbestämmelsekatalogen is needed, though each carries a
`planbestammelsekatalogreferens` for anyone who wants the canonical entry.

### Requirements

The backend's NGP proxy must be enabled (`LANTMATERIET_DETALJPLAN_ACTIVE`); see
`apps/backend/.env.example`. Credentials stay on the server.

### Example configuration

```jsonc
{
  "type": "planchecker",
  "index": 1,
  "options": {
    "title": "Planbesked",
    "description": "Klicka i kartan och se vilka planbestämmelser som gäller",
    "kommunkod": "1281",        // Four-digit code; one NGP collection per municipality.
    "proxyPath": "detaljplanproxy", // Path below mapserviceBase where the backend proxy sits.
    "clickBufferMeters": 1,     // Half the side of the bbox a click becomes.
    "maxItems": 200,            // Upper bound per click. A dense plan carries many regulations.
    "wmsLayerId": "",           // Hajk id of the styled WMS layer to switch on with the tool.
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
