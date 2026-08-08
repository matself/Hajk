# Hajk: URL-syntax för delbara länkar — referens

Hajks klient kan styras helt via parametrar i webbadressen. Det är samma "länkspråk" som används av [Dela](admin-tool-anchor.md)-verktyget (som bygger länken automatiskt utifrån kartans aktuella tillstånd), [Genvägar](admin-tool-preset.md) (där administratören skriver länkarna för hand) och av externa system som vill djuplänka in i en specifik vy.

Källa: `apps/client/src/models/appModel/urlParamsMerger.js`, `apps/client/src/models/AnchorModel.js` och `apps/client/src/components/App.jsx` (hashchange-lyssnaren).

## Query-sträng eller hash — båda funkar

Parametrarna kan skrivas antingen som vanlig query-sträng eller efter `#` som hash:

```
https://host/path?x=147325&y=6398754&z=4
https://host/path#x=147325&y=6398754&z=4
```

Klienten läser båda och slår ihop dem (`getMergedSearchAndHashParams`) — finns samma parameter på båda ställena vinner hash-värdet. I normalläge (`enableAppStateInHash` av, se [Kartinställningar → Inställningar](admin-mapoptions.md)) läses parametrarna bara vid sidladdning. Är `enableAppStateInHash` på hålls hash-delen av URL:en levande synkad med kartans tillstånd hela tiden, och att ändra hash manuellt (utan sidladdning) uppdaterar kartan direkt — utom `m`, ett byte där gör alltid en full omladdning.

## Parametrar

| Param | Betydelse | Exempel |
|---|---|---|
| `m` | Namn på kartkonfiguration (`mapConfigurationName`) att öppna. | `m=map_1` |
| `x`, `y` | Centrumkoordinat, i kartans projektion. Måste anges tillsammans. | `x=147325.27&y=6398754.17` |
| `z` | Zoomnivå (heltal). | `z=4` |
| `l` | Kommaseparerad lista av synliga lager-id. Ett `_l`-suffix på ett id slår även på lagrets etikett-läge (`useLabelStyle`). Om `l` finns åsidosätts lagrens "Synlig vid start"-inställningar helt. | `l=10,25,30_l` |
| `gl` | JSON-objekt för lager där bara en delmängd underlager är valda i en gruppering: `{lagerId: "underlager,som,csv"}`. | `gl={"12":"120,121"}` |
| `f` | URI-kodat JSON-objekt med CQL-filter per lager-id. | `f=%7B%2210%22%3A%22...%22%7D` |
| `p` | Kommaseparerad lista av plugin-typer som ska vara synliga vid start. Tom sträng (`p=`) döljer alla, parametern helt frånvarande respekterar admins standardinställning per verktyg. | `p=search,layerswitcher` |
| `q` | Söktext, fylls i och triggar sökverktyget. | `q=Storgatan+1` |
| `q_pc` | Djuplänk till [PropertyChecker](../apps/client/src/plugins/PropertyChecker/readme.md) — slår upp en fastighetsbeteckning/adress direkt. Kräver att verktyget och `propertyNameLookupWfsLayerId` är konfigurerat. | `q_pc=EXEMPLET+1%3A1` |
| `clean` | Om närvarande och inte `false`/`0`: startar kartan utan Hajks gränssnittsram (bara kartytan). | `clean=true` |
| `enableAppStateInHash` | Om närvarande (oavsett värde): aktiverar liveuppdatering av hash-parametrar för den här sessionen, se ovan. | `enableAppStateInHash` |

Saknas `x`/`y`/`z` faller klienten tillbaka på kartans konfigurerade standardvärden (Kartinställningar → Inställningar → Startzoom/Centrumkoordinat).

## Kända skillnader mellan länktyperna

- **Dela**-länkar och den levande hash-synkningen bygger alltid en fullständig länk med alla relevanta parametrar (`m`, `x`, `y`, `z`, `l`, ev. `gl`/`f`/`p`/`q`/`q_pc`).
- **Genvägar** kräver bara `x`+`y` eller `l` för att räknas som giltiga (se `isValidMapLink` i `PresetLinks.jsx`) och tolkas av ett eget, enklare kodspår som inte går via en sidladdning — `z` är valfri och faller då tillbaka på kartans nuvarande zoom.
- **Hemknappen** (`MapResetter`, se rad "Visa en hemknapp..." i [Kartinställningar → Inställningar](admin-mapoptions.md)) styrs *inte* av dessa parametrar. Den återställer alltid till administratörens konfigurerade standardvärden för zoom/centrum, oavsett hur kartan öppnades — även om sidan laddades via en länk med `x`/`y`/`z`.

---

*Detta dokument beskriver läget i koden per 2026-08-08.*
