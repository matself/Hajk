# PMTiles-lagerformulär — fältguide

Konfigurationsformulär: `apps/admin/src/views/layerforms/pmtileslayerform.jsx`, codename `PMTiles`. Se [admin-layermanager.md](admin-layermanager.md) för skalet runt formuläret (kartval, lagerlista, lägg till/redigera-flödet).

## Bakgrund

Ett PMTiles-arkiv är *en enda fil* som innehåller hela tile-pyramiden. Filen läggs på en vanlig webbserver eller ett objektlager (S3, Azure Blob, Cloudflare R2 …) och Klienten hämtar de tiles den behöver direkt ur filen med [HTTP Range-requests](https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests). Ingen tjänsteserver och ingen proxy i Hajks backend är inblandad.

Två krav på hostingen:

- **Range-requests** måste stödjas (i praktiken alla statiska webbservrar och objektlager gör det).
- **CORS** måste tillåta Klientens origin (`Access-Control-Allow-Origin`) eftersom webbläsaren läser filen direkt. Ligger arkivet på samma domän som Klienten behövs inget extra.

Endast **raster-PMTiles** stöds (tiles i PNG/JPEG/WebP). Vektor-PMTiles (MVT) stöds *inte* — de kräver en separat stilhantering (typsnitt, sprites, GL-stil) och är medvetet utanför den här lagertypen.

Lagret ritas av samma renderare som XYZ- och OSM-bakgrunderna och omprojiceras på samma sätt, så ett PMTiles-lager fungerar även i kartor i SWEREF 99 TM (EPSG:3006), inte bara i webbmercator.

## Fält

- **Visningsnamn\*** — namnet som visas i lagerlistan i Klienten.
- **Internt namn** — motsvarar "Visningsnamn Admin" i övriga lagerformulär: ett alternativt namn synligt bara i Admin, för att skilja lager åt internt.
- **URL till PMTiles-arkiv\*** — fullständig URL till `.pmtiles`-filen, t.ex. `https://exempel.se/kartor/bakgrund.pmtiles`. Till skillnad från XYZ är detta en direktlänk till filen — inga `{z}/{x}/{y}`-platshållare.
- **Attribution** — copyright-/källtext som visas i kartans hörn i Klienten. Stöder HTML-länkar.
- **Opacitet (0–1)**.
- **Min zoom / Max zoom** (`-1` = ingen gräns). Lämnas de på `-1` används arkivets egna min/max-zoom från filens header. Sätt värden bara för att begränsa lagret snävare än vad arkivet innehåller.
- **Beskrivning** — fri textbeskrivning för internt bruk i Admin, motsvarar "Innehåll" i övriga lagerformulär. Visas inte i Klienten.

## Infodokument

Samma mönster som i XYZ-formuläret (se [admin-xyz-layer-form.md](admin-xyz-layer-form.md#infodokument)): en kryssruta **Visa infodokument** fäller ut fälten **Rubrik**, **Text**, **Länk (URL)**, **Länktext**, **Öppna data-länk** och **Ägare**.

Formuläret saknar de fält som finns i övriga lagerformulär: ingen Teckenförklaring/-ikon, inget Infoklick (PMTiles-lager är rasterbaserade utan sökbara attribut), och ingen Tidslinjedatum-sektion.

## Lägga till lagret i en karta

Efter att lagret skapats i Lagerhanteraren läggs det in i en karta via **Kartinställningar**:

- Dra det till **bakgrundslager**-listan för att använda det som bakgrund (växlas i bakgrundsväljaren, en bakgrund i taget). Markera *Synlig vid start* på det lager som ska vara förvalt.
- Eller lägg det i en **grupp** i lagerträdet för att använda det som ett vanligt tänd/släck-lager ovanpå bakgrunden.

Titthål (LayerComparer) och lagerväljarna i Klienten filtrerar på `layerType`, inte källtyp, och tar med PMTiles-lager utan ytterligare konfiguration.

---

*Detta dokument beskriver läget i koden per 2026-09-10. Om `pmtileslayerform.jsx` ändras bör denna guide uppdateras i samma PR.*
