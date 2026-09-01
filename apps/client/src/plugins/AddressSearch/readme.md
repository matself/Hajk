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

| Option                  | Default                  | Notes                                                                                                                                              |
| ----------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `username` / `password` | `""`                     | Geotorget credentials for Basic auth - what these endpoints ask for. Leave empty when the backend holds them in `.env`, which is the better place. |
| `token`                 | `""`                     | Bearer token, an alternative to the pair above and used before it when set.                                                                        |
| `maxHits`               | `15`                     | Max results per search (API allows up to 500).                                                                                                     |
| `debounceTime`          | `350`                    | Milliseconds after the last keystroke before searching.                                                                                            |
| `kommunkod`             | `""`                     | Four-digit municipality code to restrict to. Empty = all of Sweden.                                                                                |
| `onlyCurrentAddresses`  | `true`                   | Excludes `Reserverad` addresses, which are assigned but not yet in use.                                                                            |
| `zoom`                  | `16`                     | Address points have no extent, so there is nothing to fit to.                                                                                      |
| `enableMapClick`        | `true`                   | Shows the pick-from-map button.                                                                                                                    |
| `proxyPath`             | `belagenhetsadressproxy` | Only change if the proxy was mounted elsewhere.                                                                                                    |

## When the service refuses

Two failures here look alike and are not. A `401` carrying
`WWW-Authenticate: Basic` means the service wants Geotorget username and
password, not a bearer token - the products under
`api.lantmateriet.se/distribution` do not agree on one scheme, and Markhöjd next
door uses Basic too. A `403` with gateway code `900910` means the opposite: the
token is genuine, but its scope does not cover that endpoint, and entitlements
can differ per group of operations.

To see which credential opens what:

```bash
cd apps/backend
npm run check-belagenhetsadress                            # uses .env
npm run check-belagenhetsadress -- "eyJ…" "user:password"  # or these
```

It prints the token's scope, issuer and expiry, then calls one endpoint from
each group (health, autocomplete, referens, punkt) with every credential given
and prints the result as a matrix, so which scheme works is visible at a glance.

## One thing to know before extending this

The JSON schema for the _reference_ responses is not published outside
Geotorget, so `AddressSearchModel` reads the id and the label by trying the
field names the API is known to use (`ID_FIELDS`, `LABEL_FIELDS`). If a search
returns hits but the list stays empty, look in the browser console: the model
logs the object it could not read, and the fix is to add that field name to the
list.
