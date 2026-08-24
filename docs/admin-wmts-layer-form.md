# WMTS-lagerformulär — fältguide

Det här formuläret används i Admin (Lagerhanteraren) för att lägga till och redigera WMTS-lager. Till skillnad från WMS-formulärets "Inställningar för lager"-dialog (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)) är detta en enda sammanhängande sida, inte en popup som öppnas i efterhand. Fälten motsvarar koden i [`wmtslayerform.jsx`](../apps/admin/src/views/layerforms/wmtslayerform.jsx).

Fält märkta med `*` i UI:t är obligatoriska (valideras via `validateField`).

## Val av lager

**CapabilitiesUrl\***
URL till WMTS-tjänstens `GetCapabilities`-dokument. Klicka **Hämta** för att läsa in tjänstens innehåll (lagerlista, matrisuppsättningar m.m.) — detta måste göras innan övriga fält i formuläret kan fyllas i automatiskt.

Misslyckas hämtningen visas tjänstens eget felmeddelande när den lämnat något — t.ex. "Tjänsten svarade med ett felmeddelande: …" när servern svarar med en `ExceptionReport`, eller "Svaret är inget WMTS-capabilities-dokument (rotelementet är <WMS_Capabilities>)" om en WMS-URL klistrats in i WMTS-formuläret.

Statuskoder ("Tjänsten kräver inloggning (HTTP 401)") kan bara visas när webbläsaren får läsa svaret, alltså när tjänsten skickar CORS-huvuden, eller när hämtningen går via backend därför att användarnamn fyllts i — se [admin-wms-layer-form.md](admin-wms-layer-form.md) för samma resonemang. Lantmäteriets öppna WMTS svarar 401 utan CORS-huvud, och då visas CORS-meddelandet, vilket i det läget är korrekt.

**Autentisering (Basic) — Användarnamn / Lösenord**
Om tjänsten kräver Basic-autentisering, fyll i dessa **innan** du klickar Hämta. Hajk hämtar capabilities server-side med uppgifterna och lagrar dem i `layers.json`, så att backend kan proxya anrop till tjänsten med samma inloggning. Uppgifterna skickas aldrig till webbläsaren/klienten.

**Lager\***
Väljer vilket lager (`Identifier`) i capabilities-dokumentet som ska läggas till. När ett lager väljs fylls flera av fälten nedan (matrisuppsättning, projektion, upplösningar m.m.) i automatiskt utifrån tjänstens metadata.

**Visningsnamn\***
Namnet som visas för lagret i Klientens lagerlista.

**Teckenförklaring**
En bild-URL eller fil vald via "Välj fil" som visas som lagrets teckenförklaringsbild (legend) i lagerlistan.

**Teckenförklaringsikon**
En bild-URL eller fil vald via "Välj fil" som visas som liten ikon bredvid lagret i lagerlistan (skiljer sig från Teckenförklaring, som är den större bilden i den expanderade lagerinformationen).

**Min zoom / Max zoom (?)**
Styr vid vilka zoomnivåer lagret är synligt. Zoomnivåerna avgörs av `map.resolutions` i respektive `map_*.json`, inte av skala direkt — se tooltarna i dialogen för hur man räknar om från skala till zoomnivå. `-1` betyder ingen begränsning i den riktningen.

## Inställningar för request

Dessa fält styr det faktiska WMTS-anropet och fylls i regel i automatiskt när du väljer **Matrisuppsättning** eller **Resource**, men kan justeras manuellt vid behov (t.ex. om tjänstens capabilities är ofullständiga).

**Matrisuppsättning (matrixSet)\***
Vilken `TileMatrixSet` som ska användas. Styr vilken projektion samt vilka upplösningar/matrisnivåer som föreslås.

**Resource**
Vid REST-baserade tjänster: väljer vilken av tjänstens erbjudna resurser (format + URL-mall) som ska användas. Fyller automatiskt i Format, Request encoding och Url.

**Format (imageFormat)**
MIME-typen för tile-bilderna, t.ex. `image/png` eller `image/jpeg`.

**Request encoding**
`REST` eller `KVP` — hur tile-anrop adresseras mot tjänsten. REST bygger URL:en av mallen i Url-fältet; KVP skickar parametrar som query-sträng.

**Url\***
Bas-URL eller URL-mall (för REST) som tiles hämtas ifrån.

**Projektion (projection)\***
Koordinatsystemet (EPSG-kod) som matrisuppsättningen är definierad i. Fylls i från matrisuppsättningens `SupportedCRS`, som tjänsterna anger som URN i flera varianter (`urn:ogc:def:crs:EPSG::3857`, Lantmäteriets `urn:ogc:def:crs:EPSG:6.3:3006`, swisstopos `urn:ogc:def:crs:EPSG:2056`) — samtliga översätts till `EPSG:kod`. URN:er från andra myndigheter än EPSG (t.ex. OGC:s CRS84) lämnas orörda eftersom OpenLayers tolkar dem själv.

Lager som lades till innan detta kan ha hela URN:en sparad som projektion i `layers.json`. Det fungerar bara så länge matrisuppsättningen råkar ha samma koordinatsystem som kartan, eftersom ingen projektion är registrerad under det namnet. Åtgärda genom att hämta capabilities på nytt och välja matrisuppsättningen igen, eller genom att rätta värdet till `EPSG:kod`.

**Startkoordinater (origins)\***
Övre vänstra hörnets koordinater (`TopLeftCorner`) per matrisnivå, i samma ordning som Matrisnivåer nedan. Hajk lagrar dem med easting först, medan tjänsten anger dem i koordinatsystemets egen axelordning — SWEREF 99 och WGS 84 har northing (respektive latitud) först, medan t.ex. Web Mercator och schweiziska EPSG:2056 har easting först. Vilket som gäller avgörs av en lista över de koordinatsystem Hajk stöder (`NORTHING_FIRST_CRS`/`EASTING_FIRST_CRS` i `wmtslayerform.jsx`); för ett koordinatsystem som inte finns i listorna gissas ordningen på teckenet hos det första värdet, precis som tidigare. Ligger lagret uppenbart fel i kartan är det första stället att titta.

**Upplösningar (resolutions)\***
Upplösning (meter/pixel) per matrisnivå, kommaseparerad, i fallande ordning.

**Matrisnivåer (matrixIds)\***
Identifierarna för respektive nivå i matrisuppsättningen, kommaseparerad.

**Storlekar (sizes)**
Matrisens bredd/höjd (antal tiles) per nivå — används för att begränsa OpenLayers till giltigt tile-utrymme.

**Rutstorlek (tileSize)**
Pixelstorleken på varje tile, t.ex. `256` eller `256 256` om bredd/höjd skiljer sig åt.

**Stilsättning**
Vilken WMTS-stil (`Style/Identifier`) som ska användas i anropet.

**Cross origin**
CORS-inställning för bildhämtningen (`anonymous`, `use-credentials` eller ej satt). Behövs bl.a. om kartan ska kunna exportera/skriva ut lagret via canvas.

## Metadata

**Innehåll**
Fri textbeskrivning av lagrets innehåll, för internt bruk i Admin — visas inte i Klienten. Används för att göra layers.json lättare att förstå/söka i för andra administratörer.

**Senast ändrad**
Skrivskyddat fält som fylls i automatiskt vid varje sparning — visar när lagrets konfiguration senast ändrades.

**Upphovsrätt**
Copyright-/källtext som visas i kartans hörn i Klienten. Stöder HTML-länkar.

### Infodokument (valfri expanderbar sektion)

Kryssrutan **Infodokument** visar/döljer ett antal fält som fyller i den utökade lagerinformationen (infopanelen med "i"-ikonen i Klientens lagerlista) — separat från den enkla teckenförklaringen ovan:

- **Rubrik** — rubrik högst upp i infopanelen.
- **Text** — brödtext (stöder HTML) i infopanelen.
- **Länk (ex. till PDF)** — extern länk, t.ex. till produktblad.
- **Länktext** — den klickbara texten för länken ovan (annars visas länk-URL:en rakt av).
- **Länk till öppna data** — separat länk till en öppna data-portal för lagret.
- **Ägare** — dataleverantörens/ägarens namn (stöder HTML).

### Tidslinjedatum (valfri expanderbar sektion)

Kryssrutan **Tidslinjedatum** aktiverar fälten **Tidslinje start** och **Tidslinje slut** (format `ÅÅÅÅMMDD`). Dessa krävs av **Tidslinje**-pluginen i Klienten för att kunna erbjuda tidsstyrd visning/animering av lagret — saknas något av dem, eller är de identiska, flaggar Tidslinje-pluginen lagret som felaktigt konfigurerat.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om fälten ändras i `wmtslayerform.jsx` bör denna guide uppdateras i samma PR.*
