# Verktyg: Rita (sketch) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/sketch.jsx`, codename `sketch`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret (Aktiverad, Sorteringsordning, Fönsterinställningar, Spara).

Det här verktyget har inga egna, verktygsspecifika inställningar utöver de gemensamma — hela formuläret består av:

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Synlig vid start** — om ritverktygets fönster är öppet när kartan laddas.
- **Instruktion** — tooltip-text vid mouseover på verktygsknappen.
- **Tillträde** — kommaseparerad lista AD-grupper (bara synligt när AD-autentisering är aktiverad i Admin).

Själva ritfunktionaliteten (vilka geometriverktyg, färger, textstilar som är tillgängliga för slutanvändaren) styrs inte här — det är hårdkodat i klientens Rita-plugin, inte konfigurerbart per karta.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
