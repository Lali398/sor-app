// netlify/functions/sheet.js
const { google } = require('googleapis');

exports.handler = async function(event) {
    // A kliensoldaltól kapott adatok feldolgozása
    const { action, payload, range } = JSON.parse(event.body);

    // A titkos adatok beolvasása a Netlify környezeti változóiból
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

    if (!SPREADSHEET_ID || !GOOGLE_API_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Szerveroldali konfigurációs hiba." }),
        };
    }

    try {
        const sheets = google.sheets({ version: 'v4', auth: GOOGLE_API_KEY });
        let response;

        switch (action) {
            case 'APPEND_DATA':
                response = await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: {
                        values: [payload], // A payload itt egy sornyi adat (tömb)
                    },
                });
                break;

            // Itt lehetne további eseteket kezelni, pl. GET_DATA, UPDATE_DATA, stb.
            // case 'GET_DATA':
            //     response = await sheets.spreadsheets.values.get(...)
            //     break;

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: "Ismeretlen művelet." }),
                };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(response.data),
        };

    } catch (error) {
        console.error("Google Sheets API hiba:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Hiba a Google Sheets API-val való kommunikáció során." }),
        };
    }
};