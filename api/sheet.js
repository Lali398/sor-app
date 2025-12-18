// api/sheet.js - Javított verzió
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// === KONFIGURÁCIÓ ===
const ADMIN_BEERS_SHEET = "'Sör táblázat'!A4:V";
const USERS_SHEET = 'Felhasználók'; 
const GUEST_BEERS_SHEET = 'Vendég Sör Teszt';
const GUEST_DRINKS_SHEET = 'Vendég ital teszt';
const IDEAS_SHEET = 'Vendég ötletek';
const SUPPORT_SHEET = 'Hibajelentések';

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
    if (req.method !== 'POST') return res.status(405).json({ error: `Method ${req.method} Not Allowed` });

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
                
                // Admin jelszó ellenőrzés (admin / sor)
                if (username !== 'admin' || password !== 'sor') {
                    return res.status(401).json({ error: 'Hibás admin felhasználónév vagy jelszó' });
                }
                
                // --- EZ A RÉSZ HIÁNYOZHATOTT VAGY VOLT HIBÁS ---
                // Admin token generálása
                const adminToken = jwt.sign(
                    { email: 'admin@sortablazat.hu', name: 'Admin', isAdmin: true }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '1d' }
                );
                // ------------------------------------------------

                // Adatok lekérése
                const sörökResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: ADMIN_BEERS_SHEET });
                const allRows = sörökResponse.data.values || [];
                const allBeers = [];
                
                allRows.forEach(row => {
                    const beer1 = transformRowToBeer(row, COL_INDEXES.admin1, 'admin1');
                    if (beer1) allBeers.push(beer1);
                    const beer2 = transformRowToBeer(row, COL_INDEXES.admin2, 'admin2');
                    if (beer2) allBeers.push(beer2);
                });
                
                // Visszaküldjük az adminToken-t is!
                return res.status(200).json({ beers: allBeers, users: [], adminToken: adminToken });
            }

            case 'REGISTER_USER': {
                const { name, email, password } = req.body;
                if (!name || !email || !password) return res.status(400).json({ error: "Minden mező kitöltése kötelező!" });
                
                // Jelszó ellenőrzés
                const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
                if (!passwordRegex.test(password)) {
                    return res.status(400).json({ 
                        error: "A jelszó nem megfelelő! (Min. 8 karakter, 1 szám és 1 speciális karakter szükséges)" 
                    });
                }

                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                const users = usersResponse.data.values || [];
                
                if (users.some(row => row[1] === email)) {
                    return res.status(409).json({ error: "Ez az e-mail cím már regisztrálva van." });
                }
            
                const hashedPassword = await bcrypt.hash(password, 10);
                
                // --- ÚJ RÉSZ: Recovery Key Generálás ---
                const recoveryKey = "KEY-" + Math.floor(100000 + Math.random() * 900000);
                // ---------------------------------------

                const defaultAchievements = { unlocked: [] };
                
                // Sorrend: A:Név, B:Email, C:Jelszó, D:2FA_Secret, E:2FA_Enabled, F:Achievements, G:Badge, H:RECOVERY_KEY
                // A H oszlop a 8. hely (index 7), ezért kell az üres stringek után
                const newRow = [
                    name, 
                    email, 
                    hashedPassword, 
                    '',      // D: 2FA Secret
                    'FALSE', // E: 2FA Enabled
                    JSON.stringify(defaultAchievements), // F: Achievements
                    '',      // G: Badge
                    recoveryKey // H: RECOVERY KEY (Ide mentjük!)
                ];

                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: USERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] },
                });
                
                // Visszaküldjük a kulcsot a frontendnek!
                return res.status(201).json({ 
                    message: "Sikeres regisztráció!",
                    recoveryKey: recoveryKey 
                });
            }

            // --- ÚJ: JELSZÓ HELYREÁLLÍTÁS KULCCSAL (Email helyett) ---
            case 'RESET_PASSWORD_WITH_KEY': {
                const { email, key, newPassword } = req.body;

                // 1. Felhasználók lekérése
                const usersResponse = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: USERS_SHEET 
                });
                const rows = usersResponse.data.values || [];
                
                // 2. Keresés Email és Kulcs alapján
                let targetRowIndex = -1;
                
                // A H oszlop az index 7 (0-tól számolva: A=0, ..., H=7)
                const userRow = rows.find((row, index) => {
                    if (row[1] === email && row[7] === key) { // row[1]=Email, row[7]=RecoveryKey
                        targetRowIndex = index; // Ez a tömb indexe
                        return true;
                    }
                    return false;
                });

                if (targetRowIndex === -1) {
                    return res.status(400).json({ error: "Hibás email cím vagy biztonsági kulcs!" });
                }

                // 3. Jelszó frissítése
                const newHashedPassword = await bcrypt.hash(newPassword, 10);
                
                // A Sheet sor száma = tömb index + 1 (ha nincs fejléc) vagy + 2?
                // Mivel a range az egész sheetet kéri, és feltételezzük, hogy az 1. sor a fejléc,
                // de a values.get visszaadja a fejlécet is (ha van).
                // Biztonságosabb megoldás: 'USERS_SHEET!C' + (targetRowIndex + 1)
                
                const rangeToUpdate = `${USERS_SHEET}!C${targetRowIndex + 1}`; // C oszlop a Jelszó

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: rangeToUpdate,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newHashedPassword]] },
                });

                return res.status(200).json({ message: "Jelszó sikeresen megváltoztatva!" });
            }
            
            case 'LOGIN_USER': {
    const { email, password } = req.body;
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:G` // Most már A-tól G-ig kérjük
    });
    
    const rows = usersResponse.data.values || [];
    const rowIndex = rows.findIndex(row => row[1] === email);
    
    if (rowIndex === -1) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
    
    const userRow = rows[rowIndex];
    const isPasswordValid = await bcrypt.compare(password, userRow[2]);
    if (!isPasswordValid) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });

    // 2FA ellenőrzés (E oszlop - index 4)
    const is2FAEnabled = userRow[4] === 'TRUE';

    if (is2FAEnabled) {
        return res.status(200).json({ 
            require2fa: true, 
            tempEmail: email
        });
    }
    
    // ÚJ: Achievements betöltése (F oszlop - index 5)
    let achievements = { unlocked: [] };
    try {
        if (userRow[5]) {
            achievements = JSON.parse(userRow[5]);
        }
    } catch (e) {
        console.warn("Achievements parse error:", e);
    }
    
    // ÚJ: Badge betöltése (G oszlop - index 6)
    const badge = userRow[6] || '';
    
    // Hagyományos belépés
    const user = { 
        name: userRow[0], 
        email: userRow[1], 
        has2FA: false,
        achievements: achievements, // ÚJ
        badge: badge // ÚJ
    };
    
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ token, user });
}
            case 'VERIFY_2FA_LOGIN': {
    const { email, token: inputToken } = req.body;
    
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:G` 
    });
    const rows = usersResponse.data.values || [];
    const userRow = rows.find(row => row[1] === email);

    if (!userRow) return res.status(401).json({ error: "Hiba az azonosításban." });

    const secret = userRow[3];
    const isValid = authenticator.check(inputToken, secret);

    if (!isValid) return res.status(401).json({ error: "Érvénytelen 2FA kód!" });

    // ÚJ: Achievements betöltése
    let achievements = { unlocked: [] };
    try {
        if (userRow[5]) {
            achievements = JSON.parse(userRow[5]);
        }
    } catch (e) {
        console.warn("Achievements parse error:", e);
    }
    
    const badge = userRow[6] || '';

    // Sikeres belépés
    const user = { 
        name: userRow[0], 
        email: userRow[1], 
        has2FA: true,
        achievements: achievements,
        badge: badge
    };
    
    const jwtToken = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ token: jwtToken, user });
}

            case 'MANAGE_2FA': {
                const userData = verifyUser(req);
                const { subAction, code, secret } = req.body; // subAction: 'GENERATE', 'ENABLE', 'DISABLE'

                if (subAction === 'GENERATE') {
                    const newSecret = authenticator.generateSecret();
                    const otpauth = authenticator.keyuri(userData.email, 'SorTablazat', newSecret);
                    const qrImageUrl = await QRCode.toDataURL(otpauth);
                    return res.status(200).json({ secret: newSecret, qrCode: qrImageUrl });
                }

                if (subAction === 'ENABLE') {
                    // Ellenőrizzük a kódot a mentés előtt
                    const isValid = authenticator.check(code, secret);
                    if (!isValid) return res.status(400).json({ error: "Hibás kód! Próbáld újra." });

                    // Mentés a Sheet-be
                    const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                    const rows = usersResponse.data.values || [];
                    const rowIndex = rows.findIndex(row => row[1] === userData.email);

                    if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található." });

                    // D és E oszlop frissítése (index 3 és 4)
                    // Megjegyzés: A sheets API update range-hez a sor indexét (rowIndex + 1) használjuk.
                    // A range pl: Felhasználók!D2:E2
                    const range = `${USERS_SHEET}!D${rowIndex + 1}:E${rowIndex + 1}`;
                    
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: range,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [[secret, 'TRUE']] }
                    });

                    return res.status(200).json({ message: "2FA sikeresen bekapcsolva!" });
                }

                if (subAction === 'DISABLE') {
                     // Kikapcsolás a Sheet-ben
                    const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                    const rows = usersResponse.data.values || [];
                    const rowIndex = rows.findIndex(row => row[1] === userData.email);

                    if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található." });

                    const range = `${USERS_SHEET}!D${rowIndex + 1}:E${rowIndex + 1}`;
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: range,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [['', 'FALSE']] } // Töröljük a kulcsot és FALSE
                    });

                    return res.status(200).json({ message: "2FA kikapcsolva." });
                }
                
                return res.status(400).json({ error: "Ismeretlen művelet." });
            }

case 'UPDATE_ACHIEVEMENTS': {
    const userData = verifyUser(req);
    const { achievements, badge } = req.body;
    
    // Validálás
    if (!achievements || typeof achievements !== 'object') {
        return res.status(400).json({ error: "Hibás achievements formátum!" });
    }
    
    // Users tábla lekérése
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:G` 
    });
    
    const rows = usersResponse.data.values || [];
    const rowIndex = rows.findIndex(row => row[1] === userData.email);
    
    if (rowIndex === -1) {
        return res.status(404).json({ error: "Felhasználó nem található." });
    }
    
    // JSON stringgé alakítás
    const achievementsJson = JSON.stringify(achievements);
    const badgeValue = badge || '';
    
    // F és G oszlop frissítése (index 5 és 6)
    const range = `${USERS_SHEET}!F${rowIndex + 1}:G${rowIndex + 1}`;
    
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[achievementsJson, badgeValue]] }
    });
    
    return res.status(200).json({ 
        message: "Achievements sikeresen mentve!",
        achievements: achievements,
        badge: badgeValue
    });
}

// 5. ÚJ (OPCIONÁLIS): GET_ACHIEVEMENTS - külön lekéréshez ha kell
case 'GET_ACHIEVEMENTS': {
    const userData = verifyUser(req);
    
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:G` 
    });
    
    const rows = usersResponse.data.values || [];
    const userRow = rows.find(row => row[1] === userData.email);
    
    if (!userRow) {
        return res.status(404).json({ error: "Felhasználó nem található." });
    }
    
    // Achievements és badge betöltése
    let achievements = { unlocked: [] };
    try {
        if (userRow[5]) {
            achievements = JSON.parse(userRow[5]);
        }
    } catch (e) {
        console.warn("Achievements parse error:", e);
    }
    
    const badge = userRow[6] || '';
    
    return res.status(200).json({ 
        achievements: achievements,
        badge: badge
    });
}
            
            case 'GET_USER_BEERS': {
                const userData = verifyUser(req);
                const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                const userBeers = beersResponse.data.values
                  ?.filter(row => row[13] === userData.email) 
                  .map(row => ({
                      date: row[0],
                      beerName: row[2],
                      
                      // JAVÍTOTT INDEXEK:
                      location: row[3],       // D oszlop (volt 4)
                      type: row[4],           // E oszlop (volt 3)
                      look: row[5] || 0,
                      smell: row[6] || 0,
                      taste: row[7] || 0,

                      beerPercentage: row[8] || 0, // I oszlop (volt 8)
                      totalScore: row[9] || 0,      // J oszlop (volt 9)
                      avg: row[10] || 0,             // K oszlop (volt 10)
                      
                      
                      notes: row[11] || ''
                  })) || [];
              return res.status(200).json(userBeers);
            }

            case 'ADD_USER_BEER': {
                const userData = verifyUser(req);
                const { beerName, type, location, beerPercentage, look, smell, taste, notes } = req.body;
                
                const numLook = parseFloat(look) || 0;
                const numSmell = parseFloat(smell) || 0;
                const numTaste = parseFloat(taste) || 0;
                const numPercentage = parseFloat(beerPercentage) || 0;
                
                const totalScore = numLook + numSmell + numTaste;
                const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
                
                // JAVÍTOTT SORREND:
                const newRow = [
                new Date().toISOString().replace('T', ' ').substring(0, 19), // A: Dátum
                userData.name,   // B: Név
                beerName,        // C: Sör neve
                location,        // D: Főzési hely
                type,            // E: Típus
                look,            // F: Külalak
                smell,           // G: Illat
                taste,           // H: Íz
                // --- ITT VAN A HIBA, EZT KELL CSERÉLNI: ---
                numPercentage,   // I: Alkohol % (Ide kerüljön a százalék!)
                totalScore,      // J: Összpontszám (Ide a pontszám!)
                avgScore,        // K: Átlag (Ide az átlag!)
                // ------------------------------------------
                notes || '',     // L: Jegyzetek
                'Nem',           // M: Jóváhagyva?
                userData.email   // N: Email
            ];
                
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_BEERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] },
                });
                return res.status(201).json({ message: "Sör sikeresen hozzáadva!" });
                return res.status(200).json([]);
            }

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
                const updateRange = `${USERS_SHEET}!C${userIndex + 1}`;

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newHashedPassword]] },
                });
                
                return res.status(200).json({ message: "Jelszó sikeresen módosítva!" });
            }


                case 'GET_USER_DRINKS': {
        const userData = verifyUser(req);
        const drinksResponse = await sheets.spreadsheets.values.get({ 
            spreadsheetId: SPREADSHEET_ID, 
            range: GUEST_DRINKS_SHEET 
        });
        const userDrinks = drinksResponse.data.values
            ?.filter(row => row[13] === userData.email) // N oszlop: Email
            .map(row => ({
                date: row[0],           // A: Dátum
                drinkName: row[2],      // C: Ital Neve
                category: row[3],       // D: Kategória
                type: row[4],           // E: Típus
                location: row[5],       // F: Hely
                drinkPercentage: row[6] || 0, // G: Alkohol %
                look: row[7] || 0,      // H: Külalak
                smell: row[8] || 0,     // I: Illat
                taste: row[9] || 0,     // J: Íz
                totalScore: row[10] || 0, // K: Összpontszám
                avg: row[11] || 0,      // L: Átlag
                notes: row[12] || ''    // M: Megjegyzés
            })) || [];
        return res.status(200).json(userDrinks);
    }
    
    case 'ADD_USER_DRINK': {
        const userData = verifyUser(req);
        const { drinkName, category, type, location, drinkPercentage, look, smell, taste, notes } = req.body;
        
        const numLook = parseFloat(look) || 0;
        const numSmell = parseFloat(smell) || 0;
        const numTaste = parseFloat(taste) || 0;
        const numPercentage = parseFloat(drinkPercentage) || 0;
        
        const totalScore = numLook + numSmell + numTaste;
        const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
        
        const newRow = [
            new Date().toISOString().replace('T', ' ').substring(0, 19), // A: Dátum
            userData.name,      // B: Beküldő Neve
            drinkName,          // C: Ital Neve
            category,           // D: Kategória
            type,               // E: Típus
            location,           // F: Hely
            numPercentage,      // G: Alkohol %
            look,               // H: Külalak
            smell,              // I: Illat
            taste,              // J: Íz
            totalScore,         // K: Összpontszám
            avgScore,           // L: Átlag
            notes || '',        // M: Megjegyzés
            userData.email      // N: Email
        ];
        
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: GUEST_DRINKS_SHEET,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [newRow] },
        });
        return res.status(201).json({ message: "Ital sikeresen hozzáadva!" });
    }

            case 'EDIT_USER_BEER': {
    const userData = verifyUser(req);
    const { index, beerName, type, location, beerPercentage, look, smell, taste, notes } = req.body;
    
    const beersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: GUEST_BEERS_SHEET 
    });
    
    const allRows = beersResponse.data.values || [];
    const userRows = allRows.filter(row => row[13] === userData.email);
    
    if (index < 0 || index >= userRows.length) {
        return res.status(400).json({ error: "Érvénytelen index" });
    }
    
    const targetRow = userRows[index];
    const globalIndex = allRows.indexOf(targetRow);
    
    const numLook = parseFloat(look) || 0;
    const numSmell = parseFloat(smell) || 0;
    const numTaste = parseFloat(taste) || 0;
    const numPercentage = parseFloat(beerPercentage) || 0;
    
    const totalScore = numLook + numSmell + numTaste;
    const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
    
    const updatedRow = [
    targetRow[0],    // A: Dátum
    userData.name,   // B: Név
    beerName,        // C: Sör neve
    location,        // D: Főzési hely
    type,            // E: Típus
    look,            // F: Külalak
    smell,           // G: Illat
    taste,           // H: Íz
    // --- ITT IS CSERÉLNI KELL: ---
    numPercentage,   // I: Alkohol % 
    totalScore,      // J: Összpontszám
    avgScore,        // J: Átlag
    // -----------------------------
    notes || '',     // L: Jegyzetek
    targetRow[12],   // M: Jóváhagyva?
    userData.email   // N: Email
];
    
    const range = `${GUEST_BEERS_SHEET}!A${globalIndex + 1}:N${globalIndex + 1}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [updatedRow] }
    });
    
    return res.status(200).json({ message: "Sör sikeresen módosítva!" });
}

case 'EDIT_USER_DRINK': {
    const userData = verifyUser(req);
    const { index, drinkName, category, type, location, drinkPercentage, look, smell, taste, notes } = req.body;
    
    const drinksResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: GUEST_DRINKS_SHEET 
    });
    
    const allRows = drinksResponse.data.values || [];
    const userRows = allRows.filter(row => row[13] === userData.email);
    
    if (index < 0 || index >= userRows.length) {
        return res.status(400).json({ error: "Érvénytelen index" });
    }
    
    const targetRow = userRows[index];
    const globalIndex = allRows.indexOf(targetRow);
    
    const numLook = parseFloat(look) || 0;
    const numSmell = parseFloat(smell) || 0;
    const numTaste = parseFloat(taste) || 0;
    const numPercentage = parseFloat(drinkPercentage) || 0;
    
    const totalScore = numLook + numSmell + numTaste;
    const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
    
    const updatedRow = [
        targetRow[0],       // A: Dátum (megtartjuk az eredetit)
        userData.name,      // B: Beküldő Neve
        drinkName,          // C: Ital Neve
        category,           // D: Kategória
        type,               // E: Típus
        location,           // F: Hely
        numPercentage,      // G: Alkohol %
        look,               // H: Külalak
        smell,              // I: Illat
        taste,              // J: Íz
        totalScore,         // K: Összpontszám
        avgScore,           // L: Átlag
        notes || '',        // M: Megjegyzés
        userData.email      // N: Email
    ];
    
    const range = `${GUEST_DRINKS_SHEET}!A${globalIndex + 1}:N${globalIndex + 1}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: range,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [updatedRow] }
    });
    
    return res.status(200).json({ message: "Ital sikeresen módosítva!" });
}

            // === ÖTLETAJÁNLÓ API ===
            
           case 'SUBMIT_IDEA': {
                const userData = verifyUser(req);
                const { ideaText, isAnonymous } = req.body;
                
                if (!ideaText || ideaText.trim() === '') {
                    return res.status(400).json({ error: "Az ötlet nem lehet üres!" });
                }
                
                const submitterName = isAnonymous ? 'Anonymous' : userData.name;
                const userEmail = isAnonymous ? 'Anonymous' : userData.email;
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const date = new Date().toLocaleDateString('hu-HU');
                
                // Sorrend: A:Beküldő, B:Ötlet, C:Időpont, D:Státusz, E:Dátum, F:Email
                const newRow = [
                    submitterName,           
                    ideaText,                
                    timestamp,               
                    'Megcsinálásra vár',     
                    date,                    
                    userEmail
                ];
                
                // Fontos: Itt a 'IDEAS_SHEET' változót használjuk, aminek a neve: 'Vendég ötletek'
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${IDEAS_SHEET}!A:F`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] }
                });
                
                return res.status(201).json({ message: "Köszönjük az ötleted! 💡" });
            }

            case 'SUBMIT_SUPPORT_TICKET': {
    // Ez a funkció NEM igényel bejelentkezést, de ha van token, használjuk
    let userData = null;
    try {
        userData = verifyUser(req);
    } catch (error) {
        // Nincs token vagy érvénytelen - ez OK, mert vendégek is használhatják
        console.log("Vendég felhasználó küldte a hibajelentést");
    }
    
    const { name, email, subject, message } = req.body;
    
    // Validálás
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: "Minden mező kitöltése kötelező!" });
    }
    
    // Email validáció
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Érvénytelen email cím!" });
    }
    
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const date = new Date().toLocaleDateString('hu-HU');
    
    // Google Sheets sor összeállítása
    // Oszlopok: A:Dátum, B:Beküldő Neve, C:Beküldő Email, D:Tárgy, E:Üzenet, F:Státusz
    const newRow = [
        date,           // A: Dátum
        name,           // B: Beküldő Neve
        email,          // C: Beküldő Email
        subject,        // D: Tárgy
        message,        // E: Üzenet
        'Új'            // F: Státusz (alapértelmezett: "Új")
    ];
    
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `Hibajelentések!A:F`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [newRow] }
    });
    
    return res.status(201).json({ 
        message: "Hibajelentésed sikeresen elküldve! Hamarosan válaszolunk az emaileden keresztül. 📧" 
    });
}
            case 'GET_ALL_IDEAS': {
                const userData = verifyUser(req);
                
                const ideasResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${IDEAS_SHEET}!A:F` 
                });
                
                const allRows = ideasResponse.data.values || [];
                
                // Átalakítás objektumokká
                // Fontos: Az 'index' paramétert mentjük el, ez a sor száma (0-tól kezdve)
                const ideas = allRows.map((row, index) => {
                    // Ha üres a sor, vagy ez a fejléc, akkor null-t adunk vissza (később kiszűrjük)
                    if (!row || row.length === 0) return null;
                    if (row[0] === 'Beküldő' || row[0] === 'Ki javasolta?') return null; // Fejléc szűrés

                    return {
                        index: index, // Ez kell majd a módosításhoz (pl. az 5. sor módosítása)
                        submitter: row[0] || 'Névtelen',
                        idea: row[1] || 'Nincs szöveg',
                        timestamp: row[2] || '',
                        status: row[3] || 'Megcsinálásra vár',
                        date: row[4] || '',
                        email: row[5] || ''
                    };
                }).filter(item => item !== null); // Kiszűrjük az üres sorokat és a fejlécet

                return res.status(200).json(ideas);
            }

            case 'UPDATE_IDEA_STATUS': {
                const userData = verifyUser(req);
                const { index, newStatus } = req.body;
                
                // Biztonsági ellenőrzés
                if (index === undefined || index === null) {
                    return res.status(400).json({ error: "Hiányzó index!" });
                }
                
                // Mivel a Google Sheets sorai 1-től kezdődnek, a tömb indexe pedig 0-tól,
                // és a map-elésnél az eredeti tömbindexet mentettük el:
                // Tömb index 0 = Sheet 1. sor (Fejléc)
                // Tömb index 1 = Sheet 2. sor (Első adat)
                // Tehát a helyes sor a Sheet-ben: index + 1
                
                const rowIndex = parseInt(index) + 1;
                const range = `${IDEAS_SHEET}!D${rowIndex}`; // D oszlop a Státusz
                
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newStatus]] }
                });
                
                return res.status(200).json({ message: "Státusz sikeresen frissítve! ✅" });
            }
            
            case 'DELETE_USER': {
                const userData = verifyUser(req);

                // 1. Felhasználói adatok és sörök lekérése
                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:C` });
                const beersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });

                const allUsers = usersResponse.data.values || [];
                const allBeers = beersResponse.data.values || [];
                
                // 2. Törlendő sorok azonosítása
                const remainingUsers = allUsers.filter(row => row[1] !== userData.email);
                // JAVÍTÁS: Az email a 13. oszlop (N oszlop, index: 13)
                const remainingBeers = allBeers.filter(row => row[13] !== userData.email);

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

            default:
                return res.status(400).json({ error: "Ismeretlen action." });
        }

    } catch (error) {
        console.error("API hiba:", error);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Érvénytelen vagy lejárt token. Jelentkezz be újra!" });
        }
        return res.status(500).json({ error: "Hiba a szerveroldali feldolgozás során.", details: error.message });
    }
}














