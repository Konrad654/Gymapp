# Gymlogg

En svensk träningslogg med 10 förvalda gymövningar, löpning och cykling. Under Historik kan du öppna varje övning och se tidigare värden. De manuella posterna ligger i angiven ordning och saknar datum och reps där de uppgifterna saknas.

## Publicera med GitHub och Vercel

1. Packa upp ZIP-filen. Lägg upp innehållet i ett nytt GitHub-repo. Behåll mappen `public` och placera `vercel.json` i repots rot.
2. I Vercel väljer du **Add New → Project** och importerar repot. Använd repots rot som Root Directory. Konfigurationen serverar `public` direkt.
3. Tryck på **Deploy**. Öppna den färdiga adressen i Safari på din iPhone.
4. Välj **Dela → Lägg till på hemskärmen**, aktivera **Öppna som webbapp** och tryck **Lägg till**. Logga från hemskärmsikonen.

## Lagring och säkerhetskopior

Appen lagrar nya loggar och övningar lokalt med localStorage. Använd samma webbadress och öppna appen från samma hemskärmsikon. Om du byter adress eller enhet, eller rensar webbplatsdata, kan du flytta tillbaka historiken med **Säkerhetskopia → Importera**. Exportera först en JSON-fil till Filer. Import ersätter den befintliga lokala historiken efter bekräftelse.

Startloggen ligger i `public/seed.js` för att visas direkt vid första öppningen. Den är därmed läsbar för besökare på en publik Vercel-adress även om GitHub-repot är privat. För att hålla historiken privat vid publik publicering kan du först starta appen lokalt, exportera historiken och sedan ersätta varje viktlista i `seed.js` med `[]` före uppladdning. Importera sedan kopian i hemskärmsappen.

Lokal körning med Python: kör `python -m http.server 8000 --directory public` i den uppackade mappen och öppna `http://localhost:8000`.
