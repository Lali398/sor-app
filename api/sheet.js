// api/sheet.js - Kiegészítve vendég regisztrációval és adatkezeléssel
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// === KONFIGURÁCIÓ ===
const ADMIN_BEERS_SHEET = "'Sör táblázat'!A4:V";
const USERS_SHEET = 'Felhasználók'; 
const GUEST_BEERS_SHEET = 'Vendég Sör Teszt';

const COL_INDEXES = {
  admin1: { beerName: 0, location: 1, type: 2, look: 3, smell: 4, taste: 5, score: 6, avg: 7, beerPercentage: 8, date: 9 },
  admin2: { beerName: 12, location: 13, type: 14, look: 15, smell: 16, taste: 17, score: 18, avg: 19, beerPercentage: 20, date: 21 }
};

// === SEGÉDFÜGGVÉNYEK ===

const transformRowToBeer = (row, userIndexes, ratedBy) => {
    const beerName = row[userIndexes.beerName];
    if (!beerName || beerName.trim() === '') return null;
    return {
        id: `${ratedBy}-${beerName.replace(/\s+/g, '-')}-${row[userIndexes.date] || ''}`,
        beerName,
        type: row[userIndexes.type] || 'N/A',
        location: row[userIndexes.location] || '',
        beerPercentage: parseFloat(row[userIndexes.beerPercentage]) || 0,
        look: parseInt(row[userIndexes.look]) || 0,
        smell: parseInt(row[userIndexes.smell]) || 0,
        taste: parseInt(row[userIndexes.taste]) || 0,
        totalScore: parseInt(row[userIndexes.score]) || 0,
        avg: parseFloat(row[userIndexes.avg]) || 0,
        date: row[userIndexes.date] || null,
        ratedBy
    };
};

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
        return res.status(500).json({ error: "Szerveroldali konfigurációs hiba." });
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: GOOGLE_CLIENT_EMAIL, private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });

        switch (action) {
            
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

            case 'LOGIN_USER': {
                const { email, password } = req.body;
                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                const userRow = usersResponse.data.values?.find(row => row[1] === email);
                if (!userRow) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });

                const isPasswordValid = await bcrypt.compare(password, userRow[2]);
                if (!isPasswordValid) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
                
                const user = { name: userRow[0], email: userRow[1] };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
                return res.status(200).json({ token, user });
            }

            case 'GET_USER_BEERS': {
                const userData = verifyUser(req);
                const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                const userBeers = beersResponse.data.values
                    ?.filter(row => row[1] === userData.name) 
                    .map(row => ({
                        date: row[0],
                        beerName: row[2],
                        type: row[3],
                        location: row[4],
                        look: row[5] || 0,
                        smell: row[6] || 0,
                        taste: row[7] || 0,
                        beerPercentage: row[8] || 0,
                        totalScore: row[9] || 0,
                        avg: row[10] || 0,
                        notes: row[11] || ''
                    })) || [];
                return res.status(200).json(userBeers);
            }

            case 'ADD_USER_BEER': {
                const userData = verifyUser(req);
                const { beerName, type, location, look, smell, taste, notes } = req.body;
                const newRow = [
                    new Date().toISOString().replace('T', ' ').substring(0, 19),
                    userData.name,
                    beerName, type, location, look, smell, taste, notes || '',
                    'Nem',
                    userData.email
                ];
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_BEERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] },
                });
                return res.status(201).json({ message: "Sör sikeresen hozzáadva!" });
            }

            // --- ÚJ: JELSZÓ VÁLTOZTATÁS ---
            case 'CHANGE_PASSWORD': {
                const userData = verifyUser(req);
                const { oldPassword, newPassword } = req.body;
                if (!oldPassword || !newPassword) return res.status(400).json({ error: "Minden mező kitöltése kötelező!" });

                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:C` });
                const allUsers = usersResponse.data.values || [];
                const userIndex = allUsers.findIndex(row => row[1] === userData.email);

                if (userIndex === -1) return res.status(404).json({ error: "Felhasználó nem található." });

                const userRow = allUsers[userIndex];
                const isPasswordValid = await bcrypt.compare(oldPassword, userRow[2]);
                if (!isPasswordValid) return res.status(401).json({ error: "A jelenlegi jelszó hibás." });

                const newHashedPassword = await bcrypt.hash(newPassword, 10);
                
                // A sor indexe 1-től kezdődik, ezért userIndex + 1
                const updateRange = `${USERS_SHEET}!C${userIndex + 1}`;

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newHashedPassword]] },
                });
                
                return res.status(200).json({ message: "Jelszó sikeresen módosítva!" });
            }
            
            // --- ÚJ: FELHASZNÁLÓI FIÓK TÖRLÉSE ---
            case 'DELETE_USER': {
                const userData = verifyUser(req);

                // 1. Felhasználói adatok és sörök lekérése
                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:C` });
                const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });

                const allUsers = usersResponse.data.values || [];
                const allBeers = beersResponse.data.values || [];
                
                // 2. Törlendő sorok azonosítása
                const remainingUsers = allUsers.filter(row => row[1] !== userData.email);
                const remainingBeers = allBeers.filter(row => row[10] !== userData.email); // Feltételezzük, az email a 11. oszlop (K)

                // 3. Munkalapok ürítése
                await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });

                // 4. Maradék adatok visszaírása (ha vannak)
                if (remainingUsers.length > 0) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: USERS_SHEET,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: remainingUsers },
                    });
                }
                if (remainingBeers.length > 0) {
                     await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: GUEST_BEERS_SHEET,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: remainingBeers },
                    });
                }

                return res.status(200).json({ message: "A fiókod és a hozzá tartozó minden adat sikeresen törölve." });
            }
            // --- ÚJ: FELHASZNÁLÓI RECAP GENERÁLÁS ---
        case 'GET_USER_RECAP': {
            const userData = verifyUser(req);
            const { period } = req.body; // 'weekly', 'monthly', 'quarterly', 'yearly'

            // 1. Dátumhatárok meghatározása
            const now = new Date();
            let startDate = new Date();
            switch (period) {
                case 'weekly':
                    startDate.setDate(now.getDate() - 7);
                    break;
                case 'monthly':
                    startDate.setMonth(now.getMonth() - 1);
                    break;
                case 'quarterly':
                    startDate.setMonth(now.getMonth() - 3);
                    break;
                case 'yearly':
                    startDate.setFullYear(now.getFullYear() - 1);
                    break;
                default:
                    return res.status(400).json({ error: "Érvénytelen időszak" });
            }

            // 2. Felhasználó összes sörének lekérése
            const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
            const userBeers = beersResponse.data.values
                ?.filter(row => row[10] === userData.email) // Email alapján szűrünk (K oszlop)
                .map(row => ({
                    date: new Date(row[0].replace(' ', 'T') + 'Z'), // Dátum objektummá alakítás (feltételezzük UTC)
                    beerName: row[2],
                    type: row[3] || 'N/A',
                    location: row[4] || 'N/A',
                    totalScore: parseFloat(row[9]) || 0,
                })) || [];

            // 3. Sörök szűrése az időszak alapján
            const filteredBeers = userBeers.filter(beer => beer.date >= startDate && beer.date <= now);

            if (filteredBeers.length === 0) {
                return res.status(200).json({ message: "Nincs értékelt sör ebben az időszakban." });
            }

            // 4. Statisztikák számítása
            const totalBeers = filteredBeers.length;
            const averageScore = (filteredBeers.reduce((sum, b) => sum + b.totalScore, 0) / totalBeers).toFixed(1);
            const bestBeer = filteredBeers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), filteredBeers[0]);

            const countOccurrences = (arr, key) => arr.reduce((acc, beer) => {
                const val = beer[key] || 'N/A';
                acc[val] = (acc[val] || 0) + 1;
                return acc;
            }, {});

            const typeCounts = countOccurrences(filteredBeers, 'type');
            const favoriteType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);

            const locationCounts = countOccurrences(filteredBeers, 'location');
            const favoriteLocation = Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b);

            // 5. Válasz küldése
            return res.status(200).json({
                totalBeers,
                averageScore,
                bestBeer: { name: bestBeer.beerName, score: bestBeer.totalScore },
                favoriteType,
                favoriteLocation,
            });
        }
        }

    } catch (error) {
        console.error("API hiba:", error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Érvénytelen vagy lejárt token. Jelentkezz be újra!" });
        }
        return res.status(500).json({ error: "Hiba a szerveroldali feldolgozás során.", details: error.message });
    }
}

