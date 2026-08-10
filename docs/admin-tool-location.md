# Verktyg: Positionera (location) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/location.jsx`, codename `location`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Zoomar/panorerar kartan till användarens geografiska position (t.ex. GPS på mobil).

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start
- **Zoomskala vid positionering** (`zoomScale`, 0–1, steg 0.1) — hur långt kartan zoomar in när användaren aktiverar positionering. `0` = minimalt zoom, `1` = maximalt, `0.5` = standard/mitt emellan. Sparas i kartans konfiguration och styr zoom-animationen vid klick på "Visa min position".

Saknar Instruktion och Tillträde (inte implementerade i det här formuläret).

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
