# Verktyg: Genvägar (preset) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/preset.jsx`, codename `preset`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Skiljer sig från de flesta andra verktyg genom att det saknar Fönsterinställningar, Instruktion och "Synlig vid start" helt — koden för dessa finns kvar men är utkommenterad, så verktyget har bara en fast placering.

Administratörsdefinierade genvägar (till skillnad från [Platser](admin-tool-bookmarks.md), som är användarens egna): en namngiven lista av fördefinierade platser som slutanvändaren kan klicka sig till direkt. I praktiken ett administratörsstyrt urval av Platser - en genväg flyttar bara kartan till en plats och rör aldrig tända lager eller bakgrundskarta, precis som Platser gör. Det finns ingen bekräftelsedialog, eftersom det aldrig finns något att varna för.

Genvägen har alltid varit map-specifik (den konfigureras per karta), så det saknas motiv för att en genväg i en och samma karta skulle bära med sig ett annat lagerurval än en annan - därför gjordes detta medvetna val i stället för att göra lagerbytet valbart per genväg.

- Aktiverad, Sorteringsordning — observera att **Sorteringsordning saknar verkan** för det här verktyget: det ritas som en fast kontrollknapp i klientens `App.jsx` och passerar aldrig insticksmotorn som sorterar på `index`. Se [admin-tooloptions.md](admin-tooloptions.md).
- Tillträde
- **Lägg till genväg** — Namn\* och Url\*, läggs till i listan under. Klistra in **hela länken som [Dela](admin-tool-anchor.md)-verktyget skapar** (t.ex. `https://karta.kommun.se/?m=map_1&x=147325.27&y=6398754.17&z=4`) eller bara parameterdelen. Både frågeteckenform (`?...`) och hashform (`#...`, används när kartan har `enableAppStateInHash`) fungerar. Enda parametrarna som läses är `x`/`y`/`z` (kartläge) - finns `l`/`gl` (lagerurval) med i en inklistrad Dela-länk ignoreras de helt, det är inte ett fel. Se [client-url-parameters.md](client-url-parameters.md) för fullständig referens över URL-syntaxen.
- **Lista över aktiva genvägar** — varje rad kan redigeras (pennikon) eller raderas inline.

---

_Detta dokument beskriver läget i koden per 2026-09-21._
