# Verktyg: Infoklick (infoclick) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/infoclick.jsx`, codename `infoclick`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Detta styr själva infoklick-mekanismen (popup vid GetFeatureInfo-klick i kartan) — inte om ett enskilt lager är klickbart, det sätts per lager i "Infoklick"-kryssrutan i lagrets Inställningar-dialog (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md), inte huvudformuläret [admin-wms-layer-form.md](admin-wms-layer-form.md) som bara har det liknande men orelaterade `INFO_FORMAT`-fältet "Infoklick-format").

Själva formateringsspråket i infoklick-mallarna (Inforuta/Infobox) — platshållare, filter, villkorsblock, länkar m.m. — är dokumenterat separat i [admin-infoklick-mallformat.md](admin-infoklick-mallformat.md).

Avviker från det gemensamma mönstret: **saknar helt Sorteringsordning** i formuläret (finns inget UI för `index`, trots att fältet läses/sparas) — rimligt eftersom infoklick inte är en positionerbar knapp i verktygsfältet utan en global bakomliggande funktion. Saknar också Verktygsplacering (`target`) och Instruktion.

## Fönsterinställningar

- **Titel** — rubrik i infoklick-fönstret.
- Fönsterplacering, Fönsterbredd, Fönsterhöjd.

## Generella inställningar

- Tillträde.
- **Tillåt HTML i infoclick** (`allowDangerousHtml`) — styr om `react-markdown`s `rehype-raw`-plugin är aktiverad vid rendering av infoklick-innehållet (`FeaturePropsParsing.jsx`). Är den **av**, tolkas inte inbäddade HTML-taggar som markup utan visas som escapad text (t.ex. syns `&lt;h3&gt;` bokstavligt istället för en rubrik). Detta måste vara **på** för att lagrens Inforuta-mallar (byggda med den nya WYSIWYG-editorn, som exporterar riktig HTML — se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)) ska visas korrekt formaterade i popupen. Orelaterat till lagrets "Infoklick-format" (`INFO_FORMAT`, se [admin-wms-layer-form.md](admin-wms-layer-form.md)) — det styr bara vilket svarsformat som begärs från WMS-tjänsten, inte hur klientens Markdown-rendering hanterar HTML.
- **Använd ny Infoclick-variant** (`useNewInfoclick`) — experimentell, se [issue #1034](https://github.com/hajkmap/Hajk/issues/1034).
- **Tillåt fler tecken, bl a MarkDown, som del av infoclicks placeholder** (`useNewPlaceholderMatching`) — byter till en betydligt mer tillåtande regex för `{platshållare}`, se [issue #1368](https://github.com/hajkmap/Hajk/issues/1368) och platshållar-avsnittet i [admin-infoklick-mallformat.md](admin-infoklick-mallformat.md).
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

*Detta dokument beskriver läget i koden per 2026-08-04.*
