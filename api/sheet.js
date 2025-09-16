// netlify/functions/sheet.js
const { google } = require('googleapis');

// Az oszlopindexek, amiket megadtál
const COL_INDEXES = {
  gabz: {
    beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9
  },
  lajos: {
    beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21
  }
};

/**
 * Segédfüggvény, ami egy sort és egy felhasználói index-objektumot felhasználva
 * megpróbál egy sör-értékelés objektumot létrehozni.
 */
const transformRowToBeer = (row, userIndexes, ratedBy) => {
    const beerName = row[userIndexes.beerName];
    // Csak akkor dolgozzuk fel, ha van sörnév az adott oszlopban
    if (!beerName || beerName.trim() === '') {
        return null;
    }

    return {
        // Egyedi ID generálása a sör neve, a felhasználó és a dátum alapján
        id: `${ratedBy}-${beerName.replace(/\s+/g, '-')}-${row[userIndexes.date] || ''}`,
        beerName: beerName,
        type: row[userIndexes.type] || 'N/A',
        beerPercentage: parseFloat(row[userIndexes.beerPercentage]) || 0,
        look: parseInt(row[userIndexes.look]) || 0,
        smell: parseInt(row[userIndexes.smell]) || 0,
        taste: parseInt(row[userIndexes.taste]) || 0,
        score: parseInt(row[userIndexes.score]) || 0,
        location: row[userIndexes.location] || '',
        date: row[userIndexes.date] || '',
        ratedBy: ratedBy // Hozzáadjuk, hogy ki értékelte
    };
};


exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { action, payload } = JSON.parse(event.body);

    const { SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL } = process.env;

    if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Szerveroldali konfigurációs hiba: Hiányzó környezeti változók." }),
        };
    }
    
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: GOOGLE_CLIENT_EMAIL,
            private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    try {
        switch (action) {
            case 'GET_DATA':
                // Lekérjük a 'Sörök' munkalapot, A4-től V oszlopig, ami mindkét felhasználó adatait tartalmazza
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'Sörök!A4:V', // Elég széles tartomány, hogy lefedje a 21. indexű oszlopot is
                });
                
                const allRows = response.data.values || [];
                const allBeers = [];

                // Végigmegyünk minden soron és megpróbáljuk mindkét felhasználó értékelését kiolvasni
                allRows.forEach(row => {
                    const gabzBeer = transformRowToBeer(row, COL_INDEXES.gabz, 'gabz');
                    if (gabzBeer) {
                        allBeers.push(gabzBeer);
                    }

                    const lajosBeer = transformRowToBeer(row, COL_INDEXES.lajos, 'lajos');
                    if (lajosBeer) {
                        allBeers.push(lajosBeer);
                    }
                });

                // A felhasználók lekérése egy másik munkalapról
                const usersResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: 'Felhasználók!A2:D',
                });
                const usersData = (usersResponse.data.values || []).map(row => ({
                    id: row[0], name: row[1], email: row[2]
                })).filter(u => u.name && u.email);

                return {
                    statusCode: 200,
                    body: JSON.stringify({
                        beers: allBeers,
                        users: usersData
                    }),
                };

            // Itt lehetne a többi action, pl. APPEND_BEER, UPDATE_BEER, stb.
            // Ezeket is frissíteni kellene, hogy a megfelelő oszlopokba írjanak!

            default:
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: `Ismeretlen művelet: ${action}` }),
                };
        }

    } catch (error) {
        console.error("Google Sheets API hiba:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Hiba a Google Sheets API-val való kommunikáció során.", details: error.message }),
        };
    }
};