# Verktyg: Positionera (location) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/location.jsx`, codename `location`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Zoomar/panorerar kartan till användarens geografiska position (t.ex. GPS på mobil).

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start
- **Zoomskala vid positionering** (`zoomScale`, 0–1, steg 0.1) — hur långt kartan zoomar in när användaren aktiverar positionering. `0` = minimalt zoom, `1` = maximalt, `0.5` = standard/mitt emellan. Sparas i kartans konfiguration och styr zoom-animationen vid klick på "Visa min position".

Saknar Instruktion (inte implementerat i det här formuläret). **Tillträde** finns dock (kommaseparerad lista av AD-grupper, synligt bara när AD-autentisering är aktiverad) — till skillnad från vad en tidigare version av det här dokumentet påstod.

**OBS — dött fält:** kryssrutan **Visa "Följ min position" när positionering används som en widget** (`showFollowLocation`) läses in och sparas (`save()`), men Klientens `Location`-plugin läser aldrig `options.showFollowLocation` — kryssrutan går alltså att klicka i utan att något i Klienten förändras.

---

*Detta dokument beskriver läget i koden per 2026-08-13.*
