# Verktyg: Visa koordinat (coordinates) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/coordinates.jsx`, codename `coordinates`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Låter användaren klicka i kartan för att se koordinaten i ett eller flera koordinatsystem, med en markörikon vid den klickade punkten.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Ikon** — URL till bild (`src`, standard `marker.png`), Ikonförskjutning X/Y (`anchorX`/`anchorY`, ankarpunkt 0–100 relativt bildens hörn) och Skala för ikon (`scale`) för markören som visas där användaren klickat.
- **Formattera nummer (1000 → 1 000)** (`thousandSeparator`) — visar koordinatvärden med tusentalsavgränsare.
- **Visa projektionsfälten från start** (`showFieldsOnStart`) — om koordinatfälten är synliga direkt vid start, innan användaren klickat i kartan.
- Synlig vid start, Instruktion, Tillträde
- **Transformationer** — listan av koordinatsystem som verktyget visar värden i samtidigt. Varje transformation (formulär längst ner) har: SRS-kod\* (t.ex. `EPSG:3006`), Standard\* (förvalt system när verktyget öppnas), Beskrivning\*, Titel\*, X-etikett\*/Y-etikett\* (t.ex. "Easting"/"Northing" eller "Longitude"/"Latitude"), Precision (antal decimaler), Inverterad (om koordinatordningen ska kastas om — vissa SRS:er anger lat/lon istället för lon/lat). Måste finnas minst en transformation för att verktyget ska fungera.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
