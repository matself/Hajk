# Inställningar för lager (WMS) — fältguide

Den här dialogen öppnas i Admin (Lagerhanteraren) genom att klicka på ett tillagt WMS-lager i listan under "Valda lager". Den styr hur lagret presenteras och beter sig i Klienten (kartan). Fälten motsvarar koden i [`wmslayerform.jsx`](../apps/admin/src/views/layerforms/wmslayerform.jsx), funktionen `renderLayerInfoInput`.

Formuläret där du kommer ifrån (anslutning, request-inställningar, val av sublager, metadata m.m.) är dokumenterat separat i [admin-wms-layer-form.md](admin-wms-layer-form.md).

## Allmänt

**Visningsnamn**
Namnet som visas för lagret i Lagerhanterarens lagerlista i Klienten. Påverkar inte vilket lager som hämtas från WMS-tjänsten (det styrs av lagrets tekniska namn/id, satt när lagret lades till).

**Inforuta**
Fri text (kan innehålla enkel formatering) som visas när användaren klickar på informationsikonen (i) bredvid lagret i lagerlistan. Används för att beskriva vad lagret innehåller, källa, aktualitet etc. Fältet skickas som `infobox` till klienten.

**Teckenförklaringsikon**
En bild-URL eller en fil vald via "Välj fil" som visas som liten ikon i lagerlistan, som ett alternativ till/komplement till den automatiska GetLegendGraphic-bilden från WMS-tjänsten.

## Stil

**Stil**
Vilken WMS-stil (SLD `<Name>`) som ska användas när lagret hämtas. Listan fylls automatiskt från lagrets GetCapabilities-svar. `<default>` innebär att ingen stil-parameter skickas och WMS-tjänstens egen standardstil används.

**Har etikettstil (se issue #1842)**
Kryssruta som talar om för klienten att den valda stilen innehåller etiketter (labels), vilket påverkar hur lagret hanteras vid t.ex. utskrift eller lagerordning. Se [issue #1842](https://github.com/hajkmap/Hajk/issues/1842) för bakgrund — funktionen är en punktinsats snarare än en generell lösning.

## Infoklick

**Infoklick**
Kryssruta som aktiverar/inaktiverar infoklick (GetFeatureInfo) för lagret, dvs. om användaren kan klicka i kartan och få information om objekt i lagret.

**Infoklick-ikon (lista) (?)**
Namnet på en Material Icon (se länken "lista" i dialogen) eller URL till en kvadratisk SVG-ikon, som visas i infoklick-resultatet för att visuellt särskilja lagrets träffar från andra lagers.

## Infoklick och sökning

Dessa tre fält styr hur attributvärden presenteras i sökresultat och i infoklick-listan. Alla anges som kommaseparerade listor av attributnamn (kolumnnamn i den underliggande datakällan).

**Visningsfält (i resultatlistan) (?)**
Attribut som visas som huvudrad i sökresultatlistan. Visas även som etikett i kartan för ett valt sökresultat, om verktygsinställningen "Visa resultat i kartan" är aktiv för sökverktyget.

**Sekundära visningsfält (i resultatlistan) (?)**
Attribut som visas som en andra, mindre textrad under huvudraden (Visningsfält) i sökresultatlistan.

**Kort visningsfält (?)**
Attribut som visas som en kompakt etikett bredvid sökresultatet i kartan, i ett första/inzoomat läge, om "Visa resultat i kartan" är aktivt.

## Sökning

**Url**
WFS-URL:en som söktjänsten anropar för att hämta objekt i detta lager.

**Sökfält (?)**
Kommaseparerad lista över attribut (kolumner) som sökningen matchar mot, dvs. vilka fält användarens söktext jämförs med.

**Utdataformat**
Det `outputFormat` som skickas i WFS-anropet (t.ex. `application/json` eller `GML3`), beroende på vad käll-tjänsten stödjer.

**Geometrifält**
Namnet på geometri-kolumnen i den underliggande datakällan, så att sök-/infoklick-anropen vet vilket attribut som innehåller geometrin.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om fälten ändras i `wmslayerform.jsx` bör denna guide uppdateras i samma PR.*
