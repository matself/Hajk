# Detaljplan (planchecker) — fältguide

Verktyget visar vilka **planbestämmelser** som gäller i den punkt användaren klickar på, hämtade direkt från Lantmäteriets nationella geodataplattform (NGP) via backendens proxy. Codename i kartkonfigurationen är `planchecker`; formuläret ligger i `apps/admin/src/views/tools/planchecker.jsx`.

## Innan du börjar — två saker måste vara på plats

Verktyget är beroende av två delar som ligger utanför det här formuläret, och ingen av dem säger ifrån av sig själv om den saknas.

**1. Proxyn måste vara aktiverad i backend.** Sätt `LANTMATERIET_DETALJPLAN_ACTIVE=true` i backendens `.env`, tillsammans med kontouppgifterna för Geotorget-prenumerationen. Är den inte aktiverad monteras aldrig adressen, och anropen besvaras med ett **404 från Express** (`Cannot POST /api/v2/detaljplanproxy/search`) — vilket ser ut som fel sökväg men betyder avstängd funktion. Backenden loggar vid start vilket som gäller, och varnar särskilt om kontouppgifterna är ifyllda medan `ACTIVE` är bortkommenterad.

**2. Ett WMS-lager med detaljplanerna måste finnas i kartan.** Söktjänsten ritar ingenting — den levererar bara text — så utan lagret får användaren träffar på planer som inte syns. Lagret läggs upp som ett vanligt WMS-lager i [Lagerhanteraren](admin-layermanager.md) (Lantmäteriets visningstjänst kräver en token, se [Autentisering i WMS-formuläret](admin-wms-layer-form.md)) och måste dessutom **placeras i lagerväljarens trädstruktur**. Ett lager som bara finns i `layers.json` men inte i någon grupp läggs aldrig till i kartan, och kan då inte hittas av verktyget heller.

## Fönsterinställningar

Standardfälten **Sorteringsordning**, **Verktygsplacering**, **Fönsterplacering**, **Fönsterbredd** och **Fönsterhöjd** fungerar som för andra verktyg, se [Verktyg — översikt](admin-tooloptions.md). Verktyget levereras med `control` (knapp i kartans kontrollkolumn) och höjden `dynamic`.

## Detaljplan

**Titel**
Rubriken i verktygets fönster. Standard är "Detaljplan". Undvik "Planbesked" — det är en formell term i plan- och bygglagen för kommunens besked om man tänker påbörja en planläggning, alltså något helt annat än vad det här verktyget visar.

**Beskrivning**
Texten som visas under titeln på verktygsknappen.

**Planlager**
Id för det WMS-lager som visar detaljplanerna, exakt som det står i Lagerhanteraren. Verktyget **tänder och släcker aldrig lagret** — det är användarens val — men bevakar det och säger till:

| Läge | Vad användaren ser |
| --- | --- |
| Fältet är tomt | Varning om att inget planlager är kopplat |
| Lagret saknas i kartan | Varning som namnger id:t |
| Lagret finns men är släckt | Upplysning om var det tänds |
| Lagret är tänt | Ingenting |

I samtliga fall framgår att själva sökningen fungerar ändå. Notisen försvinner direkt när lagret tänds, utan att användaren behöver klicka om.

**Planstatus**
Kommaseparerad lista över vilka planstatusar som ska tas med. Standard är `laga kraft`, vilket är vad Lantmäteriets egen visningstjänst använder — en plan som inte vunnit laga kraft reglerar ännu ingenting. Lämna fältet tomt för att ta med alla statusar.

**Max antal bestämmelser**
Övre gräns för hur många planbestämmelser som hämtas per plan. Lantmäteriets egen tjänst använder 1000. Nås gränsen visas en varning om att listan kan vara ofullständig; verktyget hämtar i dagsläget bara första sidan och bläddrar inte vidare.

## Avancerat

**Sökproxy** och **Dokumentproxy**
Sökvägarna under `mapserviceBase` där backendens två proxyer är monterade (`detaljplanproxy` respektive `detaljplanassetproxy`). Ändra bara om de monterats på andra adresser i backend.

Att det behövs två beror på att planhandlingarna (Plankarta, Planhandling, Beslutsprotokoll) ligger på en **annan adress** än söktjänsten — en systeradress, inte en underadress — men bakom samma inloggning. Utan den andra proxyn hamnar länkarna i en inloggningsruta som ingen användare kan svara på.

## Att känna till om täckningen

NGP innehåller bara planer som levererats enligt den nationella specifikationen, vilket i praktiken betyder övervägande nya planer. Merparten av en kommuns gällande detaljplaner finns alltså inte där.

Det här är ingen brist i verktyget utan i underlaget, men det påverkar hur svaret ska läsas — och därför säger verktyget uttryckligen "ingen **digital** detaljplan hittades" i stället för att bara visa en tom lista. En tom lista skulle läsas som "inga bestämmelser här", vilket vore fel och potentiellt dyrt.
