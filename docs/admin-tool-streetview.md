# Verktyg: Google Street View (streetview) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/streetview.jsx`, codename `streetview`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Visar Googles egna Street View-panorama i ett fönster när användaren klickar i kartan — inbäddat via Google Maps JavaScript API, inte något Hajk hämtar eller cachar själv.

I klienten heter verktyget **"Google Street View"** (fram till 2026-08-19 hette det bara "Gatuvy" — namnbytet gjordes för att skilja det tydligt från det separata [Mapillary](admin-tool-mapillary.md)-verktyget, som täcker samma typ av gatuvy men med en annan datakälla). Adminformuläret nedan har inget eget titel-fält — namnet är hårdkodat i `apps/client/src/plugins/StreetView/StreetView.jsx`, inte konfigurerbart per karta.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde
- **API-nyckel** (`apiKey`) — Google Maps JavaScript API-nyckel. Förifylld med en delad standardnyckel i formuläret; byt ut mot en egen nyckel för produktionsbruk (Googles kvoter/fakturering gäller per nyckel, inte per Hajk-installation).

---

*Detta dokument beskriver läget i koden per 2026-08-19.*
