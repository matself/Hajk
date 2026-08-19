# Verktyg: Mapillary gatuvy (mapillary) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/mapillary.jsx`, codename `mapillary`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Visar den närmaste Mapillary-bilden till en klickad punkt i kartan, i ett fönster som kan förstoras, med en riktningsmarkör på kartan som följer bilden.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde
- **Access token** (`accessToken`) — Mapillary client access token, se [mapillary.com/dashboard/developers](https://www.mapillary.com/dashboard/developers). Utan giltig token visar verktyget bara ett felmeddelande, ingen bild.
- **Sökradie (meter)** (`searchRadius`, standard 25) — hur nära klickpunkten en bild ska finnas för att räknas som träff.
- **Utökad sökradie (meter)** (`fallbackSearchRadius`, standard 200) — används bara om ingen bild hittas inom den ordinarie sökradien.

I kartan heter verktyget **"Mapillary gatuvy"**, för att skilja det från det separata [Google Street View](admin-tool-streetview.md)-verktyget.

---

*Detta dokument beskriver läget i koden per 2026-08-19.*
