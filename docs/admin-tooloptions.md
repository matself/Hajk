# Kartinställningar → Verktyg — översikt

Det här är panelen som öppnas via knappen **Verktyg** i [Kartinställningar](admin-mapsettings.md) (`tooloptions.jsx`, komponenten `ToolOptions`). Panelen är bara ett skal: en lista med alla verktyg (plugins) till vänster, och till höger konfigurationsformuläret för det verktyg som är markerat — ett eget React-komponentfil per verktyg under `apps/admin/src/views/tools/`.

## Listan till vänster

- **Ordning** — siffran inom parentes efter varje verktygsnamn är verktygets `index` i kartans `tools`-array (`toolConfig`). Listan sorteras efter detta index, inte alfabetiskt.
- **Kryssrutan/ikonen** framför namnet visar om verktyget överhuvudtaget finns tillagt i den valda kartans konfiguration (fylld ruta = tillagt, tom = inte tillagt). Att klicka på ett verktyg i listan öppnar bara dess formulär för granskning/redigering — det lägger inte automatiskt till verktyget i kartan; det sköts inifrån respektive verktygs eget formulär.
- Att välja ett annat verktyg i listan stänger av det tidigare valda formuläret och monterar det nya på nytt (litet workaround i `onUrlMapConfigChanged` — ser till att formuläret läser om sin data när den bakomliggande kartkonfigurationen bytts).

## Verktyg (codename → visningsnamn → fil)

| Codename | Visningsnamn | Formulärfil | Dold |
|---|---|---|---|
| bookmarks | Platser | `tools/bookmarks.jsx` |  |
| buffer | Buffra | `tools/buffer.jsx` | ja |
| anchor | Dela | `tools/anchor.jsx` |  |
| documenthandler | Dokumenthanterare | `tools/MenuEditor/menuEditor.jsx` |  |
| dummy | Dummy (testplugin) | `tools/dummy.jsx` | ja |
| externalLinks | [Externa kartlänkar](admin-tool-externallinks.md) | `tools/externalLink.jsx` |  |
| fmeserver | FME-server | `tools/fmeServer.jsx` | ja |
| streetview | Google Street View | `tools/streetview.jsx` |  |
| infoclick | Infoklick | `tools/infoclick.jsx` |  |
| infodialog | Informationsdialoger | `tools/infodialog.jsx` |  |
| layercomparer | Lagerjämförare | `tools/layercomparer.jsx` |  |
| mapillary | Mapillary gatuvy | `tools/mapillary.jsx` |  |
| measurer | Mät | `tools/measurer.jsx` |  |
| routing | Navigation | `tools/routing.jsx` |  |
| information | Om kartan | `tools/information.jsx` |  |
| osmsearch | OSM-sökning | `tools/osmsearch.jsx` |  |
| location | Positionera | `tools/location.jsx` |  |
| edit | Redigera | `tools/edit.jsx` | ja |
| sketch | Rita | `tools/sketch.jsx` | ja |
| preset | Genvägar | `tools/preset.jsx` |  |
| search | Sök | `tools/search.jsx` |  |
| timeslider | Tidslinje | `tools/timeslider.jsx` | ja |
| collector | Tyck till | `tools/collector.jsx` | ja |
| mailform | Tyck till (e-post) | `tools/mailform.jsx` |  |
| print | Utskrift | `tools/print.jsx` |  |
| coordinates | Visa koordinat | `tools/coordinates.jsx` |  |

**Inte längre valbara i Admin** (koden finns kvar i repot men importen är utkommenterad i `tooloptions.jsx`): `draw` (ersatt av `sketch`), `measure` (ersatt av `measurer`), `export` (ersatt av `print`), `informative` (ersatt av `documenthandler`), `geosuiteexport`. De tre första är formellt dokumenterade i [deprecated-plugins.md](deprecated-plugins.md) — `export`/`geosuiteexport` är avstängda men inte upptagna där.

**Utanför verktygslistan:** korta meddelanden som visas när kartan laddas hanteras inte som ett verktyg alls, utan i klientens `appConfig.json`. Se [Meddelanden vid kartstart (announcements)](admin-announcements.md).

**Dolda i den här utgåvan** (kolumnen *Dold* ovan): sju verktyg filtreras bort ur listan via `hiddenTools` i `apps/admin/public/config.json`. Till skillnad från de utkommenterade ovan ligger de kvar i koden och tas tillbaka med en konfigurationsändring, utan ombyggnad. Se [Dölja verktyg i Admin](admin-hidden-tools.md).

## Gemensamt mönster i alla verktygsformulär

Varje verktygs formulär är en fristående komponent (kopierad från en gemensam mall, `tools/tool.jsx`, som inte längre importeras men visar ursprunget), och de flesta delar samma återkommande kontroller. De enskilda verktygsguiderna beskriver bara vad som är specifikt för respektive verktyg utöver dessa — förekomst av varje fält varierar dock något mellan verktyg, så avvikelser noteras per verktyg.

**Alltid förekommande:**

- **Spara** — skriver hela kartans `toolConfig` till backend, inte bara det här verktyget.
- **Aktiverad** — om verktyget överhuvudtaget ska finnas i kartans `tools`-array. Avmarkerad och sparad tar bort verktyget helt från kartan (efter bekräftelse om det redan fanns konfigurerat) — inte bara dölja det.
- **Sorteringsordning** — verktygets `index`, samma tal som visas inom parentes i listan till vänster. Avgör ordningen verktygen visas i, inte bara i listan här. Talet är globalt men verkar per behållare: klienten sorterar *alla* verktyg i en enda lista efter `index` och monterar dem i den ordningen, varefter varje verktyg lägger sin knapp i sin egen behållare (Drawer, widgetkolumn eller kontrollknappar). Bara den inbördes ordningen inom samma behållare blir därför synlig — absoluta värden spelar ingen roll, och två verktyg i olika behållare kan ha samma tal utan att det märks. Undvik däremot samma tal för två verktyg i *samma* behållare: sorteringen faller då tillbaka på den ordning insticken råkade laddas i, som varken är stabil eller inställbar. Ett praktiskt knep är att ge varje behållare ett eget nummerintervall.

  Tre undantag där fältet inte gör någonting alls: `preset` (Genvägar), `externalLinks` (Externa kartlänkar) och `information` (Om kartan) ritas som fasta kontrollknappar direkt i klientens `App.jsx` och passerar aldrig insticksmotorn. De var tidigare plugins och behöll sin konfiguration när de gjordes om till inbyggda kontroller (se kommentaren i `App.jsx`), så `index` läses och sparas men påverkar ingenting. Notera också att de knappar som öppnar Drawer (Kartlager, Kartverktyg) sorteras efter en helt egen `order`-egenskap i `DrawerToggleButtons.jsx` som inte har med verktygens `index` att göra.

  Även för verktyg där `index` fungerar är räckvidden begränsad i kontrollknappskolumnen: insticksknapparna hamnar allihop i en och samma behållare (`#plugin-control-buttons`) på en fast plats mitt i kolumnen, med inbyggda kontroller både ovanför och nedanför. Du kan alltså ordna insticksknapparna sinsemellan, men inte flytta dem förbi de fasta knapparna.

**Fönsterinställningar (mycket vanligt, men inte universellt):**

- **Verktygsplacering** — `toolbar` = Drawer Plugin, `left`/`right` = Widget Plugin, `control` = Control button.
- **Fönsterplacering** — `left` eller `right`, för Widget Plugin.
- **Fönsterbredd** — pixlar, tomt = standardbredd.
- **Fönsterhöjd** — pixlar, `dynamic` eller `auto`.

**Övriga inställningar (varierar mest mellan verktyg):**

- **Synlig vid start** — om verktygets fönster är öppet när kartan laddas.
- **Instruktion** — visas som tooltip vid mouseover på verktygsknappen. Lagras base64-kodad (`btoa`/`atob`). Finns inte i alla verktyg.
- **Tillträde** — kommaseparerad lista AD-grupper som får se verktyget. Bara synligt i Admin när AD-autentisering är aktiverad, och bara implementerat i vissa verktyg.

## Detaljerade fältguider

Respektive verktygs egna fält dokumenteras i separata dokument när de skrivs, i den takt de efterfrågas (de här formulären är stora — `search.jsx` är 1660 rader, `fmeServer.jsx` 1282, `geosuiteExport.jsx` 1045, `print.jsx` 991 — att göra alla ~25 på en gång ger sämre kvalitet än att ta dem i klump).

Färdiga hittills:

- [Rita (sketch)](admin-tool-sketch.md)
- [Mät (measurer)](admin-tool-measurer.md)
- [Dummy (testplugin)](admin-tool-dummy.md)
- [Om kartan (information)](admin-tool-information.md)
- [Dela (anchor)](admin-tool-anchor.md)
- [Positionera (location)](admin-tool-location.md)
- [Platser (bookmarks)](admin-tool-bookmarks.md)
- [Tyck till e-post (mailform)](admin-tool-mailform.md)
- [Genvägar (preset)](admin-tool-preset.md)
- [Visa koordinat (coordinates)](admin-tool-coordinates.md)
- [Lagerjämförare (layercomparer)](admin-tool-layercomparer.md)
- [OSM-sökning (osmsearch)](admin-tool-osmsearch.md)
- [Infoklick (infoclick)](admin-tool-infoclick.md)
- [Informationsdialoger (infodialog)](admin-tool-infodialog.md)
- [Utskrift (print)](admin-tool-print.md)
- [Dokumenthanterare (documenthandler)](admin-tool-documenthandler.md)
- [Sök (search)](admin-tool-search.md)
- [Google Street View (streetview)](admin-tool-streetview.md)
- [Mapillary gatuvy (mapillary)](admin-tool-mapillary.md)
- [Externa kartlänkar (externalLinks)](admin-tool-externallinks.md)

---

*Detta dokument beskriver läget i koden per 2026-08-24. Om `tooloptions.jsx` ändras (nytt verktyg tillagt/borttaget) bör tabellen ovan uppdateras.*
