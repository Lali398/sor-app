// netlify/functions/sheet.js

// A Google API library importálása (ezt a Netlify automatikusan telepíti)
const { google } = require('googleapis');

// A fő függvény, ami lekezeli a bejövő kéréseket
exports.handler = async function(event, context) {
    // Az API kulcsot és a Spreadsheet ID-t a biztonságos környezeti változókból olvassuk ki
    const { API_KEY, SPREADSHEET_ID } = process.env;

    // A Google Sheets kliens inicializálása
    const sheets = google.sheets({
        version: 'v4',
        auth: API_KEY
    });

    try {
        // A kliensoldalról küldött adatok beolvasása
        const { action, payload, range } = JSON.parse(event.body);

        let response;

        // A "action" alapján döntjük el, mit tegyünk
        switch (action) {
            case 'GET_DATA':
                // Adatok lekérése a táblázatból
                response = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range || 'Sheet1!A:Z', // Alapértelmezett range
                });
                break;
            
            case 'APPEND_DATA':
                // Új sor hozzáadása a táblázathoz
                response = await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range || 'Sheet1!A:Z',
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [payload], // A payload egy tömb, pl: ["Sör Neve", "Típus", ...]
                    },
                });
                break;

            // Itt lehetne további eseteket definiálni (pl. UPDATE_DATA, DELETE_DATA)

            default:
                throw new Error('Ismeretlen művelet.');
        }

        // Sikeres válasz küldése a kliensnek
        return {
            statusCode: 200,
            body: JSON.stringify(response.data),
        };

    } catch (error) {
        // Hiba esetén hibaüzenet küldése
        console.error('Hiba történt:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Hiba a Google Sheets művelet során.' }),
        };
    }
};