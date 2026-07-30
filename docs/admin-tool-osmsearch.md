# Verktyg: OSM-sökning (osmsearch) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/osmsearch.jsx`, codename `osmsearch`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. En enkel platssökning mot Nominatim (OpenStreetMaps geokodningstjänst) — kräver ingen backend-konfiguration i Hajk, sökningen går direkt från webbläsaren till den angivna endpointen.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Nominatim-endpoint** (`endpoint`, standard `https://nominatim.openstreetmap.org/search`) — peka mot en egen Nominatim-instans för att undvika begränsningarna i OSM:s publika usage policy (hastighetsgränser, obligatorisk attribution).
- **Max antal träffar** (`limit`, 1–50).
- **Landskoder** (`countrycodes`) — kommaseparerade ISO 3166-1 alpha-2-koder (t.ex. `se,dk,no`) för att begränsa sökträffar geografiskt. Tomt = ingen begränsning.
- **Zooma till träffens bounding box** (`zoomToBoundingBox`) — annars panorerar/zoomar kartan bara till träffens punktkoordinat.
- Synlig vid start, Tillträde

Saknar det generella "Instruktion"-fältet.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
