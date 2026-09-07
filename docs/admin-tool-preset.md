# Verktyg: Genvägar (preset) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/preset.jsx`, codename `preset`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Skiljer sig från de flesta andra verktyg genom att det saknar Fönsterinställningar, Instruktion och "Synlig vid start" helt — koden för dessa finns kvar men är utkommenterad, så verktyget har bara en fast placering.

Administratörsdefinierade genvägar (till skillnad från [Platser](admin-tool-bookmarks.md), som är användarens egna): en namngiven lista av fördefinierade kartlänkar (samma format som en delad länk från [Dela](admin-tool-anchor.md)-verktyget) som slutanvändaren kan klicka sig till direkt. Till skillnad från Platser bär länkarna med sig både plats och lagerurval i en och samma URL, precis som Platser gjorde innan det verktyget renodlades till att bara spara plats.

- Aktiverad, Sorteringsordning — observera att **Sorteringsordning saknar verkan** för det här verktyget: det ritas som en fast kontrollknapp i klientens `App.jsx` och passerar aldrig insticksmotorn som sorterar på `index`. Se [admin-tooloptions.md](admin-tooloptions.md).
- Tillträde
- **Lägg till genväg** — Namn\* och Url\*, läggs till i listan under. Klistra in **hela länken som [Dela](admin-tool-anchor.md)-verktyget skapar**, t.ex. `https://karta.kommun.se/?m=map_1&x=147325.27&y=6398754.17&z=4&l=abc123,def456`. Både frågeteckenform (`?...`) och hashform (`#...`, används när kartan har `enableAppStateInHash`) fungerar, liksom bara parameterdelen på egen hand. Parametrar som verktyget läser: `x`/`y`/`z` (kartläge), `l` (lager som tänds, angivet som lager-id:n separerade med komma — **inte** löpnummer som `10`, vilket är en gammal format som inte längre stämmer) och `gl` (vilka dellager som visas i grupplager, tas med automatiskt av Dela när ett grupplager är delvis ikryssat). Klickar användaren på en genväg med `l`/`gl` visas en dialogruta som varnar att kartans nuvarande lagerbild byts ut. Se [client-url-parameters.md](client-url-parameters.md) för fullständig referens över URL-syntaxen.
- **Lista över aktiva genvägar** — varje rad kan redigeras (pennikon) eller raderas inline.

---

_Detta dokument beskriver läget i koden per 2026-09-07._
