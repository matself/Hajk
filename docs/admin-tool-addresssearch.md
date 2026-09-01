# Verktyg: Adressök (addresssearch) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/addresssearch.jsx`, codename `addresssearch`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Verktyget söker **belägenhetsadresser** i Lantmäteriets tjänst Belägenhetsadress Direkt (v4.2) och flyttar kartan till den adress användaren väljer, med en markör på adresspunkten. Det går också åt andra hållet: en knapp gör kartan klickbar, och klicket hämtar närmaste adress.

Till skillnad från [OSM-sökning](admin-tool-osmsearch.md), som anropar Nominatim direkt från webbläsaren, går alla anrop här genom en proxy i Hajks backend. **Verktyget fungerar inte utan att den proxyn är påslagen** — se Förutsättningar nedan.

Verktyget ingår inte i standardkartan `map_1.json`, eftersom det kräver ett avtal för att fungera. Lägg till det i de kartor som ska ha det.

## Förutsättningar

1. **Prenumeration på Belägenhetsadress Direkt** via [Geotorget](https://geotorget.lantmateriet.se/). Produkten är kostnadsfri, men åtkomsten ges per organisation enligt Lantmäteriets villkor — uppgifterna nedan står alltså för någons godkända användning av tjänsten, inte för en faktura.
2. **Proxyn påslagen i backend.** Sätt `LANTMATERIET_BELAGENHETSADRESS_ACTIVE=true` i `apps/backend/.env` och starta om backend. Utan den är rutten inte ens monterad, och verktyget svarar "Adresstjänsten svarade inte (404)".
3. **Autentiseringsuppgifter**, på ett av två ställen:
   - **I `.env`** (`LANTMATERIET_BELAGENHETSADRESS_USER` och `_PASSWORD`, alternativt `_TOKEN`). Att föredra: uppgifterna når då aldrig webbläsaren.
   - **I det här formuläret** (fälten Användarnamn/Lösenord/Token). Använd det när den som konfigurerar Hajk inte kommer åt serverns `.env`. Uppgifterna sparas då i kartans konfiguration och skickas av webbläsaren vid varje anrop — de är alltså läsbara för den som öppnar utvecklarverktygen.

Sätts uppgifter på båda ställena vinner serverns. Kommandot `npm run check-belagenhetsadress` i `apps/backend` visar vilken metod som öppnar vilka endpoints, vilket är det snabbaste sättet att reda ut ett nekat anrop.

## Fält

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Användarnamn** och **Lösenord** (`username`, `password`) — Geotorget-uppgifter för Basic-autentisering, vilket är det tjänsten efterfrågar. Lämna tomma om uppgifterna ligger i `.env`.
- **Token** (`token`) — bearer-token från Lantmäteriets API-manager, som alternativ till uppgifterna ovan. Används före dem när den är ifylld.
- **Max antal träffar** (`maxHits`, standard 15) — API:et tillåter upp till 500, men listan visar bara en handfull åt gången och varje träff är data som ska hämtas och tolkas. Höj bara om sökningarna är så breda att relevanta adresser faller utanför.
- **Fördröjning (ms)** (`debounceTime`, standard 350) — hur länge verktyget väntar efter senaste tangenttryckningen innan det söker. Varje sökning är ett anrop mot Lantmäteriet; ett högre värde ger färre anrop men en trögare upplevelse.
- **Kommunkod** (`kommunkod`) — fyrsiffrig kod enligt Rikets indelningar, t.ex. `0180` för Stockholm. Begränsar sökningen till en kommun. Tomt = hela landet.
- **Zoomnivå** (`zoom`, standard 16) — zoomnivån kartan går till när en adress väljs. En adresspunkt saknar utbredning, så det finns ingen omfattning att anpassa kartan efter.
- **Visa endast gällande adresser** (`onlyCurrentAddresses`, standard på) — utesluter adresser med status "Reserverad", alltså sådana som är beslutade men ännu inte i bruk.
- **Tillåt att hämta närmaste adress genom att klicka i kartan** (`enableMapClick`, standard på) — styr om kartklicksknappen visas.
- Synlig vid start, Tillträde

Saknar det generella "Instruktion"-fältet.

## Så fungerar sökningen

Sökningen sker i två steg, därför att API:et skiljer på adressens _namn_ och dess _läge_:

1. Medan användaren skriver frågas `referens/fritext`, som returnerar adressbeteckningar och id:n — ingen geometri. Det är det billiga anropet, och det är detta `Fördröjning` styr takten på. Söksträngar kortare än tre tecken skickas aldrig; API:et avvisar dem ändå.
2. Först när användaren väljer en träff hämtas hela adressen med geometri. Bara den valda adressen kostar alltså ett andra anrop.

Träffarna visas som `Lantmätarvägen 2, 187 53 Täby`. API:ets egen etikett är längre — `Täby Täby Lantmätarvägen 2 18753 Täby`, där kommunen står två gånger, en gång som kommun och en gång som kommundel — så verktyget begär strukturerade adressdelar och bygger en kortare etikett själv. Skulle de delarna inte gå att tolka används API:ets etikett rakt av; sökningen fungerar då som vanligt, bara med längre text i listan.

## Kartklick

Knappen med kartnålen bredvid sökfältet slår om kartan till adressläge: nästa klick hämtar närmaste adress och fyller i den i fältet. Medan läget är på blockeras andra klickverktyg (Infoklick och liknande) så att samma klick inte utlöser två saker. Läget stängs av med knappen igen, och alltid när verktygsfönstret stängs.

Under fältet visas då **Adresspunktens läge** — `insamlingslage` i API:et, med värden som "byggnad" eller "ingång". Det avgör hur bokstavligt markören ska läsas: en ingångspunkt ligger på husets gatusida, en byggnadspunkt någonstans inom byggnadens yta. Värdet visas som tjänsten skriver det, så även lägen som den här versionen inte känner till visas begripligt.

## Att känna till

- **Tjänsten talar bara SWEREF 99.** Det finns ingen WGS84-variant. Verktyget begär därför kartans egen projektion när den är en av EPSG:3006–3018 — normalfallet för en svensk karta, och då sker ingen omräkning alls. Är kartan i något annat, till exempel EPSG:3857, hämtas adresserna i EPSG:3006 och räknas om i klienten. **Det kräver att `EPSG:3006` finns med i kartans `projections`-lista**, eftersom det är därifrån proj4 laddas vid start. Saknas den säger verktyget ifrån med vilken projektion som fattas, i stället för att markören hamnar fel.
- **Ett nekat anrop handlar oftast inte om fel lösenord.** Lantmäteriets API-gateway svarar `403` med koden `900910` — "scope validation failed" — när uppgifterna är giltiga men behörigheten inte täcker just den endpointen. Verktyget visar tjänstens egen text i felmeddelandet just därför att den skillnaden är avgörande: det är en fråga om vad prenumerationen omfattar, inte om vilka uppgifter som är ifyllda. `401` med `900902` betyder däremot att inga uppgifter alls kom fram.
- **Uppgifter i formuläret når webbläsaren.** De sparas i kartkonfigurationen och skickas med varje anrop. Det är en medveten avvägning för installationer utan tillgång till `.env`, men `.env` är det säkrare valet när det går.
- **Kommunkoder med inledande nolla måste skrivas som text.** Formuläret behandlar fältet som en sträng just för att `0180` annars skulle bli `180`, som inte matchar någon kommun.
- **Proxyn skiljer inte på anropare.** Alla vägar under produktens bas-URL vidarebefordras till den som når backend. På en publikt exponerad instans bör rutten `/api/v2/belagenhetsadressproxy` begränsas i den omvända proxyn eller på nätverksnivå, så att er godkända åtkomst inte används av utomstående.

## Felsökning

| Symptom                                                          | Trolig orsak                                                                                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| "Adresstjänsten svarade inte (404)"                              | `LANTMATERIET_BELAGENHETSADRESS_ACTIVE` är inte satt, eller backend inte omstartad.                                                            |
| "Adresstjänsten nekade anropet (401)"                            | Inga uppgifter nådde fram, eller fel användare. Kontrollera stavning och att lösenordet i `.env` är citerat om det innehåller `#`.             |
| "Adresstjänsten nekade anropet (403): … Scope validation failed" | Uppgifterna godtas men behörigheten täcker inte endpointen. Kör `npm run check-belagenhetsadress` och kontakta Lantmäteriet med resultatet.    |
| Sökningen ger träffar men kartan flyttar sig inte                | `EPSG:3006` saknas i kartans `projections` och kartan är i en projektion tjänsten inte stödjer.                                                |
| Träffarna visas med lång etikett (`Täby Täby …`)                 | De strukturerade adressdelarna kunde inte tolkas. Sökningen fungerar; se webbläsarkonsolen, där verktyget loggar det svar det inte kände igen. |
| Verktyget syns inte i kartan                                     | Verktyget är inte tillagt i kartans konfiguration, eller `AddressSearch` saknas i klientens `availableTools` i `appConfig.json`.               |

---

_Detta dokument beskriver läget i koden per 2026-09-01._
