# AddressSearch

Searches Lantmäteriet's **Belägenhetsadress Direkt** (v4.2) for Swedish addresses
and moves the map to the one the user picks. Optionally works the other way too:
click in the map and the plugin fetches the nearest address.

This is a fork-only plugin (`matself/Hajk`); it does not exist upstream. For the
administrator's view of the same tool - what each field does, and how to get it
running - see [docs/admin-tool-addresssearch.md](../../../../../docs/admin-tool-addresssearch.md).

## Files

| File                    | Holds                                                |
| ----------------------- | ---------------------------------------------------- |
| `AddressSearch.jsx`     | The `BaseWindowPlugin` wrapper.                      |
| `AddressSearchView.jsx` | The field, the result list and the map-pick toggle.  |
| `AddressSearchModel.js` | The map: layer, marker, projections, click lock.     |
| `AddressSearchApi.js`   | The HTTP layer: credentials, aborts, error messages. |
| `addressFormat.js`      | Everything that depends on the API's field names.    |
| `constants/index.js`    | Frozen defaults and the SRIDs the API accepts.       |

The split follows where change comes from: `addressFormat.js` is the file to
edit when the API's response shape moves, and nothing else needs touching.

## How it talks to the API

Nothing is called directly. Every request goes to the backend proxy at
`{mapserviceBase}/belagenhetsadressproxy`, which attaches the credentials and
forwards it to Lantmäteriet. See `LANTMATERIET_BELAGENHETSADRESS_*` in the
backend's `.env.example`. Basic auth with a Geotorget user is what the service
asks for; a bearer token works where the subscription grants the scope.

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

## Response shapes

Verified against live v4.2 responses. The two families of endpoints answer
differently, which is the one thing to know before changing this code.

The reference and autocomplete endpoints return flat objects with a ready-made
label:

```json
{
  "adress": "Täby Täby Lantmätarvägen 2 18753 Täby",
  "objektidentitet": "76e01bf5-4e3f-402e-867a-107b21c2c17f"
}
```

That label names the municipality twice - once as kommun, once as kommundel -
so the plugin asks for `splitAdress=true` and builds its own from the
components, matching the format used for map clicks. **The component field
names are not yet confirmed against a live response**: `composeReferenceLabel`
looks for the names the rest of the API uses (`COMPONENT_*` in the model), and
falls back to the flat label when it does not recognise them, which is never
worse than not asking. When that happens it logs the object once to the
console, naming what to add.

The address endpoints (`/{id}`, `/punkt`) return GeoJSON whose properties nest
the parts and carry **no label at all**, so the plugin composes one:

| Value                           | Path in `properties`                         |
| ------------------------------- | -------------------------------------------- |
| Street name                     | `adressomrade.faststalltNamn`                |
| Number (with any letter suffix) | `adressplatsattribut.adressplatsbeteckning`  |
| Postal code / town              | `adressplatsattribut.postnummer`, `.postort` |
| Municipality                    | `adressomrade.kommundel.kommun.kommunnamn`   |
| Point placement                 | `adressplatsattribut.insamlingslage`         |

`insamlingslage` says what the coordinate was measured against - "Byggnad",
"Ingång" and so on - which decides how literally the marker should be read: an
entrance point sits on the street side of the building, a building point
somewhere within its footprint. The plugin shows it beneath the field as
"Adresspunktens läge: …".

`composeAddressLabel` produces `Vallatorpsvägen 6, 187 52 Täby` - deliberately
shorter than the reference label, which names the municipality twice, once as
kommun and once as kommundel.

The GeoJSON carries `crs: urn:ogc:def:crs:EPSG::3006`. OpenLayers resolves that
URN itself, and produces the same coordinate as an explicit transform, so the
plugin passes `dataProjection` and lets it be.

## One thing to know before extending this

The JSON schema for the _reference_ responses is not published outside
Geotorget, so `AddressSearchModel` reads the id and the label by trying the
field names the API is known to use (`ID_FIELDS`, `LABEL_FIELDS`). If a search
returns hits but the list stays empty, look in the browser console: the model
logs the object it could not read, and the fix is to add that field name to the
list.
