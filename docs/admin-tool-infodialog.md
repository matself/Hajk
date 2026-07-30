# Verktyg: Informationsdialoger (infodialog) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/infodialog.jsx`, codename `infodialog`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Till skillnad från övriga verktyg hanterar det här formuläret **flera fristående dialogrutor** i en och samma kartkonfiguration — t.ex. hjälptexter, nyheter eller separata popup-knappar på olika ställen i gränssnittet.

Formulärets `options` är alltså en **array** av dialogobjekt, inte ett enda `options`-objekt som de flesta andra verktyg.

- Aktiverad, Sorteringsordning (gäller verktyget som helhet, inte enskilda dialoger)
- **Lägg till dialog** — skapar en ny, tom dialog och väljer den i listan till vänster.
- Vänsterlistan visar alla dialoger (efter Titel/Namn); klick väljer vilken som redigeras till höger.

Validering vid Spara: minst en dialog måste finnas om verktyget är aktiverat, varje dialog måste ha ett namn, och namnen måste vara unika — annars visas felmeddelanden istället för att spara.

## Per dialog: Identitet

- **Namn** (`name`) — unikt, används internt för att avgöra om dialogen redan visats för användaren (se "Visa bara automatiskt en gång" nedan).
- **Titel** (`title`) — visas på knappen som öppnar dialogen.
- **Beskrivning** (`description`) — verktygstips.

## Placering

- **Knappens placering** (`target`) — `Vänster meny`/`Höger meny`/`Kartkontroll`/`Dold` (visas bara automatiskt eller programmatiskt, ingen egen knapp).
- **Ikon** (`icon`) — namnet på en Material-UI-ikon, t.ex. `helpcenter`.

## Innehåll

- **Rubrik i dialogrutan** (`headerText`).
- **Text** — huvudinnehållet. Nya dialoger använder en rich text/HTML-editor (`RichEditor`-komponenten, `useLegacyNonMarkdownRenderer: true`). Dialoger som redan sparats som Markdown (t.ex. handredigerad JSON från innan den här editorn fanns) visas istället som rå Markdown-källkod i ett textfält, med en egen kryssruta **Tillåt HTML-taggar inuti Markdown-texten** (`allowDangerousHtml`) — för att undvika att av misstag omtolka befintlig Markdown-syntax och förstöra formateringen.

## Knappar

- **Text i stängknappen** (`buttonText`).
- **Stängknappens utseende** (`primaryButtonVariant`) — Standard (text) / Konturerad / Fylld.
- **Text i avbryt-knappen** (`abortText`) — valfri; tom text döljer knappen helt (dialogen har då bara en stängknapp, ingen "avbryt").

## Synlighet

- **Visa automatiskt när kartan öppnas** (`visibleAtStart`).
- **Visa bara automatiskt en gång per användare** (`showOnlyOnce`) — kombineras med Namn för att avgöra om användaren redan sett dialogen.
- **Senast ändrad** (`lastModified`) — en fri tidsstämpel (knapp "Uppdatera till nu" sätter aktuell tid). Om den ändras visas dialogen igen automatiskt för alla användare, oavsett `showOnlyOnce`/tidigare visningshistorik — praktiskt för att tvinga fram en redan visad nyhets-/hjälpdialog på nytt efter en innehållsuppdatering.
- Tillträde (per dialog, inte globalt för verktyget).

Varje dialog kan tas bort individuellt via "Ta bort dialog"-knappen längst ner i redigeringsvyn.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
