// api/sheet.js - "Beszédes" hibakereső verzió
import { google } from 'googleapis';

// Az oszlopindexek
const COL_INDEXES = {
  gabz: { beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9 },
  lajos: { beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21 }
};

// ... (a többi segédfüggvény változatlan)
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
        console.log("Hiba: Nem POST kérés, leállás.");
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    console.log("2. POST kérés fogadva.");
    const { action } = req.body;
    console.log(`3. Action beolvasva: ${action}`);

    const { SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL } = process.env;
    
    // Ellenőrizzük a változókat egyenként
    if (!SPREADSHEET_ID) {
        console.error("FATALIS HIBA: SPREADSHEET_ID nincs beállítva!");
        return res.status(500).json({ error: "Konfigurációs hiba: SPREADSHEET_ID hiányzik." });
    }
    console.log("4. SPREADSHEET_ID rendben.");

    if (!GOOGLE_CLIENT_EMAIL) {
        console.error("FATALIS HIBA: GOOGLE_CLIENT_EMAIL nincs beállítva!");
        return res.status(500).json({ error: "Konfigurációs hiba: GOOGLE_CLIENT_EMAIL hiányzik." });
    }
    console.log("5. GOOGLE_CLIENT_EMAIL rendben.");

    if (!GOOGLE_PRIVATE_KEY) {
        console.error("FATALIS HIBA: GOOGLE_PRIVATE_KEY nincs beállítva!");
        return res.status(500).json({ error: "Konfigurációs hiba: GOOGLE_PRIVATE_KEY hiányzik." });
    }
    console.log("6. GOOGLE_PRIVATE_KEY létezik (tartalmát nem írjuk ki).");

    try {
        console.log("7. Try-catch blokk elindult, auth objektum létrehozása következik.");
        
        const privateKey = GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        console.log("8. Private key formázva.");

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_CLIENT_EMAIL,
                private_key: privateKey,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        console.log("9. Auth objektum sikeresen létrehozva.");

        const sheets = google.sheets({ version: 'v4', auth });
        console.log("10. Sheets kliens sikeresen létrehozva.");

        if (action === 'GET_DATA') {
            console.log("11. GET_DATA action, API hívás a Google felé.");
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Sörök!A4:V',
            });
            console.log("12. Google API válasz megérkezett.");
            
            const allRows = response.data.values || [];
            const allBeers = [];
            allRows.forEach(row => {
                const gabzBeer = transformRowToBeer(row, COL_INDEXES.gabz, 'gabz');
                if (gabzBeer) allBeers.push(gabzBeer);
                const lajosBeer = transformRowToBeer(row, COL_INDEXES.lajos, 'lajos');
                if (lajosBeer) allBeers.push(lajosBeer);
            });
            console.log(`13. Feldolgozva ${allBeers.length} sör.`);

            // A Felhasználók lekérése most kimarad az egyszerűség kedvéért
            return res.status(200).json({ beers: allBeers, users: [] });
        } else {
            console.log(`Ismeretlen action: ${action}`);
            return res.status(400).json({ error: `Ismeretlen művelet: ${action}` });
        }

    } catch (error) {
        console.error("!!! KIVÉTELKEZELÉSI BLOKK !!!");
        console.error("Részletes hiba:", error);
        return res.status(500).json({ 
            error: "Hiba a Google Sheets API-val való kommunikáció során.", 
            details: error.message,
            stack: error.stack // Küldjük el a stack trace-t is a válaszban
        });
    }
}
