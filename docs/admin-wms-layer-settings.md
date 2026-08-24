# Inställningar för lager (WMS) — fältguide

Den här dialogen öppnas i Admin (Lagerhanteraren) genom att klicka på ett tillagt WMS-lager i listan under "Valda lager". Den styr hur lagret presenteras och beter sig i Klienten (kartan). Fälten motsvarar koden i [`wmslayerform.jsx`](../apps/admin/src/views/layerforms/wmslayerform.jsx), funktionen `renderLayerInfoInput`.

Formuläret där du kommer ifrån (anslutning, request-inställningar, val av sublager, metadata m.m.) är dokumenterat separat i [admin-wms-layer-form.md](admin-wms-layer-form.md).

## Allmänt

**Visningsnamn**
Namnet som visas för lagret i Lagerhanterarens lagerlista i Klienten. Påverkar inte vilket lager som hämtas från WMS-tjänsten (det styrs av lagrets tekniska namn/id, satt när lagret lades till).

Förifylls med sublagrets titel från capabilities när lagret bockas i, och kan sedan skrivas om fritt. Lager som lades till innan detta började gälla kan ha tomt Visningsnamn kvar; sådana lager visas i Klienten med sitt tekniska lagernamn tills fältet fylls i.

**Inforuta**
HTML-mallen som visas i infoklick-popupen när användaren klickar på ett objekt i lagret i kartan (inte att förväxla med informationsikonen (i) i lagerlistan, se Infodokument i [admin-wms-layer-form.md](admin-wms-layer-form.md)). Fältet skickas som `infobox` till Klienten och kan innehålla `{attributnamn}`-platshållare, villkorsblock, filter m.m. — se [admin-infoklick-mallformat.md](admin-infoklick-mallformat.md) för hela syntaxen.

Redigeras med en WYSIWYG-editor (`InfoclickEditor`-komponenten, delad med [admin-vector-layer-form.md](admin-vector-layer-form.md) och den motsvarande Infobox-mallen per karta, se [admin-mapsettings.md](admin-mapsettings.md)):

- **Visuell/Kod** — växlar mellan formaterad redigering och rå HTML-text. Innehåll med `{{if}}...{{/if}}`-villkorsblock låser automatiskt till Kod-läge, eftersom sådana block kan innehålla godtycklig HTML som en WYSIWYG-rundtripp riskerar att korrumpera.
- **Hämta attribut** — hämtar det aktuella sublagrets attributnamn via WFS `DescribeFeatureType` mot samma URL som redan är konfigurerad för lagret, och fyller "Infoga attribut"-listan. Fungerar bara om tjänsten även exponerar WFS på samma URL — vilket många öppna WMS-tjänster medvetet inte gör (WFS möjliggör nedladdning av rådata). Ger tjänsten inget svar visas "Vektorlager saknas. Attribut måste väljas manuellt." och platshållare måste skrivas för hand istället.
- **Infoga attribut** — infogar valt attribut som `{attributnamn}` vid markörens position. Infogade platshållare visas som en skyddad "chip" som formatering inte kan splitta av misstag.

Notera att detta fält gäller per sublager (WMS-lager kan ha flera sublager, varje sublager har sin egen Inforuta) — jämför med den karta-specifika Infobox-mallen i [admin-mapsettings.md](admin-mapsettings.md), som istället gäller för hela lagret på en gång och skriver över samtliga sublagers Inforuta när den fylls i.

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

*Detta dokument beskriver läget i koden per 2026-08-04. Om fälten ändras i `wmslayerform.jsx` bör denna guide uppdateras i samma PR.*
