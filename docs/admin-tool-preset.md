# Verktyg: Snabbval (preset) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/preset.jsx`, codename `preset`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Skiljer sig från de flesta andra verktyg genom att det saknar Fönsterinställningar, Instruktion och "Synlig vid start" helt — koden för dessa finns kvar men är utkommenterad, så verktyget har bara en fast placering.

Administratörsdefinierade genvägar (till skillnad från [Bokmärken](admin-tool-bookmarks.md), som är användarens egna): en namngiven lista av fördefinierade kartlänkar (samma format som en delad länk från [Dela](admin-tool-anchor.md)-verktyget) som slutanvändaren kan klicka sig till direkt.

- Aktiverad, Sorteringsordning
- Tillträde
- **Lägg till snabbval** — Namn\* och Url\* (t.ex. `?m=map_1&x=147325.27&y=6398754.17&z=4&l=10`), läggs till i listan under.
- **Lista över aktiva snabbval** — varje rad kan redigeras (pennikon) eller raderas inline.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
