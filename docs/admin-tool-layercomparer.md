# Verktyg: Lagerjämförare (layercomparer) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/layercomparer.jsx`, codename `layercomparer`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Låter användaren jämföra två lager, antingen sida vid sida eller via "Titthål" (spyGlass) — en rörlig cirkel/linje som avslöjar det ena lagret genom det andra.

- Aktiverad, Sorteringsordning
- Verktygsplacering (saknar Fönsterplacering/-bredd/-höjd)
- Synlig vid start, Instruktion, Tillträde
- **Visa (utöver bakgrundslager) även vanliga kartlager som valbara i jämföraren** (`showNonBaseLayersInSelect`) — annars går det bara att jämföra bakgrundskartor mot varandra. Inaktiverad om "Aktivera 'Välj lager'" nedan är ikryssad.
- **Startläge för jämförare** (`startCompareMode`) — `Sida vid sida` eller `Titthål`.
- **Aktivera "Välj lager"** (`selectChosenLayers`) — växlar till ett läge där administratören istället väljer en fast, konkret lista av jämförbara lager (`chosenLayers`, valda via `LayerComparerLayerList`-komponenten), oavsett lagertyp — snarare än att låta klienten visa alla bakgrundslager (och ev. vanliga lager). Listan hämtas ur den aktuella kartans lagermeny (grupper + bakgrundslager), begränsad till lager som faktiskt finns i lagerkatalogen.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
