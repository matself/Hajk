# Verktyg: Visa koordinat (coordinates) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/coordinates.jsx`, codename `coordinates`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Låter användaren klicka i kartan för att se koordinaten i ett eller flera koordinatsystem, med en markörikon vid den klickade punkten.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Ikon** — URL till bild (`src`, standard `marker.png`), Ikonförskjutning X/Y (`anchorX`/`anchorY`, ankarpunkt 0–100 relativt bildens hörn) och Skala för ikon (`scale`) för markören som visas där användaren klickat.
- **Formattera nummer (1000 → 1 000)** (`thousandSeparator`) — visar koordinatvärden med tusentalsavgränsare.
- **Visa projektionsfälten från start** (`showFieldsOnStart`) — om koordinatfälten är synliga direkt vid start, innan användaren klickat i kartan.
- Synlig vid start, Instruktion, Tillträde
- **Transformationer** — listan av koordinatsystem som verktyget visar värden i samtidigt. Varje transformation (formulär längst ner) har: SRS-kod\* (t.ex. `EPSG:3006`), Standard\* (förvalt system när verktyget öppnas), Beskrivning\*, Titel\*, X-etikett\*/Y-etikett\* (t.ex. "Easting"/"Northing" eller "Longitude"/"Latitude"), Precision (antal decimaler), Inverterad (om koordinatordningen ska kastas om — vissa SRS:er anger lat/lon istället för lon/lat). Måste finnas minst en transformation för att verktyget ska fungera.
- **Markhöjd (Lantmäteriet)** *(fork-specifik funktion, ej i uppströms Hajk)* — **Visa markhöjd vid klick i kartan** (`markhojdActive`) slår på en extra rad, "Markhöjd", som hämtar markhöjden för den klickade punkten från Lantmäteriets tjänst Markhöjd Direkt. Anropet görs via backend-proxyn (se nedan), inte direkt mot Lantmäteriet, för att undvika CORS-problem. När aktiverad krävs **Användarnamn\*** (`markhojdUsername`) och **Lösenord\*** (`markhojdPassword`) — kontouppgifter hos Lantmäteriet, skickade som Basic Auth. Fälten markeras röda och sparning blockeras om något av dem saknas medan funktionen är aktiverad. Lösenordet lagras i klartext i kartkonfigurationen (samma nivå av skydd som övriga fält i `map_1.json`) — det är alltså inte en högkänslig hemlighet, utan en administrativ spärr hos Lantmäteriet.

  Rutan visar avrundad höjd (2 decimaler), "Ingen höjddata" om Lantmäteriet svarar utan höjdvärde för punkten, eller "Kunde inte hämta markhöjd" om själva anropet misslyckas (fel användarnamn/lösenord, proxyn inte aktiverad i backend, nätverksfel med mera) — de två felfallen särskils så att användaren inte tror att en trasig uppkoppling betyder att det saknas data.

  **Krävs i backend:** proxyn måste slås på separat i `apps/backend/.env` med `LANTMATERIET_MARKHOJD_ACTIVE=true` (avstängd som standard). `LANTMATERIET_MARKHOJD_BASE_URL` kan sättas för att peka mot Lantmäteriets test-/verifieringsmiljö (`api-ver.lantmateriet.se`) istället för produktion. Är proxyn inte aktiverad i backend fungerar inte funktionen även om den är påslagen här i Admin — se `apps/backend/.env.example`.

---

*Detta dokument beskriver läget i koden per 2026-08-11.*
