# Verktyg: Mät (measurer) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/measurer.jsx`, codename `measurer`. Ersätter det äldre `measure`-verktyget, se [deprecated-plugins.md](deprecated-plugins.md). Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Formuläret består av:

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Synlig vid start** — om mätverktygets fönster är öppet när kartan laddas.

Till skillnad från de flesta andra verktyg saknar Mät fälten Instruktion och Tillträde — de är inte implementerade i det här formuläret.

**OBS — dolt fält:** state har en `icons`-egenskap som läses från och skrivs till konfigurationen (`tool.options.icons`) men som inte har någon motsvarande kontroll i gränssnittet. Om `icons` behöver ändras går det bara att göra direkt i kartans JSON-fil, inte via Admin.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
