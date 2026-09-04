# Verktyg: Om kartan (information) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/information.jsx`, codename `information`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Visar en enkel informationsruta med en stängningsknapp, öppningsbar via en informationsikon bland kartkontrollerna. Till skillnad från de flesta verktyg saknar detta helt Fönsterinställningar (target/position/bredd/höjd) — det är alltid en fast dialogruta, ingen drawer/widget.

- Aktiverad, Sorteringsordning — observera att **Sorteringsordning saknar verkan** för det här verktyget: det ritas som en fast kontrollknapp i klientens `App.jsx` och passerar aldrig insticksmotorn som sorterar på `index`. Se [admin-tooloptions.md](admin-tooloptions.md).
- **Visa vid start endast en gång** — om ikryssad visas rutan automatiskt bara vid användarens första besök (styr `showInfoOnce`), annars visas den vid varje sidladdning om "Synlig vid start" (nedan) är satt.
- **Synlig vid start** *(motsvarar `visibleAtStart` i konfigurationen — finns inte som synligt fält i formuläret, se anmärkning nedan)*
- **Text vid mouse-over på informations-knappen** — tooltip på ikonen (`title`).
- **Rubrik i inforutan** (`headerText`).
- **Text i inforutan** (`text`) — fri text/HTML.
- **Text i inforutans stängningsknapp** (`buttonText`).
- **Tillträde** — kommaseparerad lista AD-grupper (bara synligt när AD-autentisering är aktiverad).

**OBS:** `visibleAtStart` läses in och sparas (`save()`), men det finns ingen motsvarande kryssruta i `render()` — fältet går alltså bara att sätta genom att redigera kartans JSON direkt, inte via det här formuläret.

---

*Detta dokument beskriver läget i koden per 2026-08-24.*
