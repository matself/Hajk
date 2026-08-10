# Verktyg: Utskrift (print) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/print.jsx`, codename `print`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Genererar PDF/PNG-utskrifter klientsidan (i webbläsaren, inte på servern som en äldre variant gjorde).

**Notera rutan högst upp i formuläret:** utskrift med hög DPI och/eller Single tile kan kräva mycket GeoServer-minne — standardgränsen (128 MB) räcker inte alltid. Ändras i GeoServer under *Tjänster → WMS → Gränser för resursförbrukning → Max renderingsminne (KB)*.

## Fönsterinställningar

Aktiverad, Sorteringsordning, Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd — se [admin-tooloptions.md](admin-tooloptions.md).

## Inställningar för bildhantering

- **Aktivera beräknad bildladdning** (`useCustomTileLoaders`) — ser till att WMS-förfrågningar inte överstiger serverns minnesgräns, och begär bilder med korrekt DPI. Rekommenderas påslagen.
- **Maximal Tile-storlek** (`maxTileSize`, 256–16384, riktvärde ~4096) — måste anges om ovanstående är aktiv.

## Inställningar för utskrift

- **Copyright**, **Disclaimer**, **Date** — fri text som skrivs ut på kartbilden.
- **Skalor** (`scales`) och **Skalmeter** (`scaleMeters`) — kommaseparerade listor, parvis ihopkopplade: vilka skalor som är valbara vid utskrift, och motsvarande skalstocks-längd i meter för respektive skala.
- **DPIer** (`dpis`) — valbara upplösningar vid utskrift, t.ex. `72, 150, 300`.
- **Pappersformat** (`paperFormats`) — t.ex. `A2, A3, A4`.
- **Logo** — sökväg (relativ Hajk-root eller absolut URL) till logotypen som infogas i utskriften.
- **Norrpil** (`northArrow`) — motsvarande sökväg för norrpilsbilden.

### Per-element: inkludera som standard + placering + storlek

Samma tremönster upprepas för fyra utskriftselement — logga, norrpil, skalstock, QR-kod:

| Element | "Inkludera ... som standard" | Placering | Maxbredd |
|---|---|---|---|
| Logga | `includeLogo` | `logoPlacement` | `logoMaxWidth` (0 = bildens egen storlek) |
| Norrpil | `includeNorthArrow` | `northArrowPlacement` | `northArrowMaxWidth` (0 = bildens egen storlek) |
| Skalstock | `includeScaleBar` | `scaleBarPlacement` | — |
| QR-kod | `includeQrCode` | `qrCodePlacement` | — |

Placering väljs mellan Uppe till vänster/höger, Nere till vänster/höger. "Inkludera ... som standard" är bara ett förval — slutanvändaren kan ändra det själv i utskriftsverktyget vid varje utskrift.

- **Inkludera bildram** (`includeImageBorder`) — ram runt kartbilden, ingen motsvarande användarväljbar inställning.
- **Tillåt teckenförklaring i PDF** (`allowLegendsInPdfOutput`, experimentell) — om användaren överhuvudtaget får välja att inkludera teckenförklaring.
- **Generera teckenförklaring som standard** (`generateLegendsByDefault`) — om det är förvalt när tillåtet ovan.
- **Marginal runt karta (förval)** (`useMargin`) och **Rubriktext m.m. i marginalerna (förval)** (`useTextIconsInMargin`) — om kartbilden har vitrum runt om, och om titel/text då placeras i marginalen istället för ovanpå kartan.
- **Textfärg** (`mapTextColor`) — färgväljare, förvald textfärg.

## Övriga inställningar

- Synlig vid start, Instruktion (standardtext nämner att utskriften sker klientsidan), Tillträde.
- **Teckenstorlek** (`textFontSize`) — Liten (8) / Mellan (11) / Stor (13), för copyright/date/disclaimer-texten.
- **Typsnitt** (`textFontWeight`) — Normal / Fet.

---

*Detta dokument beskriver läget i koden per 2026-07-30.*
