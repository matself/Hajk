# Kartinställningar → Inställningar — fältguide

Det här är panelen som öppnas via knappen **Inställningar** i [Kartinställningar](admin-mapsettings.md) (`mapoptions.jsx`, komponenten `MapOptions`). Den styr grundläggande OpenLayers-vynivåer, kartinteraktioner, sidopanelen och kartans färgtema för den valda kartan. Fälten motsvarar `render()`.

**Titel**
Kartans titel. Om tomt används filnamnet.

## Grundinställningar för kartvisning

Dessa motsvarar direkt OpenLayers `View`-parametrar.

| Fält | OL-parameter | Beskrivning |
|---|---|---|
| Projektion | `projection` | T.ex. `EPSG:3006`. |
| Startzoom | `zoom` | Zoomnivå vid start. |
| Max-zoomnivå | `maxZoom` | Högsta tillåtna zoomnivå. |
| Min-zoomnivå | `minZoom` | Lägsta tillåtna zoomnivå. |
| Centrumkoordinat | `center` | T.ex. `110600,6283796`. |
| Upplösningar | `resolutions` | Kommaseparerad lista, avgör de diskreta zoomnivåerna. Det är index i den här listan som `minZoom`/`maxZoom` i lagerformulären syftar på. |
| Upplösningar (Extra för utskrift) | — | Extra upplösningar som läggs till de ordinarie vid utskrift, för högre kvalitet i PDF än på skärm. |
| Extent | `extent` | Kartans begränsningsyta, `minX,minY,maxX,maxY`. |
| Origin | `origin` | Ursprungspunkt för tile-rutnätet. |

**Lätta på extent** (`constrainOnlyCenter`) — om ikryssad begränsas bara centrumkoordinaten till Extent, inte hela synfältet (användaren kan panorera så att kanten av kartan syns utanför extent).

**Lås zoom till satta upplösningar** — två separata kryssrutor för dator respektive mobil (`constrainResolution` / `constrainResolutionMobile`): om ikryssad går det bara att zooma mellan de exakta nivåerna i Upplösningar, inte fritt (t.ex. med scroll-zoom eller pinch).

**Tillåt nedladdning av WMS-lager** (`enableDownloadLink`) — visar en nedladdningsknapp bredvid varje lager i lagerhanteraren.

**Beta: aktivera liveuppdatering av hashparametrar i URL-fältet** (`enableAppStateInHash`) — håller kartans tillstånd ständigt uppdaterat i URL:ens `#`-parametrar. Se [issue #1252](https://github.com/hajkmap/Hajk/issues/1252) och [client-url-parameters.md](client-url-parameters.md) för vad som ingår i URL:en.

**Beta: varna om osparade ritningar/mätningar vid stängning** (`confirmOnWindowClose`) — visar en bekräftelseruta om det finns osparade ändringar (t.ex. pågående ritning) när fönstret ska stängas. Se [issue #1403](https://github.com/hajkmap/Hajk/issues/1403).

## Kartinteraktioner

Styr OpenLayers standardinteraktioner direkt, se [OpenLayers-dokumentationen](https://openlayers.org/en/latest/apidoc/module-ol_interaction.html#.defaults) för fullständiga detaljer per inställning:

| Fält | OL-interaktion |
|---|---|
| Whether Alt-Shift-drag rotate is desired | `altShiftDragRotate` |
| Interact only when the map has the focus | `onFocusOnly` — påverkar MouseWheelZoom/DragPan, praktiskt om sidan i övrigt ska kunna scrollas normalt när kartan inte har fokus |
| Whether double click zoom is desired | `doubleClickZoom` |
| Whether keyboard interaction is desired | `keyboard` |
| Whether mousewheel zoom is desired | `mouseWheelZoom` |
| Whether Shift-drag zoom is desired | `shiftDragZoom` |
| Whether drag pan is desired | `dragPan` |
| Whether pinch rotate is desired | `pinchRotate` |
| Whether pinch zoom is desired | `pinchZoom` |
| Zoom level delta when using keyboard or double click zoom | `zoomDelta` |
| Duration of the zoom animation in milliseconds | `zoomDuration` |

## Extra inställningar

- **Logo för ljust tema / Logo för mörkt tema** — sökväg till logotyp (relativ Hajk-root eller absolut URL), en per färgtema.
- **Alternativtext för logotyp** — `alt`-text för skärmläsare.
- **Legend options** — GeoServer `LEGEND_OPTIONS`-sträng, se [GeoServers dokumentation](http://docs.geoserver.org/stable/en/user/services/wms/get_legend_graphic/index.html#controlling-legend-appearance-with-legend-options).
- **Visa cookies-meddelande / Visa knapp för cookies-meddelande / Visa alternativ för 3:e part cookies** — styr om och hur ett cookie-meddelande visas för nya besökare.
- **Cookies-meddelande / Cookies-länk** — texten i cookie-meddelandet, och en valfri länk som öppnas via knappen "Mer information". Inaktiva om "Visa cookies-meddelande" inte är ikryssad.
- **Cross origin-parameter** — värdet för `crossOrigin` på bildförfrågningar (`anonymous` om osäker).

## Extra kontroller i kartan

| Fält | Beskrivning |
|---|---|
| Visa kartväljare | Väljare för att byta mellan flera tillgängliga kartor (bara om det finns fler än en). Undermeny styr om den visas som knapp eller som rullista i sidhuvudet (endast desktop). |
| Visa knapp för att rensa kartan | Knapp som nollställer allt användaren ritat/lagt till. |
| Visa en hemknapp som återställer kartans innehåll till startläge | Återställer zoom och centrumkoordinat till administratörens konfigurerade standardvärden ovan — oavsett hur kartan öppnades (t.ex. via en länk med `x`/`y`/`z`, se [client-url-parameters.md](client-url-parameters.md)). Återställer **inte** vilka lager som är synliga. |
| Visa knapp för att byta mellan ljust och mörkt tema | — |
| Visa en knapp med användarens initialer intill zoomknapparna | Kräver att AD-koppling är aktiv. |
| Visa en snabbväljare med de senast använda verktygen | En liten kontroll som vid hover/touch visar senast använda verktyg — särskilt användbar i mobilläge. |

## Introduktionsguide

- **Starta introduktionsguiden automatiskt första gången användaren besöker kartan** (`introductionEnabled`).
- **Visa en knapp i kartan som låter användaren starta guiden manuellt** (kräver att guiden är aktiverad).
- **Steg som visas i introduktionsguiden** — JSON-array enligt [intro.js-react's Step-format](https://github.com/HiDeoo/intro.js-react#step). Tomt (`[]`) highlightar ett antal standardobjekt (sidopanel, sökruta osv).

## Inställningar för sidopanel

Styr den huvudsakliga sidopanelen (drawer) där verktyg med `target: "toolbar"` visas — se `Verktygsplacering` i respektive verktygs [egna dokumentation](admin-mapsettings.md).

| Fält | Beskrivning |
|---|---|
| Låt sidopanelen vara permanent synlig och låst | Om aktiv nollställs "Starta med sidopanelen synlig" och "...låst vid start" (ömsesidigt uteslutande). |
| Starta med sidopanelen synlig | Inaktiv om ovanstående är ikryssad. |
| Starta med sidopanelen synlig i mobilläge | Separat inställning för mobil. |
| Låt sidopanelen vara låst vid start | Kräver att "Starta med sidopanelen synlig" är ikryssad, och att panelen inte är permanent. |
| Aktiv drawer innehåll | Vilket verktyg (av flera som delar drawer-utrymmet) som ska vara aktivt vid start. |
| Titel sidopanel | Rubrik högst upp i panelen. |
| Titel aktiveringsknapp | Text på knappen som öppnar panelen. |
| Ikon aktiveringsknapp | Karta eller hamburgermeny. |

## Färginställningar för kartan

- **Ljus/mörkt färgtema** — `user` (följer användarens systeminställning, standard), `light` eller `dark` för att tvinga ett läge.
- **Huvudfärg / Komplementfärg** — färgväljare (`SketchPicker`) för kartans primär- och sekundärfärg, används genomgående i gränssnittets teman.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om `mapoptions.jsx` ändras bör denna guide uppdateras i samma PR.*
