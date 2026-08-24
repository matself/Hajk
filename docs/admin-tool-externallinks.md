# Verktyg: Externa kartlänkar (externalLinks) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/externalLink.jsx`, codename `externalLinks`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Verktyget öppnar kartans **nuvarande mittpunkt** i en extern webbapplikation. I klienten är det inte ett fönsterverktyg utan en kontrollknapp i kartans knapprad (ikonen `Launch` — en pil ut ur en ruta), tillsammans med [Genvägar](admin-tool-preset.md), Temaväxlaren och [Om kartan](admin-tool-information.md), på en plats som är hårdkodad i källkoden och inte går att flytta — koden ligger i `apps/client/src/controls/ExternalLinks.jsx`, inte under `plugins/`. Ett klick fäller ut en meny med de länkar du lagt upp här; valet öppnas i en ny flik. Verktyget döljs helt i `clean`-läge.

Poängen är URL-mallarna. Varje länk är en vanlig URL där koordinatplatshållare byts ut mot kartans mittpunkt vid klicket:

- `{x|EPSG:3006|0}` — axel (`x` eller `y`), projektion att räkna om till, samt antal decimaler (valfritt, standard 4).
- `{zoom}` — kartans aktuella zoomnivå. Användbart främst för att länka till en annan Hajk-karta; andra tjänster har sällan samma zoomskala, och värdet kan bli decimaltal.

## Fält

- Aktiverad
- Sorteringsordning — **saknar verkan för det här verktyget.** Fältet läses och sparas, men verktyget ritas som en fast kontrollknapp direkt i klientens `App.jsx` och passerar aldrig insticksmotorn som sorterar på `index`. Se [admin-tooloptions.md](admin-tooloptions.md) för varför: verktyget var tidigare ett plugin och behöll sin konfiguration när det gjordes om till en inbyggd kontroll. Samma sak gäller Genvägar och Om kartan.
- Tillträde (visas endast när AD-autentisering är påslagen; filtreringen sker i backend, inte i klienten)
- **Lägg till länk** — Namn\* och Url\*. Dubbletter på namn eller URL läggs inte till.
- **Visa exempel** — fäller ut en kort syntaxhjälp plus färdiga länkar som läggs till med ett klick: Google Street View, Google Maps, OpenStreetMap, Lantmäteriet Min karta, Hitta.se och Eniro kartor.
- **Länkar** — listan över upplagda länkar. Varje rad redigeras eller raderas inline via pennikonen.

## Att känna till

- **Det är mittpunkten som skickas, inte en klickad punkt.** Arbetsflödet är alltså "panorera dit du vill, klicka sedan" — verktyget är ingen högerklicksfunktion.
- **Projektionen måste vara registrerad.** Omräkningen sker i klienten via proj4, som laddas från kartkonfigurationens `projections`-lista vid start. Anger du en projektion som inte finns där kastar omräkningen ett fel som fångas och bara loggas som en varning i konsolen — menyvalet ser ut att inte göra någonting alls. Kontrollera `projections` i kartkonfigurationen innan du felsöker själva URL:en.
- **Verktygstexten kan inte sättas i formuläret.** Klienten läser en `title` i `options` (standard "Öppna koordinat i extern applikation"), men något fält för den finns inte här — den måste sättas direkt i kartans JSON.
- **"Synlig vid start" sparas inte.** Formuläret läser in `visibleAtStart` men skriver aldrig tillbaka den. Inställningen används inte av klienten, så det rör sig om död kod snarare än en felaktighet — men förvänta dig inte att den överlever en sparning.

## Exempel

### Lantmäteriet Min karta

Min karta, som använder SWEREF 99 TM (`/plats/3006/`) med heltalskoordinater:

```text
https://minkarta.lantmateriet.se/plats/3006/v2.0/?e={x|EPSG:3006|0}&n={y|EPSG:3006|0}&z=10
```

Verifierat mot tjänstens egen tolkning av länken:

- `3006` i sökvägen är obligatoriskt och hårdkodat — SWEREF 99 TM är den enda projektion Min karta accepterar i den här länkformen. Både `e` och `n` måste finnas, annars ignoreras positionen helt.
- `z` är valfritt och blir `11` om det utelämnas.
- `mapprofile` och `layers` är valfria; `layers` läses bara tillsammans med `mapprofile`. En delad länk från Min karta innehåller dem, men utan dem får du tjänstens standardvy.
- Tjänsten avrundar själv sina koordinater till heltal när den bygger en delningslänk, vilket är skälet till `|0` i exemplet ovan.
- Min karta rensar bort parametrarna från adressfältet när den läst dem, så att URL:en direkt efter laddning ser ut att sakna dem. Det är väntat och betyder inte att länken misslyckats.

### Hitta.se och Eniro

Båda tar WGS84 som **latitud före longitud** — alltså `{y|...}` först, tvärtom mot Min kartas ordning `e`/`n`. Det är det enklaste sättet att göra fel: en förväxling landar kartan i Indiska oceanen utan felmeddelande.

```text
https://www.hitta.se/kartan!~{y|EPSG:4326|5},{x|EPSG:4326|5},15z/
https://www.eniro.se/kartor?c={y|EPSG:4326|5},{x|EPSG:4326|5}&z=15
```

Eniros format är bekräftat som tjänstens eget: knappen "Kopiera länk" i Eniro skapar en kortlänk som i sin tur pekar tillbaka på exakt den här `?c=`-formen. `kartor.eniro.se` skickar numera vidare till `www.eniro.se/kartor`.

Hitta.se har ett kartläge till som fungerar tillsammans med koordinaterna, satellitkartan:

```text
https://www.hitta.se/kartan/satellit!~{y|EPSG:4326|5},{x|EPSG:4326|5},15z/
```

**Fällan: `/kartan/flygfoto` finns inte.** Skriver du `flygfoto` i stället för `satellit` laddas sidan utan fel, koordinaterna används — och du får den vanliga kartan. Läget existerar helt enkelt inte, men ingenting i gränssnittet säger ifrån. Kontrollera alltid att sidans titel byts (satellitläget sätter "Satellitkarta - hitta.se") innan du litar på ett lägesnamn du inte sett dokumenterat.

En sak till som ser ut som ett fel men inte är det: Hitta.se serverrenderar alltid en IP-positionerad startvy, och läser din URL först efter att sidan hydrerats. Tittar man på sidans initiala tillstånd ser länken därför ut att ha ignorerats även när den fungerar.

Räkna också med att båda tjänsterna öppnas med ett delvis ofullständigt gränssnitt — paneler som normalt finns kan saknas. Mallarna ovan är den minsta länkform som bär positionen, medan tjänsternas egna länkar innehåller ytterligare sökvägssegment som initierar resten av gränssnittet. Det är kosmetiskt: kartan hamnar rätt, och verktygets uppgift är att lämna över en plats, inte att återskapa hela tjänsten. Leta alltså inte efter ett konfigurationsfel — det finns inget.

Observera slutligen att Eniros kartbilder numera kommer från OpenStreetMap och Esri. De snedbilder som en gång var tjänstens främsta skäl att länka ut finns inte kvar, och något URL-läge för Flygfoto/Hybrid har inte gått att fastställa — de är därför medvetet utelämnade här hellre än gissade.

### Fornsök

Riksantikvarieämbetets **Fornsök** går däremot *inte* att länka till med koordinater. Applikationen lägger aldrig kartans position i URL:en, och de enda parametrar den läser är interna. Endast enskilda objekt är länkbara (`/open/fornsok/lamning/<uuid>`), vilket det här verktyget inte kan bygga eftersom det bara ersätter koordinater.

---

*Detta dokument beskriver läget i koden per 2026-08-24.*
