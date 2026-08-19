# Verktyg: Mapillary gatuvy (mapillary) — fältguide

Konfigurationsformulär: `apps/admin/src/views/tools/mapillary.jsx`, codename `mapillary`. Se [admin-tooloptions.md](admin-tooloptions.md) för det gemensamma mönstret. Visar den närmaste Mapillary-bilden till en klickad punkt i kartan, i ett resizable fönster, med en riktningsmarkör på kartan som följer bildens position/heading — även när användaren navigerar vidare inne i själva bildvisaren. Sökningen går direkt från webbläsaren mot Mapillarys Graph API (`graph.mapillary.com`), ingen backend-proxy inblandad.

I klienten heter verktyget **"Mapillary gatuvy"** (döpt om från bara "Mapillary" 2026-08-19, för att skilja det tydligt från det separata [Google Street View](admin-tool-streetview.md)-verktyget — båda visar gatunära bilder men från olika datakällor). Ikonen är en panorama-symbol, medvetet vald för att se annorlunda ut mot Street Views "pegman"-ikon. Adminformuläret nedan har inget eget titel-fält — namnet är hårdkodat i `apps/client/src/plugins/Mapillary/Mapillary.tsx`, inte konfigurerbart per karta.

- Aktiverad, Sorteringsordning
- Fönsterinställningar: Verktygsplacering, Fönsterplacering, Fönsterbredd, Fönsterhöjd
- Synlig vid start, Instruktion, Tillträde
- **Access token** (`accessToken`) — Mapillary client access token, se [mapillary.com/dashboard/developers](https://www.mapillary.com/dashboard/developers). Utan giltig token visar verktyget bara ett felmeddelande vid aktivering; ingen sökning görs.
- **Sökradie (meter)** (`searchRadius`, standard 25) — radien runt klickpunkten som avsöks för närmaste bild.
- **Utökad sökradie (meter)** (`fallbackSearchRadius`, standard 200) — används bara om inget hittas inom den ordinarie sökradien. Bland de bilder som hittas (oavsett vilken radie som gav träff) väljs den senast tagna bland de fem närmaste — inte helt enkelt den allra närmaste — för att undvika att en flera år gammal bild vinner över en färsk bild några meter längre bort i välkartlagda områden.

---

*Detta dokument beskriver läget i koden per 2026-08-19.*
