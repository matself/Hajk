# Verktyg: Platser (bookmarks) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/bookmarks.jsx`, codename `bookmarks`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Formuläret innehåller inga verktygsspecifika fält — bara det gemensamma mönstret i sin helhet:

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde

Platser sparar bara kartans läge (koordinat + zoomnivå) — inte lagerurval eller bakgrund. Det skiljer verktyget från [Mina teman](admin-mapsettings.md#inställningar-för-grupp-med-snabbåtkomst) i Lagerhanteraren, som gör tvärtom (lager, ingen plats).

Platser sparas av användaren lokalt i webbläsarens cache (inte i Hajks backend) och kan exporteras/importeras som fil för att bevaras vid t.ex. webbläsarbyte eller cache-rensning. Det finns inga adminstyrda inställningar för själva platsfunktionen.

---

*Detta dokument beskriver läget i koden per 2026-08-05.*
