# Verktyg: Bokmärken (bookmarks) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/bookmarks.jsx`, codename `bookmarks`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Formuläret innehåller inga verktygsspecifika fält — bara det gemensamma mönstret i sin helhet:

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde

Bokmärken sparas av användaren lokalt i webbläsarens cache (inte i Hajks backend) och kan exporteras/importeras som fil för att bevaras vid t.ex. webbläsarbyte eller cache-rensning. Det finns inga adminstyrda inställningar för själva bokmärkesfunktionen.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
