# Dölja verktyg i Admin (hiddenTools)

Den här utgåvan av Hajk riktar sig till privatpersoner och föreningar snarare än till kommuner och offentlig sektor. Verktyg som kräver en kommersiell licens, ett betalkonto eller kommunal backend-infrastruktur — och verktyg som helt enkelt ligger utanför utgåvans omfattning — är därför dolda som standard.

Ingenting är borttaget. Varje plugin ligger kvar i källkoden med sitt admin-formulär intakt, och hela filtreringen är konfiguration i två JSON-filer som läses vid körning. Att ta tillbaka ett verktyg kräver varken kodändring eller ombyggnad.

## Så fungerar filtreringen

Verktygslistan i [Kartinställningar → Verktyg](admin-tooloptions.md) byggs från objektet `toolTypes` i `apps/admin/src/views/tooloptions.jsx`. Innan listan renderas filtreras den mot arrayen `hiddenTools`, som hämtas från `mapsettings`-sektionen i `apps/admin/public/config.json`:

```json
"mapsettings": {
  "...": "...",
  "hiddenTools": [
    "buffer",
    "collector",
    "dummy",
    "edit",
    "fmeserver",
    "sketch",
    "timeslider"
  ]
}
```

Saknas nyckeln, eller är den något annat än en array, visas alla verktyg — det vill säga standardbeteendet är oförändrat mot uppströms Hajk.

`config.json` ligger i `public/` och hämtas med `fetch` när Admin startar. I en byggd installation betyder det att du redigerar `build/config.json` på servern och laddar om sidan. Ingen ombyggnad behövs.

## Dolda verktyg i den här utgåvan

| Codename | Visningsnamn | Skäl |
|---|---|---|
| buffer | Buffra | Utanför utgåvans omfattning |
| collector | Tyck till | Kräver en WFS-T-tjänst att skriva synpunkter till |
| dummy | Dummy (testplugin) | Testplugin, inte avsett för produktion |
| edit | Redigera | Kräver en transaktionell WFS-T-tjänst |
| fmeserver | FME-server | Kräver licens för FME Server (Safe Software) |
| sketch | Rita | Utanför utgåvans omfattning |
| timeslider | Tidslinje | Utanför utgåvans omfattning |

Listan är ett redaktionellt val för den här utgåvan, inte en teknisk nödvändighet. `buffer`, `sketch` och `timeslider` fungerar utmärkt utan externa tjänster och kan tas tillbaka utan vidare om du vill ha dem.

## Ta tillbaka ett dolt verktyg

Det krävs två ändringar — en för att verktyget ska gå att konfigurera i Admin, en för att klienten ska ladda plugin:et.

1. **Admin:** ta bort verktygets codename ur `hiddenTools` i `apps/admin/public/config.json`. Verktyget dyker upp i listan direkt vid omladdning.
2. **Klienten:** lägg tillbaka plugin-namnet i arrayen `availableTools` i `apps/client/public/appConfig.json`. Utan det steget går verktyget att konfigurera i Admin men laddas aldrig i kartan.

Sedan aktiverar du verktyget på kartan som vanligt, inifrån dess eget formulär.

**Observera versalerna.** De två listorna använder olika skrivsätt för samma verktyg: Admin använder verktygets `type` med gemener (`fmeserver`), klienten använder plugin-katalogens namn med versaler (`FmeServer`). Klienten validerar `availableTools` mot listan `AVAILABLE_TOOLS` i `apps/client/src/constants.js` och skriver en varning i webbläsarkonsolen om ett namn inte känns igen — ett felstavat namn filtreras bort tyst i övrigt.

I den här utgåvan innehåller `availableTools` följande:

```
Anchor, Bookmarks, Coordinates, DocumentHandler, InfoDialog, LayerComparer,
LayerSwitcher, Location, MailForm, Mapillary, Measurer, OsmSearch, Print,
Routing, Search, StreetView
```

Utöver de verktyg som är dolda i Admin saknas även `PropertyChecker` här. Det är ett kommunspecifikt plugin utan admin-formulär över huvud taget, så det kan bara styras från klientens lista.

## Dolt är inte samma sak som avstängt

Filtreringen döljer verktyget i Admins lista. Den rör inte kartkonfigurationerna. Ett verktyg som redan är aktiverat i en karta fortsätter alltså att ligga kvar i kartans `tools`-array och fungerar som vanligt i klienten — men det syns inte längre i Admin, och kan därmed inte längre stängas av via gränssnittet.

**Rensa verktyget ur kartorna innan du döljer det.** Kartmallen `apps/backend/App_Data/map_1.json` är redan rensad från `buffer` och `sketch` av den anledningen. Kartor i en driftsatt `App_Data`-katalog är inte det, utan måste rensas där.

Har det redan hänt finns två vägar tillbaka: ta tillfälligt bort verktyget ur `hiddenTools`, stäng av det i Admin och lägg tillbaka det i `hiddenTools` — eller redigera kartans JSON-fil direkt.

## Skillnad mot uppströms utkommenterade verktyg

Uppströms Hajk döljer verktyg genom att kommentera bort tre ställen i `tooloptions.jsx`: importen, `case`-grenen i `getActiveTool` och raden i `toolTypes`. Fem verktyg är avstängda på det sättet — `draw`, `measure`, `export`, `informative` och `geosuiteexport` (de tre första beskrivs i [deprecated-plugins.md](deprecated-plugins.md)).

De verktygen påverkas inte av `hiddenTools` och kan inte tas tillbaka via konfiguration. Att aktivera ett av dem kräver att alla tre ställena kommenteras in igen, plus en ombyggnad av Admin.

---

*Detta dokument beskriver läget i koden per 2026-08-20.*
