# Verktyg: Infoklick (infoclick) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/infoclick.jsx`, codename `infoclick`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Detta styr själva infoklick-mekanismen (popup vid GetFeatureInfo-klick i kartan) — inte om ett enskilt lager är klickbart, det sätts per lager (se [admin-wms-layer-form.md](admin-wms-layer-form.md)).

Avviker från det gemensamma mönstret: **saknar helt Sorteringsordning** i formuläret (finns inget UI för `index`, trots att fältet läses/sparas) — rimligt eftersom infoklick inte är en positionerbar knapp i verktygsfältet utan en global bakomliggande funktion. Saknar också Verktygsplacering (`target`) och Instruktion.

## Fönsterinställningar

- **Titel** — rubrik i infoklick-fönstret.
- Fönsterplacering, Fönsterbredd, Fönsterhöjd.

## Generella inställningar

- Tillträde.
- **Tillåt HTML i infoclick** (`allowDangerousHtml`) — tillåter rå HTML i infoklick-innehållet (styrs annars av lagrets Infoklick-format, se [admin-wms-layer-form.md](admin-wms-layer-form.md)).
- **Använd ny Infoclick-variant** (`useNewInfoclick`) — experimentell, se [issue #1034](https://github.com/hajkmap/Hajk/issues/1034).
- **Tillåt fler tecken, bl a MarkDown, som del av infoclicks placeholder** (`useNewPlaceholderMatching`) — se [issue #1368](https://github.com/hajkmap/Hajk/issues/1368).
- **Markera features på nivå 1 (grupper)** (`useLevel1FeatureHighlight`) — se [issue #1472](https://github.com/hajkmap/Hajk/issues/1472). Kan ge prestandaproblem vid många features.
- **URL-verifiering aktiverad** (`transformLinkUri`) — måste stängas av för att tillåta länkar till desktop-programvaror (t.ex. `myapp://`-länkar) i infoklick-innehållet.

## Länkarnas utseende

- **Färg** (`linksColor`) — `primary`/`secondary`/`inherit`, se [MUI Link](https://mui.com/material-ui/react-link/).
- **Understruket** (`linksUnderline`) — `always`/`hover`/`no`.

## Ikon och markering

Markören/highlighten som visas på kartan för det klickade objektet:

- **URL till bild** (`src`) — tomt ger en cirkel istället för en bildikon.
- **Ikonförskjutning X/Y** (`anchorX`/`anchorY`) och **Skala för icon** (`scale`).
- **Bredd på markeringens ram** (`strokeWidth`, px).
- **Färg på markeringens ram** / **Färg på markeringens fyllnad** (`strokeColor`/`fillColor`, RGBA färgväljare).

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
