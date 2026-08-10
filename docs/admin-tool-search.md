# Verktyg: Sök (search) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/search.jsx` (1660 rader — det största formuläret i Admin), codename `search`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Avviker från mönstret: **ingen Verktygsplacering/Fönsterplacering/Fönsterbredd/Fönsterhöjd** — sökrutan har en fast, inbyggd plats i gränssnittet snarare än att vara ett flyttbart verktygsfönster.

Två helt separata datakällor kan göras sökbara samtidigt: WFS-tjänster (fristående sökdatabaser, listade under "Söktjänster") och vanliga WMS-lager som redan finns i kartan och har sökfält konfigurerade (under "Sök inom WMS-lager", se [admin-wms-layer-form.md](admin-wms-layer-form.md)).

## Generella sökinställningar

- **Infotext i sökfältet** (`searchBarPlaceholder`).
- **Max antal sökträffar per dataset** (`maxResultsPerDataset`) + **Visa info bredvid varje dataset när antalet träffar överstiger värdet** (`showResultsLimitReachedWarning`).
- **Avaktivera autocomplete (visa sökresultat direkt)** (`disableAutocomplete`).
- **Avaktivera automatiska sök-kombinationer** (`disableSearchCombinations`) — sökmotorn slår annars ihop sökord till kombinationer för bättre träffchans, på bekostnad av svarstid.
- **Fördröjning innan auto-sök** (`delayBeforeAutoSearch`, ms).
- **Använd wildcard före sökord för autocomplete** (`autocompleteWildcardAtStart`).
- **Sätt fokus i sökrutan automatiskt när Hajk startar** (`autofocusOnStart`).

## Söktjänster

Ett träd (egen komponent `../tree.jsx`) med alla WFS-lager i katalogen — kryssa i de som ska vara sökbara datasets. Om AD-autentisering är aktiv kan varje valt lager även få en egen **Tillträde**-begränsning (AD-grupper) här, separat från lagrets övriga behörigheter.

## Sök inom WMS-lager

Lista (`renderSources`) över lagren som faktiskt finns i **den valda kartans** lagermeny (inte hela katalogen) — kryssa i vilka som ska vara sökbara. Kräver att respektive lagers egna sökfält (Url, Sökfält, Visningsfält m.m.) redan är ifyllda i WMS-lagerformuläret, annars ger det inga träffar.

- **Tänd motsvarande WMS-lager automatiskt vid klick i resultatlistan** (`showCorrespondingWMSLayers`).

## Spatiala sökverktyg

- **Sök med polygon** / **Sök med radie** / **Sök med yta** / **Sök inom vyn** (`enablePolygonSearch`/`enableRadiusSearch`/`enableSelectSearch`/`enableExtentSearch`) — vilka ritverktyg som är tillgängliga för att avgränsa sökningen geografiskt.
- **Fyllnadsfärg** / **Ramfärg** (`drawFillColor`/`drawStrokeColor`) — utseendet på den ritade sökpolygonen/-radien/-ytan medan användaren ritar den.

## Exportinställningar

**Exkludera följande kolumner vid Excel-export** (`excelColumnFilter`) — kommaseparerad lista med kolumnnamn som utesluts ur exporten.

## Aktiverade och förvalda användarinställningar

Ett återkommande tvåstegsmönster: för varje sökinställning nedan finns dels en kryssruta som styr **om slutanvändaren själv får ändra inställningen** under sin session, dels en andra kryssruta för **förvalt värde** (bara aktiv/ändringsbar om den första är ikryssad). Vilka inställningar som är tillåtna sparas i `enabledSearchOptions`.

| Inställning | Beskrivning | Förvalt-fält |
|---|---|---|
| Sök endast i synliga lager | Begränsa sökningen till lager som är tända i kartan | `searchInVisibleLayers` |
| Använd wildcard före sökord | Matchar även mitt i ord, inte bara från start | `wildcardAtStart` |
| Använd wildcard efter sökord | Matchar delord från början | `wildcardAtEnd` |
| Skiftlägeskänslig sökning | | `matchCase` |
| Kräv att hela objektet ryms inom sökområde | Annars räcker det att objektet delvis överlappar sökområdet (`intersects` vs `within` i `activeSpatialFilter`) | `activeSpatialFilter` |
| Visa etikett för valda resultat i kartan | | `enableLabelOnHighlight` |

## Alternativ för visning av resultat

Dessa är inte per-användare växlingsbara på samma sätt — bara adminsatta av/på:

- **Rita ut alla sökträffar i kartan automatiskt** (`showResultFeaturesInMap`).
- **Tillåt filtering av resultat** / **Tillåt sortering av resultat** (`enableResultsFiltering`/`enableResultsSorting`).
- **Tillåt snabbrensning av markerade sökresultat** (`enableResultsSelectionClearing`).
- **Tillåt nedladdning av sökresultat** (`enableResultsDownloading`).
- **Visa förhandsvisning vid mouse over** (`enableFeaturePreview`).
- **Samla selekterade resultat i en egen kollektion ("Markerade resultat")** (`enableSelectedFeaturesCollection`).
- **Visa föregående/nästa-knapp för bläddring av resultat** (`enableFeatureToggler`).
- **Maximal zoomnivå vid zoomning till sökresultat** (`fitToResultMaxZoom`, -1 = obegränsat).

## Träffikon och markering av resultat i karta

- **URL till ikon för markering av punktsökträffar** (`markerImg`) — tomt ger standardikonen.
- **Ikonförskjutning X/Y** (`anchorX`/`anchorY`) och **Skala för ikon** (`scale`, 0–10).

## Färgteman (tre separata uppsättningar)

Var och en med Fyllnad/Ram (och för markerade/highlightade resultat: även textfärger), valda via `SketchPicker`:

| Läge | Fält |
|---|---|
| **Standardutseende för resultat i kartan** (alla träffar, om "Rita ut alla sökträffar automatiskt" är på) | `displayFillColor`, `displayStrokeColor` |
| **Utseende för markerade resultat** (användarens favoritmarkerade träffar) | `selectionTextFill`, `selectionTextStroke`, `selectionFillColor`, `selectionStrokeColor` |
| **Utseende för det aktiva ("highlightade") resultatet** (den träff användaren just nu tittar på/hovrar) | `highlightTextFill`, `highlightTextStroke`, `highlightFillColor`, `highlightStrokeColor` |

Tillträde (verktyget som helhet, längst ner).

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
