# Informationsdialoger – kort manual

**Vad gör verktyget?**
Med det här verktyget kan du skapa och redigera flera fristående informationsrutor i kartan – till exempel en hjälpruta, en informationsruta om kartan och en nyhetsruta. Varje ruta är en egen "dialog" med eget namn, egen knapp och eget innehåll.

## Aktivera verktyget

1. Gå till **Verktyg** för vald karta.
2. Välj **Informationsdialoger** i listan till vänster.
3. Kryssa i **Aktiverad**.
4. Ange **Sorteringsordning** (styr i vilken ordning verktygen visas i kartan).

## Lägg till en dialog

1. Klicka **Lägg till dialog**.
2. Fyll i fälten (se genomgång nedan).
3. Klicka **Spara** högst upp.

Du kan lägga till hur många dialoger som helst under samma verktyg. Klicka på en dialog i listan för att redigera den, eller **Ta bort dialog** för att radera den.

## Fältgenomgång

### Identitet

- **Namn** – ett unikt namn för dialogen. Används internt för att komma ihåg om en användare redan sett rutan. *Ändra inte namnet på en befintlig dialog i onödan* – då nollställs minnet och alla användare ser rutan igen, även om de sett den förut.
- **Titel** – texten som visas på knappen i kartan.
- **Beskrivning** – kort text som visas som verktygstips vid hovring.

### Placering

- **Knappens placering** – var knappen ska visas: vänster meny, höger meny, kartkontroll, eller dold (visas bara automatiskt/programmatiskt).
- **Ikon** – namn på en Material-ikon, t.ex. `helpcenter` eller `announcement`. Lämna tomt för standardikon.

### Innehåll

- **Rubrik i dialogrutan** – rubriken högst upp i själva rutan (kan skilja sig från Titel).
- **Text** – själva innehållet. Nya dialoger redigeras direkt som formaterad text (fetstil, rubriker, länkar osv. via knapparna ovanför textfältet) – ingen Markdown-kunskap behövs. Äldre dialoger som redan skrivits i Markdown visas istället som råtext, med en kryssruta för att tillåta HTML-taggar i texten.

### Knappar

- **Text i stängknappen** – t.ex. "Stäng" eller "Ok, uppfattat!".
- **Stängknappens utseende** – standard, konturerad eller fylld knapp.
- **Text i avbryt-knappen** – valfri extraknapp, lämna tomt för att dölja den.

### Synlighet

- **Visa automatiskt när kartan öppnas** – dialogen poppar upp direkt vid start.
- **Visa bara automatiskt en gång per användare** – används tillsammans med ovanstående, så att rutan inte visas varje gång.
- **Senast ändrad** – klicka **Uppdatera till nu** när du ändrat innehållet i en dialog som redan visats för alla, så att den visas igen även för de som redan sett den tidigare (oavsett inställningen ovan).
