# XYZ-lagertyp i Hajk

Konfigurerbara rasterkartlager baserade på XYZ/slippy tile-standarden — OpenStreetMap, OpenTopoMap, ESRI World Imagery med flera.

Introducerad i commit d8dcdb6e9 · branch `feature/xyz-layer-type` · OpenLayers 10 `ol/source/XYZ`

---

## Vad är ett XYZ-lager?

XYZ (även kallat *slippy tiles*) är en utbredd standard för rasterkartjänster. Kartan delas upp i kvadratiska bildrutor (tiles) i ett pyramidformat — varje tile adresseras med zoomnivå `{z}`, kolumn `{x}` och rad `{y}`.

Tidigare skapades OSM-bakgrunden i Hajk via en hårdkodad inställning (`enableOSM`). Med den nya lagertypen konfigureras alla XYZ-tjänster på samma sätt som övriga lagertyper — direkt i admin-gränssnittet.

---

## Konfigurera ett XYZ-lager

1. **Skapa lagret i Admin → Lagerhanterare** — välj lagertyp **XYZ** och fyll i formuläret.
2. **Lägg till lagret i en karta** — öppna Admin → Kartinställningar och dra lagret till bakgrundslager-listan.
3. **Ange startsynlighet** — markera *Synlig vid start* på det lager som ska vara förvalt när kartan laddas.

---

## Parametrar

### Obligatoriska

| Parameter | Typ | Beskrivning |
|-----------|-----|-------------|
| `id` | sträng | Unik identifierare. Se [ID-regler](#id-regler) nedan. |
| `caption` | sträng | Visningsnamn i lagerhanteraren. |
| `url` | sträng | Tile-URL med platshållarna `{z}`, `{x}`, `{y}`. Se [URL-format](#url-format) nedan. |

### Valfria

| Parameter | Typ | Standard | Beskrivning |
|-----------|-----|----------|-------------|
| `attribution` | sträng | — | Upphovsrättstext som visas i kartans hörn. Stöder HTML-länkar. |
| `opacity` | tal | `1` | Opacitet, 0–1. |
| `minZoom` | heltal | `-1` | Minsta zoomnivå. `-1` = ingen begränsning. |
| `maxZoom` | heltal | `-1` | Högsta zoomnivå. `-1` = ingen begränsning. Sätt `19` för de flesta tjänster. |
| `visibleAtStart` | bool | `false` | Om lagret ska vara aktivt när kartan laddas. Anges i kartans baselayers-konfiguration. |

### Infopanel (valfria)

| Parameter | Beskrivning |
|-----------|-------------|
| `infoVisible` | Visa informationsknapp i lagerhanteraren. |
| `infoTitle` | Rubrik i infopanelen. |
| `infoText` | Beskrivande text. |
| `infoUrl` | Länk till mer information. |
| `infoUrlText` | Länktext. |
| `infoOwner` | Dataleverantörens namn. |
| `infoOpenDataLink` | Länk till öppen data. |

---

## URL-format

Standard — de flesta tjänster:
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

ESRI-format — `{y}` och `{x}` är omvända:
```
https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}
```

> OpenLayers hanterar båda formaten utan extra konfiguration — `{z}`, `{x}` och `{y}` ersätts som vanliga textsträngar.

---

## ID-regler

Lagrets `id` valideras av klienten. Tre format godkänns: heltal, MD5-hash (32 hex-tecken), eller **6–8 alfanumeriska tecken** — det senare är standardformatet som backend genererar automatiskt.

| | ID | Anledning |
|---|---|---|
| ❌ | `xyz-osm-1` | Bindestreck är ogiltigt |
| ❌ | `osm_layer` | Understreck är ogiltigt |
| ✅ | `osmxyz1` | 7 alfanumeriska tecken |
| ✅ | `ex8e3x` | 6 alfanumeriska tecken (backend-genererat) |

> Lager med ogiltigt ID syns i admin-gränssnittet men filtreras bort i klienten utan felmeddelande. Använd alltid backend-genererade ID:n för nya lager.

---

## Kända begränsningar

XYZ-lager är rasterbaserade och innehåller inga sökbara attribut. De stöds därför inte av **Sök**- eller **Redigera**-pluginsen — detta är avsiktligt, inte en bugg.

Titthål-funktionen (LayerComparer) och övriga lagerväljare i klienten filtrerar på `layerType`, inte källtyp, och inkluderar XYZ-lager utan ytterligare konfiguration.
