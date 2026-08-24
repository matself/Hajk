# Lagerhanteraren — översikt

Det här dokumentet beskriver skalet runt lagerformulären i Admin — fliken **Lagerlista** (`layermanager.jsx`, komponenten `Manager`). Själva fälten för respektive lagertyp är dokumenterade separat:

- [admin-wms-layer-form.md](admin-wms-layer-form.md) + [admin-wms-layer-settings.md](admin-wms-layer-settings.md) (WMS)
- [admin-wmts-layer-form.md](admin-wmts-layer-form.md) (WMTS)
- [admin-xyz-layer-form.md](admin-xyz-layer-form.md) (XYZ)
- [admin-vector-layer-form.md](admin-vector-layer-form.md) (Vektor)
- [admin-arcgis-layer-form.md](admin-arcgis-layer-form.md) (ArcGIS)

Alla fem delar samma skal och samma Metadata/Infodokument-mönster (Tidslinjedatum finns bara för WMS/Vektor).

## Layout

Sidan har tre delar:

- **Vänster (lagerlistan, `<aside>`)** — alla lager som finns i `layers.json`, oavsett vilken karta de används i eller om de används alls.
- **Mitten (`<article>`)** — formuläret för att lägga till ett nytt lager, eller redigera det lager som är valt i listan till vänster.
- **Höger (`<div className="details">`)** — attributtabell för ett WFS-lager, se "Beskriv lager" nedan.

## Lagerlistan

**Filtrera**
Textfältet överst filtrerar listan på Visningsnamn, Visningsnamn Admin eller lager-id (delsträng, skiftlägesokänsligt). Om filtret matchar något som *börjar med* söktexten sorteras dessa träffar överst, resten av träffarna sorteras alfabetiskt därefter.

**Klick på ett lager**
Öppnar lagret i redigeringsläge (`mode: "edit"`) i formuläret till höger, med rätt formulärkomponent vald utifrån lagrets typ. Formuläret byter då även till **Spara**-läge istället för **Lägg till**.

**Info-ikonen (i)**
Visar vilka kartkonfigurationer (`map_*.json`) lagret används i — söker igenom samtliga kartors bakgrundslager och grupper (rekursivt). Om lagret inte används i någon karta visas det tydligt. Detta är ofta det snabbaste sättet att se om ett lager i katalogen är "dött" eller fortfarande i bruk innan man tar bort det, se [[project_layers_catalogue]].

**Radera-ikonen (papperskorg)**
Tar bort lagret ur `layers.json`, efter bekräftelse. **OBS:** raderingen kollar inte om lagret används i någon karta — kontrollera med Info-ikonen först, annars riskerar man att en karta pekar på ett lager som inte längre finns.

## Lägga till/redigera lager

**Välj lagertyp**
Styr vilket formulär som visas i formulärytan: WMS, WMTS, ArcGIS, Vektor eller XYZ. Låst (kan inte ändras) när man redigerar ett befintligt lager — lagertypen sätts en gång vid skapande.

**Lägg till / Spara**
Samma knapp semantiskt olika beroende på läge: **Lägg till** (grönt) i tillägg-läge, **Spara** (blått) i redigeringsläge. Anropar formulärets egen `validate()` innan något skickas — misslyckas valideringen skickas inget till backend.

**Avbryt**
Visas bara i redigeringsläge. Återställer hela vyn till tillägg-läge utan att spara ändringar.

## Filtrera och sortera "Tillgängliga lager"

WMS-formuläret har ett filterfält ovanför lagerlistan och sorterbara kolumnrubriker (Titel, Namn) — nödvändigt eftersom en GeoServer ofta publicerar flera hundra lager i samma capabilities-svar, och listan annars visar dem i exakt den ordning tjänsten levererar dem. Filtret påverkar bara vad som visas: redan ikryssade lager förblir valda även när de filtreras bort. Se [admin-wms-layer-form.md](admin-wms-layer-form.md) för detaljer.

Övriga formulär (WMTS, ArcGIS, Vektor) saknar detta med flit — sådana tjänster innehåller sällan så många lager att listan blir oöverskådlig.

## Beskriv lager (attributtabell)

Både Vektor/WFS- och ArcGIS-formulären har en egen `describeLayer`-funktion (info-ikonen bredvid varje rad i "Tillgängliga lager") som hämtar attributnamn och -typer för ett valt lager — via WFS `DescribeFeatureType` för Vektor, via tjänstens egen beskrivnings-API för ArcGIS — och visar dem i högerspalten. Praktiskt för att hitta rätt attributnamn till fält som Sökfält, Geometrifält eller Visningsfält (Vektor), eller bara för att skriva [`{attributnamn}`-platshållare](admin-infoklick-mallformat.md) i Inforuta för hand (ArcGIS, som saknar "Hämta attribut" i själva Inforuta-fältet, se [admin-arcgis-layer-form.md](admin-arcgis-layer-form.md)) — utan att behöva slå upp det i en extern GIS-klient.

## Bilduppladdning (Teckenförklaring/-ikon)

"Välj fil"-knapparna i lagerformulären (Teckenförklaring, Teckenförklaringsikon) laddar inte upp direkt via ett vanligt API-anrop, utan via tre dolda formulär med en dold `<iframe>` som mål (`select-image`, `select-legend-icon`, `select-layers-info-legend-icon`). Filen postas till `url_import`, och när iframen laddar om läses den uppladdade URL:en ut ur svaret och skrivs in i respektive textfält automatiskt. Det är därför fälten fylls i "av sig själva" efter att man valt en fil — det är inte magi, bara en äldre uppladdningsteknik som föregår `fetch`/`FormData`.

---

*Detta dokument beskriver läget i koden per 2026-08-04. Om `layermanager.jsx` ändras bör denna guide uppdateras i samma PR.*
