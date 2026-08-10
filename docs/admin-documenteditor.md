# Dokumenthanteraren (Admin-flik) — fältguide

**Namnkrock att känna till:** det finns **två** olika saker i Admin som heter "Dokumenthanterare":

1. **Den här sidan** — Admins egen toppnivåflik **"Dokumenthanterare"** (`apps/admin/public/config.json`, fliken `documenthandler` → `documenteditor.jsx`, komponenten `DocumentEditor`). Det är **här** dokument/kapitel faktiskt skrivs. Den ligger på samma nivå som Lager/Söktjänster/Redigeringstjänster/Kartor — inte under "Redigera".
2. **Verktyg → Dokumenthanterare** (se [admin-tool-documenthandler.md](admin-tool-documenthandler.md)) — konfigurerar bara klientens meny/beteende för att *visa* dokument (fönsterstorlek, sökning på/av, PDF-bilagor osv.), skriver ingen text.

De två använder dessutom **olika texteditorer**, trots samma Draft.js-grund: den här sidans kapiteltext använder `DocumentTextEditor.jsx`, medan Informationsdialoger (Verktyg, "Multidialog") använder en separat, enklare `RichEditor.jsx` med egna H1–H6-knappar som den här editorn saknar. Blanda inte ihop förväntningarna mellan de två.

## Dokumenthantering

- **Hantera mappar** *(valfritt, styrs av `use_document_folders` i backend-konfigurationen)* — dokument kan sparas direkt i `documents`-roten eller i en (1) nivå undermappar. **Ny mapp** skapar en ny undermapp.
- **Välj ett dokument** — rullista över befintliga dokument i vald mapp.
- **Nytt dokument** — dialog med **Dokumentnamn\*** (endast `A-Z a-z 0-9 _`), ev. **Välj mapp**, och **Välj Karta** (vilken karta dokumentet hör till).
- **Redigera titel** (pennikon bredvid dokumentväljaren) — döper om dokumentets titel.
- **Ta bort** — raderar hela dokumentet, efter bekräftelse. Kan inte ångras.
- **Spara** — skriver dokumentet (alla kapitel) till backend.
- **Innehållsförteckning** — öppnar en dialog med **per dokument**-inställningar för ToC, separat från verktygets globala förval (se [admin-tool-documenthandler.md](admin-tool-documenthandler.md#innehållsförteckning)): **Aktiverad**, **Expanderad**, **Titel**, **Nivåer** (`chapterLevelsToShow`).

## Kapitel

Varje dokument är en trädstruktur av kapitel (och underkapitel, obegränsat djup). Det är **den här** strukturen — inte rubriktaggar i texten — som bygger innehållsförteckningen i Klienten.

- **Lägg till huvudkapitel / Lägg till underkapitel** — dialog med **Rubrik\*** och valfritt **ID** (kapitlets `headerIdentifier`, används av dokumentlänkar och kartlänkar för att peka på exakt det kapitlet).
- **Flytta upp / Flytta ned** — byter plats med grannkapitlet på samma nivå.
- **⋮ (mer)** — öppnar en dialog för att flytta kapitlet till en godtycklig plats i trädet, utan att behöva klicka upp/ned steg för steg.
- **Expandera/fäll ihop** (pil-ikon) — visar eller döljer kapitlets underkapitel och text i redigeringsvyn.
- **Redigera kapitelrubrik och kapitelId** (pennikon) — ändrar rubrik/ID i efterhand.
- **Ta bort** — raderar kapitlet (och dess underkapitel).
- **Nyckelord** — fri tagglista per kapitel (`Chip`-komponenter, en `AddKeyword`-inmatning för att lägga till fler). Används för sökning/filtrering av dokumentinnehåll i Klienten.

## Kapiteltexten (DocumentTextEditor)

Verktygsfältet innehåller, i tur och ordning:

- **Fet / Kursiv / Understruken**.
- **Punktlista / Numrerad lista.**
- **Faktaruta** (`FormatQuoteIcon`) — infogar ett citatblock (`blockquote`) med egna bakgrunds-/kantfärger och stöd för att göra det till en hopfällbar "accordion"-sektion. Det här är den enda block-liknande formateringen utöver listor — se anmärkningen om rubriker nedan.
- **Svävartext** (`TranslateIcon`) — infogar en textsnutt som visar en tooltip vid hovring, istället för en vanlig länk.
- **Bild / Video / Ljud / Iframe** — varje typ öppnar ett litet formulär med URL (autocomplete mot redan uppladdade filer), bredd/höjd (proportionellt låsbara, räknas om automatiskt vid ändring av endera), en förhandsvisning, och för Iframe även en titel (för tillgänglighet). Bild har dessutom valfri popup-inställning.
- **Webblänk / Dokumentlänk / Kartlänk** — tre separata länktyper:
  - *Webblänk* — fri URL.
  - *Dokumentlänk* — väljs ur en lista av befintliga dokument; kan pekas mot ett specifikt kapitel via dess **ID** (`data-header-identifier`).
  - *Kartlänk* — en URL till en specifik kartvy, samma format som [Dela](admin-tool-anchor.md)-verktygets länkar.

  Klickar man i en befintlig länk och öppnar samma knapp igen förifylls fälten med länkens nuvarande värde istället för att se tomma ut (redigering, inte bara nyskapande).

**Inga rubrikknappar (H1–H6).** Det här är medvetet, inte en bugg: rubriknivåer uttrycks av kapitelträdet ovan (som driver innehållsförteckningen), inte av taggar i löptexten. Att klistra in text med rubriker fungerar bäst om rubrikerna görs om till fet text före inklistring — se den fristående [Markdown → HTML-konverteraren](https://claude.ai/code/artifact/028ea774-e684-4af7-9776-682590c93a46) och dess läge "Dokumenthanterare-kompatibelt".

**Inklistring kräver riktig HTML på urklippet**, annars visas taggar/tecken som rå text istället för formatering — se samma anmärkning ovan för bakgrund.

---

*Detta dokument beskriver läget i koden per 2026-07-30. Om `documenteditor.jsx`/`DocumentTextEditor.jsx` ändras bör denna guide uppdateras i samma PR.*
