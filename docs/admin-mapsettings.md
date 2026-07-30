# Kartinställningar — översikt

Det här dokumentet beskriver fliken **Kartinställningar** i Admin (`mapsettings.jsx`, komponenten `Menu`). Sidan har fem delar: kartval/-hantering överst, och fem knappar (Lagerväljare, Ritordning, Inställningar, Verktyg, Teman) som växlar vad som visas i huvudytan under.

**Inställningar** är dokumenterad separat i [admin-mapoptions.md](admin-mapoptions.md). **Verktyg** är en egen, betydligt större komponent (`tooloptions.jsx` + en fil per verktygsplugin under `views/tools/`) och dokumenteras separat vid behov — det här dokumentet täcker bara det som ligger direkt i `mapsettings.jsx`: kartval, Ritordning, Lagerväljare och Teman.

## Hantera / Skapa karta

Överst på sidan, alltid synligt oavsett vilken av de fem panelerna som är vald.

- **Välj karta** — väljer vilken `map_*.json` som redigeras i resten av sidan.
- **Öppna i nytt fönster** — öppnar den valda kartan i Klienten, i en ny flik.
- **Ta bort karta** — raderar den valda kartans konfigurationsfil, efter bekräftelse.
- **Säkerhetskopior** — öppnar en fristående backup/återställningssida (`{url_map}/backups-ui?map=...`), serverad av backend bakom samma admin-spärr. Låst till den valda kartan.
- **Namn + Skapa ny karta** — skapar en ny, tom karta med angivet namn.
- **Duplicera karta** — kopierar den just nu valda kartan till en ny fil med det angivna namnet.

Kartnamn valideras till `0-9 a-z A-Z _` — inga mellanslag eller specialtecken.

## Ritordning

Visar samtliga tända lager (oavsett grupp) i en enkel drag-och-släpp-lista. Ordningen i listan avgör ritordningen i kartan (längst ner i listan = ritas överst). Tryck **Spara** för att spara den nya ordningen till kartans konfiguration.

## Lagerväljare

Den här panelen konfigurerar LayerSwitcher-pluginen (lagerhanteraren i Klienten) för den valda kartan: dess fönsterbeteende, globala funktioner, och själva menyträdet av grupper och lager.

**Aktiverad**
Om LayerSwitcher-verktyget överhuvudtaget ska vara aktivt i kartan.

### Fönsterinställningar

| Fält | Beskrivning |
|---|---|
| Verktygsplacering | `toolbar` = Drawer Plugin, `left`/`right` = Widget Plugin, `control` = Control button. |
| Fönsterplacering | `left` eller `right` — var fönstret placeras när det är en Widget Plugin. |
| Fönsterbredd | Bredd i pixlar. Tomt = standardbredd. |
| Fönsterhöjd | Pixlar, `dynamic` (anpassa efter innehåll) eller `auto` (maximal höjd). |
| Rubrik | Titel som visas på Widget Plugin-knappen. |
| Beskrivning | Beskrivningstext inne i Widget Plugin-knappen. |

### Inställningar för Lagerhanteraren

| Fält | Beskrivning |
|---|---|
| Synlig vid start | Om lagerhanteraren är öppen när kartan laddas. |
| Synlig vid start (mobil) | Samma, men för mobilvyn. |
| Visa brödsmulor | Visar små kort längst ner på skärmen, ett per aktivt lager. |
| Visa en flik med ritordning | Lägger till en flik i lagerhanterarens gränssnitt (i Klienten) för att låta slutanvändaren själv ändra ritordning på tända lager — se egen sektion nedan. |
| Visa filter | Visar ett textfilter i lagerhanteraren. |
| Visa en grupp med snabbåtkomst | Visar snabbåtkomst-gruppen (teman/favoriter) i lagerhanteraren — se "Teman" nedan. |
| Försök göra teckenförklaring transparent (Experimentell) | Försöker göra GetLegendGraphic transparent och lägger till bakgrund; text blir vit i dark mode för GeoServer. |
| Försök hämta teckenförklaring i 180dpi (Experimentell) | Begär legend-bilder i högre upplösning. |
| Visa transparensreglage | Global på/av-switch. Måste vara ikryssad för att transparensreglage ska kunna visas för *något* lager, oavsett per-lager-inställning. |
| Visa filter med CQL | Global på/av-switch för CQL-filterfältet, visas då för alla lager. |
| Visa teckenförklaring direkt | Visar teckenförklaringen direkt i lagerdetaljvyn utan extra klick. |
| Instruktion | Fri text som visas som instruktion i lagerhanteraren. Lagras base64-kodad. |
| Tillträde | Endast synligt när AD-autentisering är aktiverad i Admin. Kommaseparerad lista av AD-grupper som styr vilka som ser lagerhanteraren överhuvudtaget. |

### Inställningar för flik med ritordning

Gäller "Visa en flik med ritordning" ovan — en flik i Klientens lagerhanterare där slutanvändaren själv kan dra om ordningen på sina egna tända lager (skiljer sig från admins Ritordning-panel, som sätter standardordningen för alla).

- **Visa reglage för systemlager** — visar en switch för att slå på/av visning av systemlager i listan.
- **Lås ritordning för bakgrundskartor** — bakgrundslager hamnar alltid underst och kan inte flyttas; en lås-ikon visas.
- **Infotext Flik med ritordning** — instruktionstext överst i den fliken.

### Inställningar för grupp med snabbåtkomst

- **Ladda tema** — om användaren får ladda fördefinierade teman (se "Teman" nedan) till sin snabbåtkomst.
- **Infotext Ladda tema** — instruktionstext i den panelen.
- **Mina favoriter** — om användaren får spara egna favoritval av lager/bakgrund till senare.
- **Infotext Mina favoriter** — instruktionstext i den panelen.

### Kartinställningar (temakarta)

- **Visa kartan i lista över tillgängliga kartor** — om kartan ska dyka upp i en dropdown över temakartor i Klienten (för miljöer med flera kartor).
- **Kartans titel i listan över tillgängliga kartor** — visningsnamnet i den listan.

### Inställningar för varning vid zoombegränsning

**Visa varningsruta endast när man tänder lager** — som standard visas varningsrutan både vid start och när ett lager automatiskt döljs pga Min/Max zoom; kryssa i för att bara visa den när användaren själv slår på lagret. (Motsvarande inställning finns även per lager, se [admin-wms-layer-form.md](admin-wms-layer-form.md).)

### Inställningar för bakgrundslager

- **Svart bakgrundskarta** / **Vit bakgrundskarta** — lägger till en helsvart/-vit bakgrund som eget val i bakgrundsväljaren.
- **Visa lagren "Vit" och "Svart" längst ner i listan** — annars sorteras de in bland övriga bakgrundslager.

### Justera lagerhanteraren — menyträdet

Trädet visar den faktiska gruppstrukturen för lagermenyn i den valda kartan (bakgrundslager överst, sedan grupper). **Ny grupp** lägger till en tom grupp överst i trädet.

Klicka på ett **gruppnamn** i trädet för att redigera det på plats:

| Fält | Beskrivning |
|---|---|
| Namn | Gruppens visningsnamn. |
| Expanderad vid start | Om gruppen är utfälld när kartan laddas. |
| Toggla alla-knapp | Visar en knapp för att slå på/av alla lager i gruppen samtidigt. |
| Exklusiv grupp | Endast ett lager i gruppen kan vara tänt åt gången (radioknapp-beteende istället för kryssrutor). |
| Infodokument (kryssruta) | Slår på fälten nedan — en expanderbar infopanel för själva gruppen, utöver de enskilda lagrens egna infopaneler. |
| → Rubrik / Text / Länk / Länktext / Länk till öppna data / Ägare | Samma mönster som Infodokument-fälten i lagerformulären, se [admin-wms-layer-form.md](admin-wms-layer-form.md#infodokument-valfri-expanderbar-sektion), men här gäller det gruppen som helhet. |

Klicka på ett **lagernamn** i trädet för att redigera dess placering i just den här menyn:

| Fält | Beskrivning |
|---|---|
| Synlig vid start | Om lagret är tänt när kartan laddas. |
| Tillträde | Endast synligt när AD-autentisering är aktiv. Kommaseparerad lista av AD-grupper som får se just detta lager i den här menyplaceringen. |
| Infobox | Fri text — skriver över lagrets egen Inforuta (se [admin-wms-layer-settings.md](admin-wms-layer-settings.md)) specifikt för den här menyplaceringen, utan att ändra lagrets grundinställning. |

Röda minus-ikonen (till vänster om namnet) tar bort noden — för en grupp tas alla undergrupper och lager i den bort samtidigt, efter bekräftelse.

## Teman (snabbåtkomst)

Hanterar färdiga "teman" — fördefinierade uppsättningar av tända/släckta lager plus bakgrund — som slutanvändare kan ladda via snabbåtkomst-gruppen i lagerhanteraren (se kryssrutan "Ladda tema" ovan).

- **JSON-fil\*** — en exporterad temafil (lagerdefinitioner) att importera.
- **Titel\*** — namnet som visas för temat i Klienten.
- **Ägare** — visas tillsammans med temat.
- **Beskrivning** — visas tillsammans med temat.
- **Nyckelord** — fria sökord, ett i taget via "Lägg till"; visas som borttagningsbara chips.

Listan till vänster visar befintliga teman (filtrerbar); klick på ett tema växlar formuläret till redigeringsläge (**Spara**/**Avbryt**) istället för **Lägg till**.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om `mapsettings.jsx` ändras bör denna guide uppdateras i samma PR. Verktyg (`tooloptions.jsx` + `views/tools/*`) är inte täckt här — hör av dig om det behövs som egna dokument.*
