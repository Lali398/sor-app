// api/sheet.js - Javítva a munkalap neve
import { google } from 'googleapis';

const COL_INDEXES = {
  gabz: { beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9 },
  lajos: { beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21 }
};

const transformRowToBeer = (row, userIndexes, ratedBy) => {
    const beerName = row[userIndexes.beerName];
    if (!beerName || beerName.trim() === '') return null;
    return {
        id: `${ratedBy}-${beerName.replace(/\s+/g, '-')}-${row[userIndexes.date] || ''}`, beerName,
        type: row[userIndexes.type] || 'N/A', beerPercentage: parseFloat(row[userIndexes.beerPercentage]) || 0,
        look: parseInt(row[userIndexes.look]) || 0, smell: parseInt(row[userIndexes.smell]) || 0,
        taste: parseInt(row[userIndexes.taste]) || 0, score: parseInt(row[userIndexes.score]) || 0,
        location: row[userIndexes.location] || '', date: row[userIndexes.date] || '', ratedBy
    };
};

export default async function handler(req, res) {
    console.log("1. Függvény elindult.");

    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    console.log("2. POST kérés fogadva.");
    const { action } = req.body;
    console.log(`3. Action beolvasva: ${action}`);

    const { SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL } = process.env;
    
    // ... (a környezeti változók ellenőrzése marad)
    if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        console.error("FATALIS HIBA: Hiányzó környezeti változók!");
        return res.status(500).json({ error: "Konfigurációs hiba: Hiányzó környezeti változók." });
    }
    console.log("4-6. Környezeti változók rendben.");


    try {
        console.log("7. Try-catch blokk elindult, auth objektum létrehozása következik.");
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_CLIENT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        console.log("9. Auth objektum sikeresen létrehozva.");

        const sheets = google.sheets({ version: 'v4', auth });
        console.log("10. Sheets kliens sikeresen létrehozva.");

        if (action === 'GET_DATA') {
            console.log("11. GET_DATA action, API hívás a Google felé.");
            
            // JAVÍTÁS ITT: A 'Sörök' átírva "'Sör táblázat'"-ra
            const sörökPromise = sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: "'Sör táblázat'!A4:V", // <-- EZ VOLT A HIBA
            });
            
            const usersPromise = sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Felhasználók!A2:D',
            });

            const [sörökResponse, usersResponse] = await Promise.all([sörökPromise, usersPromise]);
            console.log("12. Google API válasz megérkezett.");
            
            const allRows = sörökResponse.data.values || [];
            const allBeers = [];
            allRows.forEach(row => {
                const gabzBeer = transformRowToBeer(row, COL_INDEXES.gabz, 'gabz');
                if (gabzBeer) allBeers.push(gabzBeer);
                const lajosBeer = transformRowToBeer(row, COL_INDEXES.lajos, 'lajos');
                if (lajosBeer) allBeers.push(lajosBeer);
            });
            console.log(`13. Feldolgozva ${allBeers.length} sör.`);

            const usersData = (usersResponse.data.values || []).map(row => ({
                id: row[0], name: row[1], email: row[2]
            })).filter(u => u.name && u.email);
            console.log(`14. Feldolgozva ${usersData.length} felhasználó.`);

            return res.status(200).json({
                beers: allBeers,
                users: usersData
            });
        } else {
            // ... (a többi rész változatlan)
        }

    } catch (error) {
        console.error("!!! KIVÉTELKEZELÉSI BLOKK !!!");
        console.error("Részletes hiba:", error);
        return res.status(500).json({ 
            error: "Hiba a Google Sheets API-val való kommunikáció során.", 
            details: error.message
        });
    }
}
