# Vektorlagerformulär — fältguide

Formuläret i Admin (Lagerhanteraren) för att lägga till och redigera Vektor-lager (WFS eller GeoJSON). Till skillnad från WMS finns ingen separat per-lager-dialog — samtliga inställningar, inklusive Inforuta, ligger direkt i det här formuläret.

Fälten motsvarar koden i [`vectorlayerform.jsx`](../apps/admin/src/views/layerforms/vectorlayerform.jsx), funktionen `render()`. Fält märkta med `*` i UI:t är obligatoriska.

## Anslutning

**Dataformat (?)**
Styr `outputFormat` på anropen. `WFS` efterfrågar `GML2`/`GML3` beroende på vald WFS-version (se nedan). `GeoJSON` efterfrågar `application/json` istället — då krävs inget valt lager (se Validering nedan).

**WFS-version (?)**
Styr `outputFormat` när Dataformat är `WFS`: `1.0.0` ger GML2, `1.1.0` och `2.0.0` ger GML3.

**URL (?)**
URL till WFS-endpointen, t.ex. `https://geoserver.example.com/geoserver/wfs`. Klicka **Ladda** för att hämta `GetCapabilities` och fylla i lagerlistan nedan.

## Tillgängliga lager

**Lagerlista**
Samtliga featuretyper från tjänstens capabilities-svar, som radioknappar (bara ett lager kan väljas per Hajk-lager). Info-ikonen (i) bredvid varje rad hämtar attributnamn/-typer för det lagret via WFS `DescribeFeatureType` och visar dem i lagerhanterarens högerspalt (se [admin-layermanager.md](admin-layermanager.md#beskriv-lager-attributtabell)) — praktiskt för att slå upp exakta attributnamn innan man fyller i fälten nedan.

## Hantera valda lager

**Valt lager\***
Det valda lagret (bara ett åt gången — att välja ett nytt lager i listan ovan byter ut detta). Krävs innan formuläret validerar, om Dataformat inte är `GeoJSON`.

**Stäng av möjlighet att expandera**
Döljer expanderpilen i lagerlistan i Klienten om detta Hajk-lager visas som en grupp — motsvarar samma inställning i WMS-formuläret.

**Visningsnamn\***
Namnet som visas för lagret i Klientens lagerlista.

**Visningsnamn Admin**
Ett alternativt namn som bara visas i Admin, för att skilja lager åt internt. Visas inte i Klienten.

**Projektion\***
Koordinatsystemet (CRS/SRS) som anropen mot lagret görs i.

**Opacitet\***
Lagrets genomskinlighet, 0 (helt genomskinligt) till 1 (helt opakt).

**Min zoom / Max zoom (?)**
Styr vid vilka zoomnivåer lagret är synligt, precis som motsvarande fält i WMS-formuläret, se [admin-wms-layer-form.md](admin-wms-layer-form.md). `-1` betyder ingen begränsning i den riktningen.

**Upphovsrätt (?)**
Styr OpenLayers `attributions` för lagret, visas i kartan.

**Infoklickbar**
Om lagret är klickbart för GetFeatureInfo/infoklick i Klienten — motsvarar "Infoklick"-kryssrutan i WMS-lagrets Inställningar-dialog.

**Inforuta**
Samma WYSIWYG-editor (Visuell/Kod-lägen, "Hämta attribut", `{attribut}`-platshållare) som WMS-lagrens Inforuta — se [admin-wms-layer-settings.md](admin-wms-layer-settings.md), avsnittet "Allmänt", för hela beskrivningen, den gäller identiskt här. Skillnaden: här finns bara ett lager att hämta attribut ifrån (inga sublager), så "Hämta attribut" använder alltid det valda lagret ovan direkt, utan någon sublager-väljare.

**Ikon i infoclick-lista (?)**
Namnet på en Material Icon eller URL till en kvadratisk SVG-ikon som visas i infoklick-resultatet, för att visuellt särskilja lagrets träffar.

**Huvudvisningsfält / Sekundära visningsfält / Visningsfält i kartan (?)**
Kommaseparerade listor av attributnamn som styr vad som visas i infoklick-listan (huvudrad, sekundär rad) respektive som etikett i kartan. Motsvarar Visningsfält/Sekundära visningsfält/Kort visningsfält i WMS-lagrets Inställningar-dialog, se [admin-wms-layer-settings.md](admin-wms-layer-settings.md#infoklick-och-sökning).

**Teckenförklaring (?)**
En bild-URL eller fil vald via "Välj fil" som visas som lagrets teckenförklaringsbild i lagerlistan.

**Ikon för teckenförklaring (?)**
En bild-URL eller fil vald via "Välj fil" som visas som liten ikon bredvid lagret i lagerlistan.

## Stilsättning av objekt

Stilen sätts med SLD om det är konfigurerat (URL eller inklistrad XML), annars med OpenLayers-stilsättningen nedan. Om inget av detta är konfigurerat används OpenLayers standardstil.

**URL till SLD-filen / SLD (XML) (?)**
Antingen en URL till en SLD-fil eller SLD-XML inklistrad direkt i textrutan — ange bara en av dem.

**Namn på stilen (inuti SLD-definitionen) (?)**
Värdet på `<UserStyle><Name>` i SLD-definitionen, för att peka ut vilken namngiven stil (om flera) som ska användas.

**Ikon**
En bild-URL eller fil vald via "Välj fil" som används som punktsymbol, om lagret inte stilsätts med SLD.

**Ikonförskjutning X / Ikonförskjutning Y**
Pixelförskjutning av ikonen relativt punktens koordinat.

**Ikonstorlek / Linjetjocklek / Linjestil**
Snabbval (liten/medium/stor osv., tunn/normal/tjock osv., heldragen/streckad/punktad) för OpenLayers-stilsättningen, används tillsammans med Ikon ovan om SLD inte är konfigurerat.

**Fyllnadsfärg / Linjefärg**
RGBA-färgväljare (samma komponent som används i flera andra Admin-formulär) för ytors fyllnad respektive linjers färg, i OpenLayers-stilsättningen.

## Filtrering

**Tillåt användaren att filtrera features (?)**
Ger användaren möjlighet att via Lagerhanteraren i Klienten styra vilka features som visas.

**Filterattribut vid start / Filterjämförare vid start / Filtervärde vid start**
Ett standardfilter som är aktivt när kartan laddas: attributnamnet att filtrera på, jämförelsetypen (mindre än / större än / lika med / skilt från) och värdet att jämföra mot.

## Metadata

**Innehåll**
Fri textbeskrivning av lagrets innehåll, för internt bruk i Admin — visas inte i Klienten.

**Senast ändrad**
Skrivskyddat fält som fylls i automatiskt vid varje sparning.

### Infodokument (valfri expanderbar sektion)

Samma fält (Rubrik, Text, Länk, Länktext, Länk till öppna data, Ägare) som i WMS-formuläret, se [admin-wms-layer-form.md](admin-wms-layer-form.md#infodokument-valfri-expanderbar-sektion) — enda skillnaden är att Text/Rubrik inte förifylls automatiskt här, eftersom Vektor-formuläret saknar en capabilities-abstract att hämta ifrån.

### Tidslinjedatum (valfri expanderbar sektion)

Samma som i WMS-formuläret, se [admin-wms-layer-form.md](admin-wms-layer-form.md#tidslinjedatum-valfri-expanderbar-sektion).

---

*Detta dokument beskriver läget i koden per 2026-08-04. Om fälten ändras i `vectorlayerform.jsx` bör denna guide uppdateras i samma PR.*
