# Söklager — konsol för sökkällor

Det här dokumentet beskriver fliken **Söklager** (`searchsources.jsx`, komponenten
`SearchSources`), en fork-specifik konsol som samlar och redigerar alla sökkällor
Hajk känner till på ett ställe. Den ersätter den äldre fliken **Söktjänster**
(`search.jsx`), som numera är dold — se "Förhållande till Söktjänster" nedan.

En sökkälla kan vara av två slag, och konsolen visar och redigerar båda:

- **Söklager** — ett fristående WFS-lager (`wfslayers` i `layers.json`), avsett
  enbart för sökning.
- **WMS-underlager med sökkonfiguration** — ett underlager i ett vanligt
  WMS-lager (`wmslayers[].layersInfo[]`) som fått egna sökfält (`searchUrl`,
  `searchPropertyName` m.fl.) ifyllda, oftast från Lager-fliken. Denna typ
  kunde tidigare bara redigeras i Lager-fliken; Söklager-konsolen gör det
  möjligt direkt här.

## Listan

Tabellen visar alla sökkällor med Typ, Namn, Id, Kopplat kartlager, Url, Lager
och eventuella Varningar. Info-ikonen på raden för "Kopplat kartlager" visar
`pid` — WMS-lagrets id — i en tooltip.

**Kopplat kartlager (pid)**
Ett söklager kan valfritt kopplas till ett WMS-lager i kartan. Kopplingen
styr om sökverktygets inställning "Tänd motsvarande WMS-lager automatiskt vid
klick i resultatlistan" (`showCorrespondingWMSLayers`, se
[admin-tool-search.md](admin-tool-search.md)) har något att tända. Ett WMS-
underlager är alltid implicit kopplat till sitt eget WMS-lager. Ett söklager
utan koppling visas som "Ej kopplad" — det är inget fel, bara informativt:
den WMS-knutna funktionaliteten är inaktiv för just den källan (se
`findUnlinked` i `searchSourceLint.js`).

**Varningar**
Två lint-kontroller körs mot hela lagerkatalogen varje gång listan laddas,
och redovisas som chips på berörd rad:

- **Överlapp** — två sökkällor delar både url och minst ett lagernamn. De
  returnerar samma träffar under två olika captions, vilket sällan är
  avsiktligt.
- **Id-krock** — en källas id förekommer även som underlager-id hos ett
  *annat* WMS-lager. Eftersom "Sök endast i synliga lager"
  (`searchInVisibleLayers`) matchar på just den typen av id, kan det andra
  lagret då råka slå på sökkällan när det tänds i kartan, trots att de hör
  till helt olika tjänster.

Ingen av varningarna blockerar spara — de är till för att upptäcka
problem som annars är osynliga i gränssnittet.

## Trasiga referenser i kartkonfigurationer

Ett separat avsnitt under tabellen, synligt bara när det finns träffar.
Listar id:n i en kartas sökverktygsinställningar (`options.layers[].id` och
`options.selectedSources[]`) som pekar på ett söklager eller WMS-lager som
inte längre finns i `layers.json`. Sådana referenser syns i dag annars bara
som en `console.warn` i webbläsaren när kartan laddas — konsolen gör dem
synliga utan att behöva öppna varje karta och webbläsarens konsol för sig.
Beräknas mot samtliga kartor i `App_Data` — det finns ingen namnkonvention
(`map_*.json` är bara en vanlig stil, inget krav): backend accepterar varje
`.json`-fil i mappen utom `layers.json` själv som en möjlig karta, så länge
den har formen av en kartkonfiguration (`getAvailableMaps()` i
`config.service.js`) — inte bara den karta som råkar vara vald i
Kartor-fliken.

## Lägga till/redigera en sökkälla

**Lägg till söklager** öppnar formuläret i tillägg-läge för ett nytt,
fristående WFS-söklager. Att redigera en befintlig rad öppnar samma formulär
i redigeringsläge, med fälten ifyllda från den valda källan. Formuläret ser
olika ut beroende på källans typ:

### Anslutning

- **Url** — WFS-tjänstens url. För ett söklager visas även **Hämta
  lagerlista**, som frågar tjänsten (`DescribeFeatureType`/capabilities) efter
  tillgängliga lagernamn. För ett WMS-underlager är url valfri: tom betyder
  "använd WMS-lagrets egen url", och sätts bara om söktjänsten (WFS) ligger på
  en annan adress än WMS-tjänsten.
- **Responstyp** — en stängd lista (`application/json`,
  `application/vnd.geo+json`, `GML3`, `GML32`, `GML2`) som måste matcha exakt
  vad `SearchModel.js` i klienten känner igen. Fritext stöds medvetet inte
  här: ett värde utanför listan avvisas redan i klienten utan att ens nå
  servern, och skulle bara ge ett tyst trasigt söklager.
- **Servertyp** — GeoServer/QGIS Server/ArcGIS Server/MapServer. Låst och
  ärvd från WMS-lagret för ett underlager.
- **WFS-version** — 1.1.0 (standard), 2.0.0 eller 1.0.0. Behövs bara om
  tjänsten kräver det, t.ex. ett lagernamn med punkt i (`Namnrymd.Lagernamn`)
  där WFS 1.1 avvisar begäran på grund av sin striktare typName-grammatik.
  Klienten skickar `count` i stället för `maxFeatures` när 2.0.0 valts, och
  bygger anropet med rätt GML-tolk för versionen.
- **Namnrymd (featureNS)** — fylls bara i om lagernamnet ovan har ett prefix
  (t.ex. `ps-nvr:PS.ProtectedSites.NR`) *och* tjänsten kräver att prefixet
  deklareras uttryckligen i anropet. Ange den fullständiga URI:n prefixet
  står för. De flesta tjänster behöver inte detta — lämna tomt om sökningen
  fungerar utan.

### Lager

Bara för söklager (ett WMS-underlager *är* redan sitt eget lager). Listar
lagernamnen "Hämta lagerlista" hittade; att välja ett annat lager rensar
automatiskt ett tidigare autoifyllt Geometrifält, eftersom det sällan finns
kvar på det nya lagret under samma namn.

### Hämta attribut

Hämtar attributnamn och -typer för det valda lagret (via WFS
`DescribeFeatureType`) och matar dem in som valbara alternativ i Sökfält,
Visningsfält, Inforuta-mallen och Geometrifält nedan — samma idé som
"Beskriv lager" i Lagerhanteraren, se
[admin-layermanager.md](admin-layermanager.md#beskriv-lager-attributtabell).

### Namn

Bara för söklager: **Visningsnamn** (visas för användaren i sökresultatet),
**Visningsnamn Admin UI** (bara internt) och **Kopplat kartlager** — se
"Kopplat kartlager (pid)" ovan.

### Inforuta

Samma mallredigerare och `{attributnamn}`-platshållarsyntax som i
Lagerhanteraren, se
[admin-infoklick-mallformat.md](admin-infoklick-mallformat.md). Ett
WMS-underlager har därtill ett fritt **Inforuta-ikon**-fält.

### Attributmappning

Bara för söklager: fritextfältet för alias-ordboken (`aliasDict`), oförändrat
från den äldre Söktjänster-fliken.

### Sökfält, Visningsfält m.fl.

Fyra fältlistor — **Sökfält**, **Primära visningsfält**, **Sekundära
visningsfält**, **Visningsfält i kartan** — redigeras genom att skriva
kommaseparerade namn, eller genom att välja ur listan hämtade attribut.
**Sökfält kan lämnas tomt**: `SearchModel.js` stöder söklager som bara är
sökbara via ritad yta/markering, utan någon textsökning alls.

### Geometrifält

Fylls i automatiskt från attributlistan när ett geometriattribut hittas,
annars anges det för hand. Ett expliciplt val i attributlistan skriver över
det autoifyllda värdet.

### Testa söklager

Längst ned i dialogen. **Testa** gör en riktig sökning mot tjänsten med
formulärets nuvarande värden, på samma sätt som kartan gör, och listar vad
som skulle gå fel. Inget sparas. Ett sökord kan anges (valfritt). Det söks
då mot Sökfält, annars hämtas några objekt utan filter.

Varför testet behövs: i kartan visas nästan alla fel som "Sökningen gav
inget resultat", eller som träffar på fel plats. Tjänstens egna
felmeddelanden syns aldrig för användaren.

Testet körs mot den första karta vars sökverktyg använder söklagret, eller
mot den första kartan om söklagret inte används någonstans ännu. Därifrån
hämtas kartans projektion, utbredning och projektionslista. Testet
kontrollerar:

- **CORS**: om tjänsten tillåter sökanrop direkt från webbläsaren. Gör den
  inte det fungerar sökningen i kartan bara om klientens `appConfig.json`
  har `searchProxy` satt till backendens sökproxy
  (`https://<server>/api/v2/searchproxy/`). Testet provar då samma anrop via
  sökproxyn. Sökproxyn tar bara emot url:er från sparade söklager, så för
  ett nytt söklager faller testet tillbaka på ett GET-anrop. Fel som bara
  gäller kartans POST-anrop syns då inte.
- **Tjänstens felmeddelanden** (ExceptionReport) i klartext, t.ex. en
  responstyp som tjänsten inte stöder.
- **Lagernamn med punkt** kräver WFS-version 2.0.0.
- **GML-version**: svarar tjänsten med GML 3.2 måste responstypen vara GML32,
  och tvärtom. Annars kan kartan inte läsa geometrierna.
- **Koordinaternas läge** mot kartans utbredning, inklusive **omvänd
  axelordning** (nord först). Det går inte att ställa in i Hajk; använd en
  annan tjänst med samma data. Så är det t.ex. med Naturvårdsverkets
  `naturvardsregistret/wfs`, där INSPIRE-tjänsten `inspire/ps-nvr/ows`
  fungerar.
- **Okänt `srsName`**: anger tjänsten geometrierna i ett koordinatsystem som
  kartan saknar projektion för, misslyckas sökningen.
- **GeoJSON utan crs** tolkas av kartan som WGS84 (grader).
- **Fält** i Sökfält och Visningsfält som inte finns i svaret (stora och små
  bokstäver spelar roll).
- **Sökning med ritad yta, radie och i kartans vy**: när läget är bekräftat
  görs också en rumslig sökning med en liten yta runt första träffen, på
  samma sätt som kartan gör. Den visar om Geometrifält är rätt och om
  tjänsten godtar kartans rumsliga filter.

## Radera / Ta bort sökkonfiguration

**Radera** (söklager) tar bort hela WFS-lagret ur `layers.json` permanent,
efter bekräftelse. **Ta bort sökkonfig** (WMS-underlager) rensar bara
sökfälten på det underlagret — själva lagret finns kvar i kartan och i
Lager-fliken precis som innan, men slutar vara sökbart tills sökkonfiguration
läggs till igen. Båda fallen tar en säkerhetskopia i `App_Data/.backups`
innan filen skrivs, precis som övriga skrivande formulär i Admin.

## Förhållande till Söktjänster (den äldre fliken)

Söklager-konsolen konsoliderar det den äldre fliken **Söktjänster**
(`views/search.jsx`, `models/search.js`) och delar av Lager-fliken gjorde var
för sig. Söktjänster-fliken är därför dold i `apps/admin/public/config.json`
(kommenterad bort i `router`-listan, inte borttagen), men koden bakom den och
dess wiring i `application.jsx` är orörda — en avsiktlig, ettradig
återställning om konsolen någonsin behöver backas ur. Att lägga till eller ta
bort själva WMS-lagret, eller ändra dess stil/synlighet/behörigheter, görs
fortfarande i Lager-fliken; Söklager-konsolen skriver bara till
sökrelaterade fält och rör aldrig strukturen i övrigt.

---

*Detta dokument beskriver läget i koden per 2026-09-15. Om `searchsources.jsx`
eller `SearchSourceForm.jsx` ändras bör denna guide uppdateras i samma PR.*
