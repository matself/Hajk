# XYZ-lagerformulär — fältguide

Konfigurationsformulär: `apps/admin/src/views/layerforms/xyzlayerform.jsx`, codename `XYZ`. Se [admin-layermanager.md](admin-layermanager.md) för skalet runt formuläret (kartval, lagerlista, lägg till/redigera-flödet).

Det enklaste av lagerformulären — inga separata sublager, ingen capabilities-hämtning, bara en handfull fält. Bakgrunden och de fullständiga reglerna för URL-format och giltiga id:n finns redan utförligt dokumenterade i [apps/client/src/models/layers/README.md](https://github.com/matself/Hajk/blob/master/apps/client/src/models/layers/README.md) (XYZ/slippy tiles, `{z}/{x}/{y}`-mallar, ESRI:s omvända `{y}/{x}`, id-reglerna) — det här dokumentet upprepar inte det, bara själva Admin-fälten.

- **Visningsnamn\*** — namnet som visas i lagerlistan i Klienten.
- **Internt namn** — motsvarar "Visningsnamn Admin" i övriga lagerformulär: ett alternativt namn synligt bara i Admin, för att skilja lager åt internt.
- **URL-mall\*** — tile-URL:en med platshållarna `{z}`, `{x}`, `{y}` (eller ESRI:s omvända `{y}`/`{x}`-ordning).
- **Attribution** — copyright-/källtext som visas i kartans hörn i Klienten.
- **Opacitet (0–1)**.
- **Min zoom / Max zoom** (`-1` = ingen gräns).
- **Beskrivning** — fri textbeskrivning för internt bruk i Admin, motsvarar "Innehåll" i övriga lagerformulär. Visas inte i Klienten.

## Infodokument

Samma mönster som i WMS-/WMTS-formulären (se [admin-wms-layer-form.md](admin-wms-layer-form.md#infodokument-valfri-expanderbar-sektion)), men här styrt av en enkel kryssruta **Visa infodokument** istället för att fälten alltid är synliga:

- **Rubrik**, **Text**, **Länk (URL)**, **Länktext**, **Öppna data-länk**, **Ägare**.

Formuläret saknar de fält som finns i övriga lagerformulär: ingen Teckenförklaring/-ikon, inget Infoklick (XYZ-lager är rasterbaserade utan sökbara attribut — se "Kända begränsningar" i README:n ovan), och ingen Tidslinjedatum-sektion.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om `xyzlayerform.jsx` ändras bör denna guide uppdateras i samma PR.*
