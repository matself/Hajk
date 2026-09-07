# Verktyg: Genvägar (preset) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/preset.jsx`, codename `preset`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Skiljer sig från de flesta andra verktyg genom att det saknar Fönsterinställningar, Instruktion och "Synlig vid start" helt — koden för dessa finns kvar men är utkommenterad, så verktyget har bara en fast placering.

Administratörsdefinierade genvägar (till skillnad från [Platser](admin-tool-bookmarks.md), som är användarens egna): en namngiven lista av fördefinierade kartlänkar (samma format som en delad länk från [Dela](admin-tool-anchor.md)-verktyget) som slutanvändaren kan klicka sig till direkt. Till skillnad från Platser bär länkarna med sig både plats och lagerurval i en och samma URL, precis som Platser gjorde innan det verktyget renodlades till att bara spara plats.

- Aktiverad, Sorteringsordning — observera att **Sorteringsordning saknar verkan** för det här verktyget: det ritas som en fast kontrollknapp i klientens `App.jsx` och passerar aldrig insticksmotorn som sorterar på `index`. Se [admin-tooloptions.md](admin-tooloptions.md).
- **Tillämpa genvägens lagerval** (`applyLayers`, standard: på) — när detta är på ändras kartans tända lager efter `l=`-parametern i genvägens URL, precis som tidigare, och en varningsruta (_"Alla tända lager i kartan, inklusive bakgrundskartan, kommer nu att släckas…"_) visas innan bytet sker. Stäng av kryssrutan för att göra Genvägar till ett rent "flytta kartan till en plats"-verktyg: `l=` i URL:en ignoreras, inga lager eller bakgrundskartor rörs, och ingen varningsruta visas eftersom inget släcks. Använd det läget när genvägarna bara ska vara ett snabbt sätt att navigera till platser.
- Tillträde
- **Lägg till genväg** — Namn\* och Url\* (t.ex. `?m=map_1&x=147325.27&y=6398754.17&z=4&l=10`), läggs till i listan under. Se [client-url-parameters.md](client-url-parameters.md) för fullständig referens över URL-syntaxen, inklusive vilka parametrar som är obligatoriska för just genvägar.
- **Lista över aktiva genvägar** — varje rad kan redigeras (pennikon) eller raderas inline.

---

_Detta dokument beskriver läget i koden per 2026-09-07._
