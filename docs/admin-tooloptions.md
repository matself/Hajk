# Kartinställningar → Verktyg — översikt

Det här är panelen som öppnas via knappen **Verktyg** i [Kartinställningar](admin-mapsettings.md) (`tooloptions.jsx`, komponenten `ToolOptions`). Panelen är bara ett skal: en lista med alla verktyg (plugins) till vänster, och till höger konfigurationsformuläret för det verktyg som är markerat — ett eget React-komponentfil per verktyg under `apps/admin/src/views/tools/`.

## Listan till vänster

- **Ordning** — siffran inom parentes efter varje verktygsnamn är verktygets `index` i kartans `tools`-array (`toolConfig`). Listan sorteras efter detta index, inte alfabetiskt.
- **Kryssrutan/ikonen** framför namnet visar om verktyget överhuvudtaget finns tillagt i den valda kartans konfiguration (fylld ruta = tillagt, tom = inte tillagt). Att klicka på ett verktyg i listan öppnar bara dess formulär för granskning/redigering — det lägger inte automatiskt till verktyget i kartan; det sköts inifrån respektive verktygs eget formulär.
- Att välja ett annat verktyg i listan stänger av det tidigare valda formuläret och monterar det nya på nytt (litet workaround i `onUrlMapConfigChanged` — ser till att formuläret läser om sin data när den bakomliggande kartkonfigurationen bytts).

## Verktyg (codename → visningsnamn → fil)

| Codename | Visningsnamn | Formulärfil |
|---|---|---|
| bookmarks | Bokmärken | `tools/bookmarks.jsx` |
| buffer | Buffra | `tools/buffer.jsx` |
| anchor | Dela | `tools/anchor.jsx` |
| documenthandler | Dokumenthanterare | `tools/MenuEditor/menuEditor.jsx` |
| dummy | Dummy (testplugin) | `tools/dummy.jsx` |
| externalLinks | Externa länkar | `tools/externalLink.jsx` |
| fmeserver | FME-server | `tools/fmeServer.jsx` |
| streetview | Gatuvy | `tools/streetview.jsx` |
| infoclick | Infoklick | `tools/infoclick.jsx` |
| infodialog | Informationsdialoger | `tools/infodialog.jsx` |
| layercomparer | Lagerjämförare | `tools/layercomparer.jsx` |
| measurer | Mät | `tools/measurer.jsx` |
| routing | Navigation | `tools/routing.jsx` |
| information | Om kartan | `tools/information.jsx` |
| osmsearch | OSM-sökning | `tools/osmsearch.jsx` |
| location | Positionera | `tools/location.jsx` |
| edit | Redigera | `tools/edit.jsx` |
| sketch | Rita | `tools/sketch.jsx` |
| preset | Snabbval | `tools/preset.jsx` |
| search | Sök | `tools/search.jsx` |
| timeslider | Tidslinje | `tools/timeslider.jsx` |
| collector | Tyck till | `tools/collector.jsx` |
| mailform | Tyck till (e-post) | `tools/mailform.jsx` |
| print | Utskrift | `tools/print.jsx` |
| coordinates | Visa koordinat | `tools/coordinates.jsx` |

**Inte längre valbara i Admin** (koden finns kvar i repot men importen är utkommenterad i `tooloptions.jsx`): `draw` (ersatt av `sketch`), `measure` (ersatt av `measurer`), `export` (ersatt av `print`), `informative` (ersatt av `documenthandler`), `geosuiteexport`. De tre första är formellt dokumenterade i [deprecated-plugins.md](deprecated-plugins.md) — `export`/`geosuiteexport` är avstängda men inte upptagna där.

## Gemensamt mönster i alla verktygsformulär

Varje verktygs formulär är en fristående komponent (kopierad från en gemensam mall, `tools/tool.jsx`, som inte längre importeras men visar ursprunget), och de flesta delar samma återkommande kontroller. De enskilda verktygsguiderna beskriver bara vad som är specifikt för respektive verktyg utöver dessa — förekomst av varje fält varierar dock något mellan verktyg, så avvikelser noteras per verktyg.

**Alltid förekommande:**

- **Spara** — skriver hela kartans `toolConfig` till backend, inte bara det här verktyget.
- **Aktiverad** — om verktyget överhuvudtaget ska finnas i kartans `tools`-array. Avmarkerad och sparad tar bort verktyget helt från kartan (efter bekräftelse om det redan fanns konfigurerat) — inte bara dölja det.
- **Sorteringsordning** — verktygets `index`, samma tal som visas inom parentes i listan till vänster. Avgör ordningen verktygen visas i (t.ex. i sidopanelen), inte bara i listan här.

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
- [Bokmärken (bookmarks)](admin-tool-bookmarks.md)
- [Tyck till e-post (mailform)](admin-tool-mailform.md)
- [Snabbval (preset)](admin-tool-preset.md)
- [Visa koordinat (coordinates)](admin-tool-coordinates.md)
- [Lagerjämförare (layercomparer)](admin-tool-layercomparer.md)
- [OSM-sökning (osmsearch)](admin-tool-osmsearch.md)
- [Infoklick (infoclick)](admin-tool-infoclick.md)
- [Informationsdialoger (infodialog)](admin-tool-infodialog.md)
- [Utskrift (print)](admin-tool-print.md)
- [Dokumenthanterare (documenthandler)](admin-tool-documenthandler.md)
- [Sök (search)](admin-tool-search.md)

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om `tooloptions.jsx` ändras (nytt verktyg tillagt/borttaget) bör tabellen ovan uppdateras.*
