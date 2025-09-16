// api/sheet.js - Végleges, tiszta verzió
import { google } from 'googleapis';

// Oszlopindexek, ahogy a táblázatban szerepelnek
const COL_INDEXES = {
  // Feltételezzük, hogy az "admin" értékelései az A-K oszlopokban vannak
  admin1: { beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9 },
  // Feltételezzük, hogy egy másik admin értékelései a M-W oszlopokban vannak
  admin2: { beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21 }
};

// Segédfüggvény, ami egy sort alakít át sör objektummá
const transformRowToBeer = (row, userIndexes, ratedBy) => {
    const beerName = row[userIndexes.beerName];
    if (!beerName || beerName.trim() === '') return null; // Ha nincs sörnév, kihagyjuk
    return {
        id: `${ratedBy}-${beerName.replace(/\s+/g, '-')}-${row[userIndexes.date] || ''}`,
        beerName,
        type: row[userIndexes.type] || 'N/A',
        beerPercentage: parseFloat(row[userIndexes.beerPercentage]) || 0,
        look: parseInt(row[userIndexes.look]) || 0,
        smell: parseInt(row[userIndexes.smell]) || 0,
        taste: parseInt(row[userIndexes.taste]) || 0,
        score: parseInt(row[userIndexes.score]) || 0,
        location: row[userIndexes.location] || '',
        date: row[userIndexes.date] || '',
        ratedBy
    };
};

export default async function handler(req, res) {
    // Csak POST kéréseket fogadunk el
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { action, username, password } = req.body;
    const { SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL } = process.env;

    // Ellenőrizzük, hogy a Vercel beállítások rendben vannak-e
    if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
        return res.status(500).json({ error: "Szerveroldali konfigurációs hiba. Ellenőrizd a környezeti változókat!" });
    }
    
    // --- Bejelentkezés kezelése ---
    // Mivel nincs felhasználói tábla, fixen beállítjuk az admin felhasználót
    const validUsers = [{ username: 'admin', password: 'sor' }]; 
    const user = validUsers.find(u => u.username === username && u.password === password);

    if (!user) {
        return res.status(401).json({ error: 'Hibás felhasználónév vagy jelszó' });
    }
    // --- Bejelentkezés vége ---

    try {
        // Hitelesítés a Google API-nál
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: GOOGLE_CLIENT_EMAIL,
                private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheets = google.sheets({ version: 'v4', auth });

        // Adatok lekérése
        if (action === 'GET_DATA') {
            const sörökResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                // A helyes munkalapnév és tartomány
                range: "'Sör táblázat'!A4:V",
            });
            
            const allRows = sörökResponse.data.values || [];
            const allBeers = [];

            // Végigmegyünk a sorokon és feldolgozzuk őket
            allRows.forEach(row => {
                const beer1 = transformRowToBeer(row, COL_INDEXES.admin1, 'admin1');
                if (beer1) allBeers.push(beer1);

                const beer2 = transformRowToBeer(row, COL_INDEXES.admin2, 'admin2');
                if (beer2) allBeers.push(beer2);
            });

            // Visszaküldjük a sörök listáját (a felhasználók üres, mert a beléptetés már megtörtént)
            return res.status(200).json({ beers: allBeers, users: [] });
        } else {
            return res.status(400).json({ error: `Ismeretlen művelet: ${action}` });
        }

    } catch (error) {
        console.error("Google Sheets API hiba:", error);
        return res.status(500).json({ error: "Hiba a Google Sheets API-val való kommunikáció során.", details: error.message });
    }
}
