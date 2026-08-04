# ArcGIS-lagerformulär — fältguide

Formuläret i Admin (Lagerhanteraren) för att lägga till och redigera ArcGIS MapServer-lager. Precis som Vektor finns ingen separat per-lager-dialog — samtliga inställningar, inklusive Inforuta, ligger direkt i det här formuläret.

Fälten motsvarar koden i [`arcgislayerform.jsx`](../apps/admin/src/views/layerforms/arcgislayerform.jsx), funktionen `render()`. Fält märkta med `*` i UI:t är obligatoriska.

**OBS:** Till skillnad från WMS och Vektor har ArcGIS-formulärets Inforuta *inte* fått den nya WYSIWYG-editorn (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)) — det är fortfarande en ren textruta, se nedan.

## Anslutning

**Url\***
URL till ArcGIS MapServer-tjänsten (REST-endpoint). Klicka **Ladda** för att hämta tjänstens metadata och fylla i lagerlistan, utbredning och projektion nedan.

## Inställningar för request

**Projektion\***
Koordinatsystemet (CRS/SRS) som anropen görs i. Fylls automatiskt i utifrån tjänstens `fullExtent.spatialReference.wkid` när man klickar Ladda, men kan skrivas över manuellt.

**Utbredning\***
Kartans utbredning (`xmin,ymin,xmax,ymax`) som fyra kommaseparerade tal. Fylls automatiskt i från tjänstens `fullExtent` vid Ladda.

**Single tile**
Om lagret ska hämtas som en enda bild för hela kartvyn istället för uppdelad i rutor — motsvarar samma inställning i WMS-formuläret.

## Tillgängliga lager

**Lagerlista**
Samtliga sublager från tjänstens metadata, som kryssrutor (flera kan väljas, till skillnad från Vektor där bara ett lager kan väljas). Info-ikonen (i) bredvid varje rad hämtar attributfält för det lagret via tjänstens egen beskrivnings-API och visar dem i lagerhanterarens högerspalt, se [admin-layermanager.md](admin-layermanager.md#beskriv-lager-attributtabell).

## Hantera valda lager

**Valda lager\***
De ArcGIS-sublager som är tillagda till detta Hajk-lager (ett Hajk-lager kan bestå av flera ArcGIS-sublager, till skillnad från Vektor).

**Visningsnamn\***
Namnet som visas för hela lagret i Klientens lagerlista.

**Visningsnamn Admin**
Ett alternativt namn som bara visas i Admin, för att skilja lager åt internt. Visas inte i Klienten.

**Inforuta**
Fri text (ingen WYSIWYG-editor ännu, se OBS-rutan högst upp) som visas i infoklick-popupen när användaren klickar på ett objekt i lagret. Kan innehålla `{attributnamn}`-platshållare och övrig syntax precis som för WMS/Vektor — se [admin-infoklick-mallformat.md](admin-infoklick-mallformat.md) — men måste skrivas för hand, det finns ingen "Hämta attribut"-hjälp här. Använd info-ikonen i lagerlistan ovan för att slå upp attributnamnen först.

**Teckenförklaring (?)**
En bild-URL eller fil vald via "Välj fil" som visas som lagrets teckenförklaringsbild i lagerlistan. Hämtas/uppdateras även automatiskt (om fältet är tomt eller redan innehåller en `data:`-URL) varje gång ett lager kryssas i eller ur, via tjänstens `/legend`-endpoint.

**Opacitet\***
Lagrets genomskinlighet, 0 (helt genomskinligt) till 1 (helt opakt).

**Infoklickbar**
Om lagret är klickbart för GetFeatureInfo/infoklick i Klienten.

## Metadata

**Innehåll**
Fri textbeskrivning av lagrets innehåll, för internt bruk i Admin — visas inte i Klienten.

**Senast ändrad**
Skrivskyddat fält som fylls i automatiskt vid varje sparning.

**Upphovsrätt**
Styr OpenLayers `attributions` för lagret, visas i kartan.

### Infodokument (valfri expanderbar sektion)

Samma fält (Rubrik, Text, Länk, Länktext, Länk till öppna data, Ägare) som i WMS-formuläret, se [admin-wms-layer-form.md](admin-wms-layer-form.md) — med en särskild kvirk: **Ägare** faller tillbaka på ett `owner`-fält om `infoOwner` är tomt (`this.state.infoOwner ? this.state.infoOwner : this.state.owner`). Det fältet finns inte i formulärets egen `defaultState` eller något inputfält här, men är inte dött — `layermanager.jsx` (`loadLayer`, raden med `owner: layer.owner`) läser in det direkt från `layers.json` när ett *befintligt* ArcGIS-lager öppnas för redigering, som en bakåtkompatibel visning av ett äldre fält som fanns innan `infoOwner` infördes.

**Fallgrop:** eftersom `getLayer()` aldrig skickar med `owner` vid sparning, och backend (`settings.service.js`) ersätter hela lagerobjektet istället för att slå ihop det, försvinner ett gammalt `owner`-värde permanent ur `layers.json` vid *första* sparningen av ett sådant lager — om inte samma text redan skrivits in i Ägare/`infoOwner` innan man sparar.

**OBS:** ArcGIS-formuläret saknar Tidslinjedatum-sektionen som finns i WMS/Vektor.

---

*Detta dokument beskriver läget i koden per 2026-08-04. Om fälten ändras i `arcgislayerform.jsx` bör denna guide uppdateras i samma PR.*
