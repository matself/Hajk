## The OsmSearch-plugin

Lets the user search for places using the [OSM Nominatim](https://nominatim.org/release-docs/latest/api/Search/) geocoding service. On selecting a result, the map zooms/pans to it and a marker is placed at its location.

### Options (admin)

- `endpoint`: Nominatim search endpoint. Defaults to the public `https://nominatim.openstreetmap.org/search`. Point this at a self-hosted instance to avoid the public usage-policy rate limits.
- `limit`: Max number of results to request. Defaults to `10`.
- `countrycodes`: Comma-separated ISO 3166-1 alpha-2 codes to restrict results to (e.g. `"se"`). Empty by default (no restriction).
- `zoomToBoundingBox`: Whether to zoom to the result's bounding box (`true`, default) or just pan/zoom to a fixed level around its point.

### Notes

- All requests go directly from the browser to the configured `endpoint` — there's no backend proxy. The public Nominatim instance has a strict [usage policy](https://operations.osmfoundation.org/policies/nominatim/) (rate limits, required attribution). For production use with meaningful traffic, point `endpoint` at a self-hosted Nominatim instance or a backend proxy instead.
- Loosely based on the search logic in [Nominatim-Qgis-Plugin](https://github.com/xcaeag/Nominatim-Qgis-Plugin) — ported from its Python/QGIS implementation (`nominatim/logic/tools.py`) to a plain `fetch()` call.
