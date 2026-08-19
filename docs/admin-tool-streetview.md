# Verktyg: Google Street View (streetview) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/streetview.jsx`, codename `streetview`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Visar Googles Street View-panorama i ett fönster när användaren klickar i kartan.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde
- **API-nyckel** (`apiKey`) — Google Maps JavaScript API-nyckel. Byt ut den förifyllda standardnyckeln mot en egen för skarp drift.

I kartan heter verktyget **"Google Street View"**, för att skilja det från det separata [Mapillary gatuvy](admin-tool-mapillary.md)-verktyget.

---

*Detta dokument beskriver läget i koden per 2026-08-19.*
