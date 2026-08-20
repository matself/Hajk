# Meddelanden vid kartstart (announcements)

`announcements` är en lista med korta meddelanden som visas som en notis (en *snackbar*) i nedre hörnet när kartan laddas. Tänk "dagens meddelande" — driftinformation, en tillfällig varning, en hälsning.

**Det finns inget formulär för det här i Admin.** Listan redigeras för hand i klientens `appConfig.json`, samma fil som innehåller `mapserviceBase` och `availableTools`. Filen hämtas vid körning, så i en driftsatt installation redigerar du `appConfig.json` i webbrotens katalog och laddar om sidan — ingen ombyggnad behövs.

Implementationen finns i `apps/client/src/components/Announcement/Announcement.jsx`.

## Inte en plats per karta

Det är lätt att tro att `announcements` är en plats där varje karta lägger sitt eget meddelande. Så fungerar det inte. Listan är **gemensam för hela installationen** — varje post talar i stället om vilka kartor just den posten gäller för, via fältet `maps`.

Vill du ha ett eget meddelande per karta lägger du alltså till flera poster i samma lista, var och en med sitt eget `id` och sin egen `maps`-array:

```json
"announcements": [
  { "id": 1, "maps": ["oversiktskarta"], "text": "…", "active": true },
  { "id": 2, "maps": ["badplatser"],     "text": "…", "active": true }
]
```

Behöver meddelandet i stället höra ihop med en enskild karta och kunna redigeras av den som förvaltar kartan, är [Informationsdialoger (infodialog)](admin-tool-infodialog.md) rätt verktyg — det ligger i kartans egen konfiguration, har ett formulär i Admin och visar en riktig dialogruta i stället för en notis. Tumregeln: `announcements` för sådant som gäller hela installationen och överlever enskilda kartor, infodialog för sådant som hör till en karta.

## Fälten

| Fält | Typ | Betydelse |
|---|---|---|
| `id` | heltal | Måste vara unikt i listan. Används för att komma ihåg vad användaren redan sett — se `showOnlyOnce`. |
| `active` | boolean | `false` stänger av posten utan att ta bort den. Enklaste sättet att pausa ett meddelande. |
| `text` | sträng | Meddelandet. Renderas som Markdown, och rå HTML är tillåten. `\n\n` ger nytt stycke. |
| `maps` | array eller `"all"` | Vilka kartor posten gäller. En array med kartkonfigurationernas namn, eller strängen `"all"` för alla. |
| `timeout` | tal eller `null` | Millisekunder innan notisen försvinner av sig själv. `null` (eller utelämnat) gör notisen permanent — den får då en stängningsknapp i stället. |
| `showOnlyOnce` | boolean | `true` visar posten en gång per webbläsare. Se nedan. |
| `startTime` | datumsträng | Tidigast när posten får visas. Måste kunna tolkas av `Date.parse()`, t.ex. `"2026-08-20"`. |
| `stopTime` | datumsträng | Sista tidpunkt då posten visas. |
| `type` | sträng | Notisens färg/ikon: `default`, `info`, `warning`, `success` eller `error`. |

En post visas bara om den klarar samtliga fyra filter: rätt karta, `active: true`, inom tidsintervallet, och inte redan visad (om `showOnlyOnce` är satt).

### Fallgropar

- **`maps` med ett ogiltigt värde döljer posten tyst.** Bara en array eller strängen `"all"` accepteras. Skriver du t.ex. `"maps": "map_1"` (en sträng som inte är `"all"`) visas posten aldrig, utan felmeddelande.
- **Både `startTime` och `stopTime` är valfria.** Anges bara den ena gäller posten från respektive till den tidpunkten. Kan ingen av strängarna tolkas som datum finns ingen tidsbegränsning alls.
- **`timeout` måste vara ett tal för att räknas.** Allt annat — `null`, en sträng, utelämnat fält — ger en permanent notis med stängningsknapp.

## Hur `showOnlyOnce` kommer ihåg

När en post med `showOnlyOnce: true` visas skrivs dess `id` till en kommaseparerad lista i webbläsarens `localStorage`, under nyckeln `shownAnnouncementIds`. Vid nästa besök hoppas posten över om dess `id` finns i listan.

Det får två praktiska följder:

- **Ändrar du texten i en post som redan visats syns inte ändringen.** Posten är ju redan avbockad. Vill du att den ska visas igen måste du ge posten ett nytt, oanvänt `id`.
- **Minnet sitter i webbläsaren, inte på servern.** Varje användare, webbläsare och profil har sitt eget. Rensad webbplatsdata nollställer det, och användaren ser meddelandet igen.

Återanvänd därför inte gamla `id`-nummer — räkna uppåt.

## Standardposten i den här utgåvan

`appConfig.json` levereras med en demopost från uppströms Hajk ("Hi, this is **Hajk**!"). Den är avstängd med `active: false` i den här utgåvan, men ligger kvar som ett fungerande exempel att utgå från.

Vill du stänga av funktionen helt kan du också ta bort hela `announcements`-arrayen — komponenten monteras bara när arrayen finns och innehåller minst en post.

---

*Detta dokument beskriver läget i koden per 2026-08-20.*
