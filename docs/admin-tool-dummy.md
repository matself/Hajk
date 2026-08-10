# Verktyg: Dummy (testplugin) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/dummy.jsx`, codename `dummy`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Det här är ett testverktyg utan egen funktionalitet i Klienten — används för att testa själva plugin-infrastrukturen. Formuläret är rent gemensamt mönster:

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start
- Tillträde (bara när AD-autentisering är aktiverad)

**OBS — dolt fält:** state har en `templateJsonFilePath`-egenskap som varken visas i formuläret eller sparas i `save()` — helt oanvänd kvarleva.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
