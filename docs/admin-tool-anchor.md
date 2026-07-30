# Verktyg: Dela (anchor) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/anchor.jsx`, codename `anchor`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Skapar en delbar länk till kartans aktuella vy (lager, zoom, position).

- Aktiverad, Sorteringsordning
- Verktygsplacering (saknar Fönsterplacering/-bredd/-höjd — verktyget har inget eget fönsterinnehåll att storleksätta på det sättet)
- Synlig vid start, Instruktion, Tillträde
- **Visa väljare som låter användare skapa "rena" länkar (`clean=true`)** — om ikryssad kan slutanvändaren själv välja att generera en länk med `clean=true`, som öppnar kartan utan Hajks vanliga gränssnittsramverk runt kartan (bara själva kartytan).

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
