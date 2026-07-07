import LocalStorageHelper from "utils/LocalStorageHelper";

export const getLayerSwitcherSteps = (layerSwitcherPlugin) => [
  {
    title: "Hajk 4",
    intro:
      "Den här introduktionen visar hur den nya " +
      layerSwitcherPlugin.options.title +
      " fungerar. <br><br>Syftet är att illustrera de förändringar som tillkommit i Hajk 4. <br></br> <i>Observera att inga andra åtgärder, som att klicka på knappar eller använda andra funktioner i applikationen, är möjliga under introduktionen.</i>. <br><br> Följ med!",
  },
  {
    title: "Lagerlista",
    element: "#layerslist-container",
    intro:
      "I lagerlistan ser du alla lager som är tillgängliga i kartan. <br><br>Här kan du: <ul><li>söka efter lager</li><li>slå på eller stänga av lager</li><li>se information om varje lager</li></ul>",
  },
  {
    title: "Sök lager",
    element: "#layer-list-filter",
    intro:
      "Skriv in text i fältet för att söka efter lager.<br><br>Resultaten visas i lagerlistan nedanför.",
  },
  {
    title: "Meny bredvid sökfältet",
    element: "#layerswitcher-actions-menu-button",
    intro:
      "Klicka på menyknappen (de tre prickarna). <br><br> <b>I menyn finns funktioner för att:</b> släcka alla aktiva lager, hoppa till toppen av lagerlistan eller hoppa till botten av lagerlistan.",
  },
  {
    title: "Menyfunktioner",
    element: "#layerswitcher-actions-menu",
    intro:
      "<b>Släck alla aktiva lager:</b> stänger av alla lager på kartan. <br><br> <b>Scrolla till toppen:</b> hoppar till början av lagerlistan. <br><br> <b>Scrolla till botten:</b> hoppar till slutet av lagerlistan.",
  },
  {
    title: "Lagergrupp",
    element: "#layerGroup-accordion-arrow-button",
    intro:
      "Pilen visar att det är en lagergrupp. Klicka för att se underliggande lager. <br><br> Notera att lagergrupper i <b>fetstil</b> innehåller aktiverade lager.",
  },
  {
    title: "Tända eller släcka lager",
    element: "#toggle-layer-item",
    intro:
      "Klicka i rutan för att slå på eller stänga av ett lager. Lagernamn i <b>fetstil</b> betyder att lagret är aktiverat.",
    position: "bottom",
  },
  {
    title: "Mer information",
    element: "#show-layer-details",
    intro: "Klicka på knappen för att visa mer information om lagret.",
  },
  {
    title: "Teckenförklaring",
    element: "#toggle-legend-icon",
    intro:
      "Knappen expanderar en sektion med teckenförklaring. <br><br> Klicka för att visa eller dölja den.",
  },
  {
    title: "Information om lager",
    element: "#layer-item-details-info",
    intro: "Här visas eventuell information kopplad till lagret.",
  },
  {
    title: "Transparens",
    element: "#layer-details-opacity-slider",
    intro: "Använd reglaget för att ändra lagrets transparens.",
  },
  {
    title: "Snabbåtkomst-knapp",
    element: "#layer-details-quick-access-button",
    intro:
      "<b>Lägg till i snabbåtkomst:</b> lagret läggs till i snabbåtkomstmenyn under fliken Kartlager. <br><br> <b>Ta bort från snabbåtkomst:</b> lagret tas bort från snabbåtkomstmenyn under fliken Kartlager.",
  },
  {
    title: "Flikar i " + layerSwitcherPlugin.options.title,
    element: "#layer-switcher-tab-panel",
    intro: () =>
      `Klicka här för att växla mellan olika vyer: <br><br> - <b>Kartlager:</b> visar lagerlistan med tillgängliga lager <br><br/> - <b>Bakgrund:</b> visar alla tillgängliga bakgrundslager <br><br/>${
        layerSwitcherPlugin.options.showDrawOrderView
          ? "- <b>Ritordning:</b> ändra ritordningen för aktiverade lager i kartan"
          : ""
      }`,
  },
  {
    title: "Ritordning",
    element: "#draw-order-tab",
    intro: "Klicka på fliken Ritordning för att se och ändra lagrens ordning.",
  },
  {
    title: "Visa systemlager",
    element: "#draw-order-switch",
    intro:
      "Klicka för att visa systemlager i lagerlistan nedanför.<br><br>Systemlager är lager som skapas av verktyg, till exempel Ritaverktyget.",
  },
  {
    title: "Systemlager-lista",
    element: "#draw-order-list",
    intro:
      "Här kan du se och ändra ordningen för systemlager. <br><br> Dra och släpp lager för att ändra ordningen.",
  },
  {
    title: "Snabbåtkomst",
    element: "#quick-access-view",
    intro: "Här listas och hanteras sparade lager för snabbåtkomst.",
  },
  {
    title: "Snabbåtkomst-meny",
    element: "#quick-access-menu-button",
    intro:
      "Klicka på menyknappen (de tre prickarna) i snabbåtkomst. <br><br> <b>I menyn finns funktioner för att:</b> <br> - lägga till aktiverade lager <br> - rensa allt",
  },
  {
    title: "Alternativ för snabbåtkomst",
    element: "#quick-access-menu-content",
    intro:
      "<b>Lägg till aktiverade lager:</b> lägger till alla aktiverade lager i snabbåtkomst. <br><br> <b>Rensa allt:</b> tar bort alla lager från snabbåtkomst.",
  },
  {
    title: "Favoriter",
    element: "#favorites-menu-button",
    intro: () => {
      const savedLayers =
        LocalStorageHelper.get("layerswitcher").savedLayers?.length || 0;
      const baseIntro =
        "Klicka på favoriter-knappen. <br><br> Här kan du spara, redigera och ladda favoriter.";

      if (savedLayers === 0) {
        return (
          baseIntro +
          "<br><br><i>Inga favoriter finns just nu. Lägg till en favorit för att aktivera den här delen av guiden.</i>"
        );
      }

      return baseIntro;
    },
  },
  {
    title: "Favoritmeny",
    element: "#favorites-menu",
    intro:
      "- <b>Spara till favoriter:</b> sparar en grupp av lager som favorit. Du kan anpassa titel och beskrivning. <br><br> - <b>Redigera favoriter:</b> hantera dina sparade favoriter. <br><br> - <b>Ladda favorit:</b> laddar vald favorit. Alla aktiva lager ersätts med favoritens lager.",
  },
  {
    title: "Redigera favoriter",
    element: "#edit-favorites",
    intro: "Knappen öppnar en vy där du kan hantera sparade favoriter.",
  },
  {
    title: "Importera favoriter",
    element: "#import-favorites-button",
    intro: "Klicka för att importera favoriter från en .json-fil.",
  },
  {
    title: "Favoritlista",
    element: "#favorites-list-view",
    intro:
      "Här visas dina sparade favoriter. Klicka på en favorit för att ersätta befintliga lager med den.",
  },
  {
    title: "Alternativ för favoriter",
    element: "#favorites-list-options-button",
    intro:
      "<b>I menyn kan du:</b> visa information om favoriten, redigera den, ta bort den eller exportera den som en .json-fil.",
  },
  {
    title: "Meny för favoritens alternativ",
    element: "#favorites-list-options-menu",
    intro:
      "<b>Redigera:</b> ändra titel och beskrivning <br><br> <b>Ta bort:</b> tar bort favoriten från listan <br><br> <b>Exportera:</b> sparar favoriten som en .json-fil",
  },
  {
    title: "Teman",
    element: "#quick-access-theme-button",
    intro: () => {
      const baseIntro =
        "Klicka på knappen för att visa teman. <br> Teman är fördefinierade lagergrupper skapade av administratörer.";

      if (layerSwitcherPlugin.options.quickAccessPresets?.length === 0) {
        return (
          baseIntro +
          "<br><br><i>Inga teman finns tillgängliga. Be en administratör att skapa teman för att använda den här funktionen.</i>"
        );
      }

      return baseIntro;
    },
  },
  {
    title: "Temalista",
    element: "#quick-access-presets-view",
    intro:
      "Här ser du de teman som finns i kartan. <br><br> Klicka på ett tema för att aktivera alla dess lager. <br><br> Du kan också söka efter teman i sökfältet.",
  },
  {
    title: "Introduktion avslutad 🎉",
    element: "#introduction-icon",
    intro:
      "Du har nu gått igenom hela introduktionen. Vill du ta en runda till?<br><br>Klicka på knappen i kartkontrollpanelen för att börja om från början.",
    position: "left",
  },
];
