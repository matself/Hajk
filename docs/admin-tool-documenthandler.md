# Verktyg: Dokumenthanterare (documenthandler) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/MenuEditor/menuEditor.jsx` + fyra hjälpkomponenter i samma mapp (`treerow.jsx`, `settingspopover.jsx`, `menuconnectionselector.jsx`, `warningModal.jsx`, `custombuttons.jsx`), codename `documenthandler`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret — det här verktyget avviker dock rejält: ingen Verktygsplacering/Fönsterplacering/Synlig vid start/Instruktion/Tillträde på toppnivå, eftersom verktyget bygger upp en egen menystruktur snarare än att vara en enda knapp.

Visar dokument (skrivna i klientens dokumenteditor, se [Redigera → hantera dokument]) och/eller länkar i en egen menyträdstruktur, separat från den vanliga lagermenyn. Det här är verktyget bakom "Multidialog"-liknande innehåll: hjälptexter, nyhetsdokument, produktblad m.m., med möjlighet att länka till andra dokument, kartländer eller externa webbsidor.

## Aktiverad + Redigera meny

- **Aktiverad** — om verktyget finns i kartans `tools`-array.
- **Redigera meny** — öppnar en modal med själva menyträdet (se nedan). Måste sparas separat från formulärets övriga fält (egen Spara-knapp inne i modalen).

## Generella inställningar

- **Fönsterbredd / Fönsterhöjd** (`width`/`height`) — ingen Verktygsplacering eller Fönsterplacering; panelen har fast placering (`target: "hidden"` som standard, öppnas programmatiskt/via menyn).
- **Startdokument** (`documentOnStart`) — dokument som visas automatiskt när kartan öppnas. Tomt = inget.
- **Paneltitel** (`drawerTitle`), **Knapptitel** (`drawerButtonTitle`), **Knappikon** (`drawerButtonIcon`, namn från Material Symbols — länk till ikonbiblioteket finns i formuläret).
- **Sökning aktiverad** (`searchImplemented`) — fritextsökning bland dokumenten.
- **Tillåt att ändra storlek på dokumentfönstret** (`resizingEnabled`) / **Tillåt att flytta på dokumentfönstret** (`draggingEnabled`).
- **Utskrift aktiverad** (`enablePrint`) — om ikryssad visas även **Endast aktiv sida kommer skrivas ut (utan dokumentval)** (`directPrint`).
- **Bilaga 1, 2, ...** (`pdfLinks`) — namngivna PDF-bilagelänkar, rader läggs till/tas bort med +/−.
- **Stäng dokumentfönster vid klick på kartlänk** (`closePanelOnMapLinkOpen`).
- **Visa 'Kartan laddar' dialog vid klick på kartlänk** (`displayLoadingOnMapLinkOpen`).

## Innehållsförteckning

- **Aktiverad** / **Expanderad** (`tableOfContents.active`/`.expanded`).
- **Titel** (`tableOfContents.title`).
- **Antal kapitelnivåer** (`chapterLevelsToShow`) — för visning i panelen.
- **Antal kapitelnivåer för utskrift** (`chapterLevelsToShowForPrint`) — kan skilja sig från skärmvisningen.
- **Välj hur innehållsförteckningen skall skrivas ut** (`printMode`): Hela / Valda / Inga.

## Faktaruta

**Aktiverad** (`textAreacolorpickerEnabled`, lokalt UI-state — sparas indirekt via färgerna nedan) slår på/av två färgväljare för dokumentens "faktaruta" (textarea): **Bakgrundsfärg** och **Kantfärg** (`defaultDocumentColorSettings`). Varning i formuläret: att sätta dessa kan sätta dark/light-mode ur spel för den rutan.

## Redigera meny (modal, drag-och-släpp-träd)

Trädet byggs med `antd`'s `Tree`-komponent och kan dras om fritt (`draggable`, drophantering hanterar både att flytta till en annan gren och att lägga i ett gap mellan noder). **Ny menylänk** lägger till en rad överst; varje rad har:

- **Namn** (`title`) — textfält, sparas när raden avmonteras (byter fokus).
- **Ikon** — visas som en liten Material-ikon till vänster om namnet, sätts via kugghjulet (se Inställningar nedan).
- **Inställningar** (kugghjulsikon, öppnar en popover):
  - **Expanderad submeny vid start** — bara synlig om raden har undermenyer.
  - **Ikon** (`icon.materialUiIconName`) — Material-ikonens namn, länk till ikonbiblioteket i popovern.
  - **Beskrivande text för ikon** (`icon.descriptiveText`) — för skärmläsare/tillgänglighet.
  - **Färg** (`color`) — textfält + färgväljare.
- **Koppling** — tre ömsesidigt uteslutande väljare per rad, en menylänk kan bara vara en av dem åt gången:
  - **Dokument** — väljs ur listan över tillgängliga dokument (`availableDocuments`). Om mappar är aktiverat (`use_document_folders` i backend-konfigurationen) visas även en mappväljare ovanför dokumentlistan.
  - **Kartlänk** (`maplink`) — en fri text/URL som pekar mot en specifik kartvy (samma slags länk som [Dela](admin-tool-anchor.md)-verktyget genererar).
  - **Extern länk** (`link`) — fri URL till en extern webbsida.
- **Papperskorg** — tar bort raden, efter en bekräftelsedialog (`WarningModal`).

Raderna kan nästlas (dra en rad in i en annan) för att skapa undermenyer — se "Expanderad submeny vid start" ovan, som bara är relevant för rader som faktiskt har barn.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
