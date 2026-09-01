# AddressSearch

Searches Lantmäteriet's **Belägenhetsadress Direkt** (v4.2) for Swedish addresses
and moves the map to the one the user picks. Optionally works the other way too:
click in the map and the plugin fetches the nearest address.

This is a fork-only plugin (`matself/Hajk`); it does not exist upstream.

## How it talks to the API

Nothing is called directly. Every request goes to the backend proxy at
`{mapserviceBase}/belagenhetsadressproxy`, which forwards it to Lantmäteriet and
attaches the bearer token. See `LANTMATERIET_BELAGENHETSADRESS_*` in the
backend's `.env.example`.

Searching is two calls, because the API separates the label from the geometry:

| Step      | Endpoint                                      | Why                                                                                                                  |
| --------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Typing    | `GET /referens/fritext?adress=…`              | Returns references (label + id) only. Cheap enough to run on every pause in the typing.                              |
| Selecting | `GET /{id}?includeData=basinformation&srid=…` | Returns the address as a GeoJSON `FeatureCollection`, so we only fetch geometry for the one address that was chosen. |
| Map click | `GET /punkt?punktSrid=…&koordinater=…`        | Nearest address to a coordinate. Note the API wants `northing,easting`, the reverse of OpenLayers' order.            |

`includeData` matters: the API returns _nothing_ about an address unless it is
given, so leaving it out yields empty features rather than an error.

## Projections

The product speaks SWEREF 99 only (EPSG:3006-3018) - there is no WGS84 option.
The plugin therefore asks for the map's own projection when the API supports it,
which is the normal case for a Swedish map and means no transformation happens
at all. Otherwise it falls back to EPSG:3006 and transforms.

That fallback needs `EPSG:3006` listed under `projections` in the map config,
since that is the only place OpenLayers learns about it. If it is missing, the
plugin says so rather than failing silently.

## Options

Configurable per map in Admin (`Verktyg → Adressök`); defaults live in
`constants/index.js`.

| Option                 | Default                  | Notes                                                                                                          |
| ---------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `token`                | `""`                     | Bearer token, sent by the browser. Leave empty when the backend holds it in `.env`, which is the better place. |
| `maxHits`              | `15`                     | Max results per search (API allows up to 500).                                                                 |
| `debounceTime`         | `350`                    | Milliseconds after the last keystroke before searching.                                                        |
| `kommunkod`            | `""`                     | Four-digit municipality code to restrict to. Empty = all of Sweden.                                            |
| `onlyCurrentAddresses` | `true`                   | Excludes `Reserverad` addresses, which are assigned but not yet in use.                                        |
| `zoom`                 | `16`                     | Address points have no extent, so there is nothing to fit to.                                                  |
| `enableMapClick`       | `true`                   | Shows the pick-from-map button.                                                                                |
| `proxyPath`            | `belagenhetsadressproxy` | Only change if the proxy was mounted elsewhere.                                                                |

## One thing to know before extending this

The JSON schema for the _reference_ responses is not published outside
Geotorget, so `AddressSearchModel` reads the id and the label by trying the
field names the API is known to use (`ID_FIELDS`, `LABEL_FIELDS`). If a search
returns hits but the list stays empty, look in the browser console: the model
logs the object it could not read, and the fix is to add that field name to the
list.
