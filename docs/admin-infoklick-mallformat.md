# Infoklick-mallformat — syntaxreferens

Det här dokumentet beskriver hela formateringsspråket som kan användas i ett lagers Inforuta (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md), [admin-vector-layer-form.md](admin-vector-layer-form.md), [admin-arcgis-layer-form.md](admin-arcgis-layer-form.md)) eller i kartans Infobox-åsidosättande ([admin-mapsettings.md](admin-mapsettings.md)) — d.v.s. innehållet som visas i infoklick-popupen när en användare klickar på ett objekt i kartan. Se [admin-tool-infoclick.md](admin-tool-infoclick.md) för verktygets egna (globala) inställningar, t.ex. `Tillåt HTML i infoclick` och `Tillåt fler tecken... som del av infoclicks placeholder`, som båda påverkar hur nedanstående syntax tolkas.

All rendering sker klientsidan i [`FeaturePropsParsing.jsx`](../apps/client/src/components/FeatureInfo/FeaturePropsParsing.jsx). Mallen är i grunden Markdown (GitHub-flavored, tabeller med `| a | b |` fungerar alltid) med några Hajk-specifika tillägg beskrivna nedan.

## Platshållare — `{attributnamn}`

Ersätts med värdet av det klickade objektets attribut med samma namn. Vilka tecken som tillåts inuti `{ }` styrs av verktygsinställningen **Tillåt fler tecken...** (`useNewPlaceholderMatching`, se [admin-tool-infoclick.md](admin-tool-infoclick.md)):

- **Av (standard, väl testad)**: bara bokstäver/siffror, mellanslag, å/ä/ö och de tio tecknen `@ - | ! , ' . ( ) :`. Ett `"`-tecken (dubbelfnutt) inuti `{ }` matchas t.ex. **inte** — `{name|default("N/A")}` fungerar därför bara med det nya läget påslaget (se filter nedan, som ofta behöver `"`).
- **På**: vad som helst utom `}` matchas, t.ex. Markdown-formatering (`*`, `#`) inuti platshållaren.

Exempel: `{name}`, `{area}`.

## Villkorsblock — `{{if ...}}...{{/if}}`

Visar eller döljer innehåll beroende på ett attributs värde (efter att platshållare redan ersatts). Stödjer bara likhet/olikhet — **inga** `>`/`<`-jämförelser:

```
{{if status="öppen"}}Området är öppet.{{/if}}
{{if owner!="Okänd"}}Ägare: {owner}{{/if}}
{{if description}}{description}{{/if}}
```

- `{{if attr="värde"}}` / `{{if attr!="värde"}}` — citattecken frivilliga, jämförs löst (`2` == `"2"`).
- `{{if attr}}` (utan `=`) — visar innehållet om `attr` inte är tomt.
- **Kan inte nästlas** — ett `{{if}}` inuti ett annat `{{if}}` fungerar inte.
- Om jämförelsevärdet innehåller `=` men ser ut som en URL (t.ex. `?a=b`) tolkas det inte som en jämförelse, för att inte krocka med länkar.

Denna syntax är precis det som gör att `{{if}}`-innehåll automatiskt låser den nya WYSIWYG-editorn till Kod-läge (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)) — editorn kan inte garantera att godtycklig HTML inuti blocket överlever en visuell redigering oskadd.

## Filter — `{attr|filternamn(argument)}`

Kedjar en eller flera bearbetningssteg på ett attributvärde (eller en citerad textsträng, `{'2021-06-03'|date}`). Flera filter kan kedjas: `{val|filter1|filter2(arg)}`.

| Filter | Argument | Gör | Exempel |
|---|---|---|---|
| `roundToDecimals` | antal decimaler, `1`=returnera originalvärdet om inte numeriskt | Avrundar och lokalformaterar tal | `{'45.32465'|roundToDecimals(2,1)}` → `45.32` |
| `replace` | sök, ersätt | Textersättning (RegExp) | `{'BAD'|replace('BAD','GOOD')}` → `GOOD` |
| `default` (alias `fallback`) | standardvärde | Returnerar standardvärdet om attributet är tomt | `{''|default('Saknas')}` → `Saknas` |
| `lt` | jämförvärde, om-mindre, om-inte | Numerisk jämförelse, mindre än | `{10.3|lt('11','Mindre','Större')}` → `Mindre` |
| `gt` | jämförvärde, om-större, om-inte | Numerisk jämförelse, större än | `{10.3|gt('9.2','Större','Mindre')}` → `Större` |
| `naNToNum` | standardtal | Ersätter NaN/tomt värde med ett tal | `{NaN|naNToNum('-1000')}` → `-1000` |
| `hasValue` | om-värde, om-tomt | Textsträng beroende på om värdet finns | `{'x'|hasValue('Finns','Saknas')}` → `Finns` |
| `equals` | jämförvärde, om-lika, om-olika | Strikt jämförelse | `{'true'|equals('true','Ja','Nej')}` → `Ja` |
| `notEquals` | jämförvärde, om-olika, om-lika | Omvänd `equals` | `{'false'|notEquals('true','Är inte true','Är true')}` → `Är inte true` |
| `datetime` | — | Datum+tid, lokalt format | `{'2021-06-03T13:04:12Z'|datetime}` |
| `date` | — | Bara datum (tolkar även `ÅÅÅÅMMDD` utan bindestreck) | `{'20210603'|date}` → `2021-06-03` |
| `time` | — | Bara klockslag | `{'2021-06-03T13:04:12Z'|time}` |
| `dateAddDays` | antal dagar (kan vara negativt) | Lägger till/drar bort dagar, kedja med `\|datetime` för att formatera | `{d|dateAddDays(1)|datetime}` |
| `dateAddHours` | antal timmar | Samma, för timmar | `{d|dateAddHours(-2)|datetime}` |
| `formatNumber` | — | Lokalformaterar med tusentalsavgränsare | `{'98000'|formatNumber}` → `98 000` |
| `multiplyBy` | multiplikator | Multiplicerar värdet | `{'0.08'|multiplyBy(100)}` → `8` |
| `subscript` / `superscript` | — | Gör siffror till nedsänkt/upphöjt Unicode | `{'CO2'|subscript}` |
| `toUpper` / `toLower` / `capitalize` | — | Skiftlägeshantering | `{'test'|capitalize}` → `Test` |
| `substr(start,längd)` / `substring(start,slut)` | — | Delsträng (två olika JS-varianter) | `{'abcdef'|substring(2,4)}` → `cd` |
| `left(avgränsare)` / `right(avgränsare)` | — | Text före/efter första förekomsten | `{'a_b'|left('_')}` → `a` |
| `trim` | — | Tar bort inledande/avslutande whitespace | `{'  x  '|trim}` → `x` |
| `toProjection` | x/y, x-attribut, y-attribut, mål-CRS, decimaler | Omprojicerar en koordinat från kartans nuvarande projektion | `{x|toProjection('x','xprop','yprop','EPSG:4326',4)}` |

Ett filternamn som stavas fel eller inte finns loggar en varning i webbläsarkonsolen och lämnar värdet oförändrat — det syns inget felmeddelande för slutanvändaren.

Argument till filter kan även peka på ett annat attributnamn istället för ett literalt värde (gäller argument skrivna med gemener utan citattecken, t.ex. `xprop`/`yprop` i `toProjection`-exemplet ovan).

## Externa plugin-platshållare — `{attributnamn@@pluginnamn}`

Avancerad, sällan använd av vanliga administratörer — låter en specifik Klient-plugin rendera eget innehåll (t.ex. en bild eller komponent) istället för bara textvärdet. Kräver att den namngivna pluginen aktivt lyssnar efter händelsen (annars visas ingenting). Skrivs `{propertyName@@pluginName}` — dubbel snabel-a (`@@@`) undviks medvetet för att inte krocka med denna syntax.

## Länkar med extra attribut — `[text](url){key=value ...}`

Kräver att **Tillåt HTML i infoclick** är påslagen (se [admin-tool-infoclick.md](admin-tool-infoclick.md)). Konverterar en Markdown-länk till en riktig `<a>`-tagg med extra HTML-attribut:

```
[Ladda ner rapport](https://example.com/rapport.pdf){target=_blank}
```
blir `<a href="https://example.com/rapport.pdf" target="_blank">Ladda ner rapport</a>`.

**Dölj döda länkar automatiskt** — lägg till `link-check=true`:

```
[Dokument](https://example.com/dok.pdf){link-check=true}
```

Länken är dold från start. Efter att sidan laddat görs en snabb kontroll (`HEAD`-anrop) mot url:en i bakgrunden: fungerar den, visas länken. Ger den fel (404, nätverksfel etc.) förblir den dold permanent. Lägg till `link-check-fallback="Rapporten är inte längre tillgänglig"` för att visa en textrad istället för den dolda länken när kontrollen misslyckas.

Vanliga Markdown-länkar (utan `{...}`-attribut) behöver inte HTML-inställningen och får sina mellanslag/specialtecken i url:en automatiskt kodade (`Some file.pdf` → `Some%20file.pdf`).

## Attribut som egentligen är JSON

Om ett attributs värde är en textsträng som ser ut som JSON (t.ex. `{"handlaggare":"Anna"}` eller en lista), packas den automatiskt upp: originalattributet försvinner och JSON-objektets egna nycklar blir tillgängliga som vanliga platshållare direkt (`{handlaggare}`, inte `{extra.handlaggare}`).

## Alltid tillgängliga platshållare: `{click:x}`, `{click:y}`, `{click:zoom}`

Kartkoordinaten och zoomnivån för senaste klicket i kartan — tillgängliga i alla infoklick-mallar oavsett lagertyp, inte kopplade till det klickade objektets egna attribut.

---

*Detta dokument beskriver läget i koden per 2026-08-04. Om syntaxen ändras i `FeaturePropsParsing.jsx`/`FeaturePropsFilters.js` bör denna guide uppdateras i samma PR.*
