# WMS-lagerformulär — fältguide

Det här är huvudformuläret i Admin (Lagerhanteraren) för att lägga till och redigera WMS-lager — den sida du ser innan du klickar på ett enskilt tillagt lager. Klickar du på ett tillagt lager i "Valda lager" öppnas istället per-lager-dialogen "Inställningar för lager", som är dokumenterad separat i [admin-wms-layer-settings.md](admin-wms-layer-settings.md) (Visningsnamn, Inforuta, Stil, sökfält m.m. — de fälten beskrivs inte igen här).

Fälten motsvarar koden i [`wmslayerform.jsx`](../apps/admin/src/views/layerforms/wmslayerform.jsx), funktionen `render()`. Fält märkta med `*` i UI:t är obligatoriska.

## Anslutning

**Servertyp**
Vilken WMS-serverimplementation tjänsten kör: `geoserver`, `mapserver`, `qgis`, `geowebcache-standalone` eller `arcgis`. Styr bl.a. hur Admin tolkar capabilities-svaret och vilka extra fält (t.ex. workspace-väljaren för GeoServer) som visas.

**Url\***
Tjänstens WMS-endpoint. Klicka **Ladda** för att hämta `GetCapabilities` och fylla i lagerlistan nedan.

**Autentisering (Basic) — Användarnamn / Lösenord**
Om tjänsten kräver Basic-autentisering, fyll i dessa **innan** du klickar Ladda. Hajk hämtar capabilities server-side med uppgifterna och lagrar dem i `layers.json`, så att backend proxyar anrop till tjänsten med samma inloggning. Uppgifterna skickas aldrig till webbläsaren/klienten.

**Välj workspace**
Visas bara för GeoServer-tjänster (kräver att "Hämta workspace" klickats). Begränsar vilket workspace lagerlistan hämtas ifrån — praktiskt för GeoServer-instanser med många workspaces, annars måste hela den (ofta stora) gemensamma capabilities-listan hämtas.

## Inställningar för request

**GetMap-url**
Ange bara om GetMap-anropen ska gå till en annan URL än den ovan (t.ex. en cache-endpoint). De flesta lämnar detta tomt.

**Version**
WMS-versionen (`1.1.0`, `1.1.1` eller `1.3.0`) som anropen görs med. Fylls i utifrån vad tjänstens capabilities annonserar.

**Bildformat**
MIME-typen för de bilder GetMap ska returnera, t.ex. `image/png`.

**Koordinatsystem**
Vilket koordinatsystem (CRS/SRS) GetMap-anropen görs i.

**Efterfråga hög DPI**
Aktiverar OpenLayers `hidpi`-inställning, dvs. begär bilder i högre upplösning på skärmar som stödjer det.

**Custom DPI**
Alternativ till "Efterfråga hög DPI": en tabell som mappar specifika `pixel ratio`-brytpunkter till specifika dpi-värden, för finare kontroll än på/av.

**Single tile / Custom ratio**
Single tile innebär att hela kartvyn hämtas som en enda bild istället för uppdelad i rutor. Custom ratio styr hur mycket större än viewporten bilden som hämtas ska vara (1 = viewportens storlek, 2 = dubbelt osv.) — motsvarar `ratio`-inställningen i OpenLayers `ImageWMS`. Lämna som 0 för OL:s standardvärde. Fältet är inaktivt om Single tile inte är ikryssad.

**Rutindelad (tiled)**
Om lagret ska hämtas rutindelat (`TileWMS`) istället för som hela bilder.

**Visa knapp för attributtabell**
Visar en knapp i Klienten för att öppna lagrets attributtabell. Se [issue #595](https://github.com/hajkmap/Hajk/issues/595).

## Tillgängliga lager

En tabell (Titel, Namn, Grupp, Infoklick) med samtliga lager från tjänstens capabilities-svar. Kryssa i de lager som ska läggas till kartan — de hamnar då i "Valda lager" nedan. Om listan är tom: klicka Ladda under Anslutning först.

**Filtrera**
Fältet ovanför tabellen filtrerar listan på titel eller namn, vilket behövs när en GeoServer publicerar hundratals lager. Räknaren bredvid visar hur många lager som matchar av det totala antalet. Filtret påverkar bara vad som visas — redan ikryssade lager förblir valda även om de filtreras bort, och syns kvar i "Valda lager". Ett sublager hittas även om dess grupplager inte matchar filtret.

**Sortering**
Klicka på kolumnrubriken Titel eller Namn för att sortera listan; ett nytt klick på samma rubrik vänder ordningen. Sorteringen sker inom varje nivå, så att ett grupplager behåller sina sublager direkt efter sig. Utan sortering visas lagren i den ordning tjänsten levererar dem.

## Hantera valda lager

**Valda lager\***
Listan över lager som är tillagda till detta Hajk-lager (ett Hajk-lager kan bestå av flera underliggande WMS-sublager). Klicka på ett lager i listan för att öppna dess "Inställningar för lager"-dialog (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)).

**Stäng av möjlighet att expandera**
Döljer expanderpilen i lagerlistan i Klienten för grupplager, dvs. användaren kan inte fälla ut/in undergrupper.

**Visningsnamn\***
Namnet som visas för hela lagret (gruppen av sublager) i Klientens lagerlista. Förifylls automatiskt med titeln från capabilities om bara ett sublager är valt.

**Visningsnamn Admin**
Ett alternativt namn som bara visas i Admin, för att skilja lager åt internt (t.ex. om flera lager har samma publika Visningsnamn men olika käll-URL:er). Visas inte för slutanvändare i Klienten.

**Teckenförklaring**
En bild-URL eller fil vald via "Välj fil" som visas som lagrets teckenförklaringsbild (legend) i lagerlistan.

**Teckenförklaringsikon**
En bild-URL eller fil vald via "Välj fil" som visas som liten ikon bredvid lagret i lagerlistan.

**Infoklick-format**
Vilket `INFO_FORMAT` (t.ex. `text/html`, `application/json`) som ska begäras vid GetFeatureInfo-anrop.

**Infoklick sortera på attribut / Infoklick sortera fallande / Infoklick sorterings-typ**
Styr sorteringen av träffar i infoklick-resultatlistan: vilket attribut som ska sorteras på, om ordningen ska vara fallande, och om värdet ska tolkas som `string` eller `number` vid sorteringen.

**Opacitet\***
Lagrets genomskinlighet, 0 (helt genomskinligt) till 1 (helt opakt).

**Min zoom / Max zoom (?)**
Styr vid vilka zoomnivåer lagret är synligt. Zoomnivåerna avgörs av `map.resolutions` i respektive `map_*.json`, inte av skala direkt — se tooltarna i dialogen för hur man räknar om från skala till zoomnivå. `-1` betyder ingen begränsning i den riktningen.

**Visa endast Min/Max varningsruta vid klick (?)**
Som standard visar Klienten en varningsruta både vid start och när lagret automatiskt döljs på grund av zoombegränsning. Kryssa i detta för att bara visa varningen när användaren själv klickar för att slå på lagret.

**Uppåt i kartan är:**
Roterar hur kartan tolkas riktningsmässigt för detta lager (Norr/Öst/Syd/Väst) — används för källor där "upp" i data inte är geografisk norr.

**CQL-filter:**
Ett CQL-filter (GeoServer) som läggs till som standardfilter på alla anrop mot lagret, t.ex. `foo='bar' AND fii='baz'`.

## Metadata

**Innehåll**
Fri textbeskrivning av lagrets innehåll, för internt bruk i Admin — visas inte i Klienten.

**Senast ändrad**
Skrivskyddat fält som fylls i automatiskt vid varje sparning.

**Upphovsrätt**
Copyright-/källtext som visas i kartans hörn i Klienten. Stöder HTML-länkar.

### Infodokument (valfri expanderbar sektion)

Kryssrutan **Infodokument** visar/döljer fälten för den utökade lagerinformationen (infopanelen med "i"-ikonen i Klientens lagerlista):

- **Rubrik** — rubrik högst upp i infopanelen.
- **Text** — brödtext (stöder HTML). Förifylls automatiskt med tjänstens abstract om bara ett sublager är valt.
- **Länk (ex. till PDF)** — extern länk, t.ex. till produktblad.
- **Länktext** — den klickbara texten för länken ovan.
- **Länk till öppna data** — separat länk till en öppna data-portal för lagret.
- **Ägare** — dataleverantörens/ägarens namn.

### Tidslinjedatum (valfri expanderbar sektion)

Kryssrutan **Tidslinjedatum** aktiverar fälten **Tidslinje start** och **Tidslinje slut** (format `ÅÅÅÅMMDD`), som krävs av Tidslinje-pluginen i Klienten för tidsstyrd visning/animering av lagret.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om fälten ändras i `wmslayerform.jsx` bör denna guide uppdateras i samma PR.*
