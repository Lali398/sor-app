// api/sheet.js - Kiegészítve vendég regisztrációval és adatkezeléssel
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// === KONFIGURÁCIÓ ===
// A Google Táblázat munkalapjainak nevei
const ADMIN_BEERS_SHEET = "'Sör táblázat'!A4:V";
const USERS_SHEET = 'Felhasználók'; // Ebben tároljuk a regisztrált usereket
const GUEST_BEERS_SHEET = 'Vendég Sör Teszt'; // A vendégek söreit ide mentjük

// Oszlopindexek az admin táblázathoz
const COL_INDEXES = {
  admin1: { beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9 },
  admin2: { beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21 }
};

// === SEGÉDFÜGGVÉNYEK ===

// Admin sör objektum készítése
const transformRowToBeer = (row, userIndexes, ratedBy) => {
    const beerName = row[userIndexes.beerName];
    if (!beerName || beerName.trim() === '') return null;
    return {
        id: `${ratedBy}-${beerName.replace(/\s+/g, '-')}-${row[userIndexes.date] || ''}`,
        beerName,
        type: row[userIndexes.type] || 'N/A',
        beerPercentage: parseFloat(row[userIndexes.beerPercentage]) || 0,
        score: parseInt(row[userIndexes.score]) || 0,
        location: row[userIndexes.location] || '',
        ratedBy
    };
};

// JWT token ellenőrzése
const verifyUser = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Hiányzó vagy érvénytelen authentikációs token');
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, process.env.JWT_SECRET);
};

// === FŐ HANDLER FÜGGVÉNY ===

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { action } = req.body;
    const { SPREADSHEET_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_EMAIL, JWT_SECRET } = process.env;

    if (!SPREADSHEET_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY || !JWT_SECRET) {
        return res.status(500).json({ error: "Szerveroldali konfigurációs hiba. Ellenőrizd a környezeti változókat!" });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: GOOGLE_CLIENT_EMAIL, private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        // A művelet (action) alapján döntjük el, mit tegyünk
        switch (action) {
            
            // --- ADMIN BEJELENTKEZÉS ÉS ADATLEKÉRÉS ---
            case 'GET_DATA': {
                const { username, password } = req.body;
                if (username !== 'admin' || password !== 'sor') {
                    return res.status(401).json({ error: 'Hibás admin felhasználónév vagy jelszó' });
                }
                const sörökResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: ADMIN_BEERS_SHEET });
                const allRows = sörökResponse.data.values || [];
                const allBeers = [];
                allRows.forEach(row => {
                    const beer1 = transformRowToBeer(row, COL_INDEXES.admin1, 'admin1');
                    if (beer1) allBeers.push(beer1);
                    const beer2 = transformRowToBeer(row, COL_INDEXES.admin2, 'admin2');
                    if (beer2) allBeers.push(beer2);
                });
                return res.status(200).json({ beers: allBeers, users: [] });
            }

            // --- VENDÉG REGISZTRÁCIÓ ---
            case 'REGISTER_USER': {
                const { name, email, password } = req.body;
                if (!name || !email || !password) return res.status(400).json({ error: "Minden mező kitöltése kötelező!" });

                const users = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                const userExists = users.data.values?.some(row => row[1] === email);
                if (userExists) return res.status(409).json({ error: "Ez az e-mail cím már regisztrálva van." });
                
                const hashedPassword = await bcrypt.hash(password, 10);
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: USERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[name, email, hashedPassword]] },
                });
                return res.status(201).json({ message: "Sikeres regisztráció!" });
            }

            // --- VENDÉG BEJELENTKEZÉS ---
            case 'LOGIN_USER': {
                const { email, password } = req.body;
                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                const userRow = usersResponse.data.values?.find(row => row[1] === email);
                if (!userRow) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });

                const isPasswordValid = await bcrypt.compare(password, userRow[2]);
                if (!isPasswordValid) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
                
                const user = { name: userRow[0], email: userRow[1] };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' }); // A token 1 napig érvényes
                return res.status(200).json({ token, user });
            }

            // --- BEJELENTKEZETT VENDÉG SÖREINEK LEKÉRÉSE ---
            case 'GET_USER_BEERS': {
                const userData = verifyUser(req); // Ellenőrizzük a tokent
                const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                const userBeers = beersResponse.data.values
                    ?.filter(row => row[1] === userData.name) // Szűrés a beküldő nevére
                    .map(row => ({ // Átalakítás objektummá
                        date: row[0],
                        beerName: row[2],
                        type: row[3],
                        location: row[4],
                        score: row[7] // Feltételezve, hogy az "Íz" a fő pontszám
                    })) || [];
                return res.status(200).json(userBeers);
            }

            // --- ÚJ SÖR HOZZÁADÁSA VENDÉGKÉNT ---
            case 'ADD_USER_BEER': {
                const userData = verifyUser(req); // Ellenőrizzük a tokent
                const { beerName, type, location, percentage, score } = req.body;
                
                const newRow = [
                    new Date().toISOString(), // Dátum
                    userData.name,            // Beküldő Neve
                    beerName,                 // Sör Neve
                    type,                     // Típus
                    location,                 // Hely
                    '',                       // Külalak (ezt a frontendről kell bekérni)
                    '',                       // Illat (ezt a frontendről kell bekérni)
                    score,                    // Íz (pontszám)
                    '',                       // Megjegyzés (ezt a frontendről kell bekérni)
                    'Nem'                     // Tesztelve (alapértelmezett)
                ];

                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_BEERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] },
                });
                return res.status(201).json({ message: "Sör sikeresen hozzáadva!" });
            }

            default:
                return res.status(400).json({ error: `Ismeretlen művelet: ${action}` });
        }

    } catch (error) {
        console.error("API hiba:", error);
        // Ha a token érvénytelen, a verifyUser hibát dob
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Érvénytelen vagy lejárt token. Jelentkezz be újra!" });
        }
        return res.status(500).json({ error: "Hiba a szerveroldali feldolgozás során.", details: error.message });
    }
}
