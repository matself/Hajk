# Verktyg: Tyck till (e-post) (mailform) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/mailform.jsx`, codename `mailform`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret.

Ett enkelt "tyck till"-formulär utan backend-tjänst: verktyget öppnar användarens egen e-postklient med ett förifyllt meddelande (inklusive en länk till aktuell kartvy) riktat till en konfigurerad mottagaradress. Ingen infrastruktur (mailserver, tabell) krävs i Hajk.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- **Rubrik** (`title`) — visas överst i verktygets fönster.
- **Beskrivning** (`description`) — visas i widget-knappen om Verktygsplacering är `left`/`right`.
- Synlig vid start
- **Mottagarens e-postadress** (`recipientEmail`) — obligatorisk; sparning avbryts med ett felmeddelande om den saknas.
- **Ämnesrad** (`subject`) — förifylld ämnesrad i det genererade mailet.
- **Instruktionstext** (`instructions`) — valfri hjälptext ovanför formuläret i verktyget.
- Tillträde

Saknar det generella "Instruktion"-fältet (tooltip på verktygsknappen) — här heter det egna, synliga formulärfältet istället "Instruktionstext".

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
