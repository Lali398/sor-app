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
const RECOMMENDATIONS_SHEET = 'Vendég sör ajánló';
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
        return res.status(400).json({ error: "A jelszó gyenge! (Min. 8 karakter, 1 szám, 1 spec. karakter)" });
    }

    const users = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
    const userExists = users.data.values?.some(row => row[1] === email);
    if (userExists) return res.status(409).json({ error: "Ez az e-mail cím már regisztrálva van." });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // --- ÚJ RÉSZ: Helyreállító kód generálás ---
    // Generálunk egy véletlenszerű 8 karakteres kódot
    const recoveryCode = Math.random().toString(36).slice(-8).toUpperCase();
    const hashedRecovery = await bcrypt.hash(recoveryCode, 10); // Ezt is titkosítva mentjük!
    // -------------------------------------------

    const defaultAchievements = { unlocked: [] };
    
    // A táblázatba beírjuk a recovery hash-t is a H oszlopba (index 7)
    await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: USERS_SHEET,
        valueInputOption: 'USER_ENTERED',
        // Figyeld a végét: hashedRecovery hozzáadva
        resource: { values: [[name, email, hashedPassword, '', 'FALSE', JSON.stringify(defaultAchievements), '', hashedRecovery]] },
    });

    // Visszaküldjük a kódot a felhasználónak (csak most látja utoljára!)
    return res.status(201).json({ 
        message: "Sikeres regisztráció!", 
        recoveryCode: recoveryCode 
    });
}

            case 'RESET_PASSWORD': {
    const { email, recoveryCode, newPassword } = req.body;
    if (!email || !recoveryCode || !newPassword) return res.status(400).json({ error: "Hiányzó adatok!" });

    // 1. Felhasználó megkeresése
    const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:H` });
    const rows = usersResponse.data.values || [];
    const rowIndex = rows.findIndex(row => row[1] === email); // 1-es index az email

    if (rowIndex === -1) return res.status(404).json({ error: "Nincs ilyen felhasználó." });

    const userRow = rows[rowIndex];
    const storedRecoveryHash = userRow[7]; // H oszlop (index 7) a recovery kód

    if (!storedRecoveryHash) return res.status(400).json({ error: "Ehhez a fiókhoz nincs beállítva helyreállító kód." });

    // 2. Kód ellenőrzése
    const isCodeValid = await bcrypt.compare(recoveryCode, storedRecoveryHash);
    if (!isCodeValid) return res.status(401).json({ error: "Hibás helyreállító kód!" });

    // 3. Új jelszó mentése
    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Jelszó frissítése (C oszlop - index 2)
    const updateRange = `${USERS_SHEET}!C${rowIndex + 1}`;
    await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [[newHashedPassword]] },
    });

    return res.status(200).json({ message: "Jelszó sikeresen megváltoztatva! Most már beléphetsz." });
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
                
                // 1. Ötletek lekérése
                const ideasResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${IDEAS_SHEET}!A:F` 
                });
                
                // 2. Felhasználók lekérése (hogy tudjuk a rangokat)
                const usersResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${USERS_SHEET}!A:G` // G oszlop a Badge
                });
                
                const allRows = ideasResponse.data.values || [];
                const allUsers = usersResponse.data.values || [];

                // Csinálunk egy gyors keresőtáblát: Email -> Badge
                // userRow[1] az email, userRow[6] a badge (G oszlop)
                const userBadges = {};
                allUsers.forEach(row => {
                    if (row[1] && row[6]) {
                        userBadges[row[1]] = row[6];
                    }
                });
                
                // Átalakítás objektumokká + Badge hozzáadása
                const ideas = allRows.map((row, index) => {
                    if (!row || row.length === 0) return null;
                    if (row[0] === 'Beküldő' || row[0] === 'Ki javasolta?') return null;

                    const submitterEmail = row[5] || '';
                    const submitterName = row[0] || 'Névtelen';
                    
                    // Megnézzük, van-e badge ehhez az emailhez
                    // Ha a név "Anonymous", akkor semmiképp ne legyen badge
                    let badge = '';
                    if (submitterName !== 'Anonymous' && userBadges[submitterEmail]) {
                        badge = userBadges[submitterEmail];
                    }

                    return {
                        index: index,
                        submitter: submitterName,
                        idea: row[1] || 'Nincs szöveg',
                        timestamp: row[2] || '',
                        status: row[3] || 'Megcsinálásra vár',
                        date: row[4] || '',
                        email: submitterEmail,
                        badge: badge // <--- ITT ADJUK HOZZÁ
                    };
                }).filter(item => item !== null);

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
            case 'ADD_RECOMMENDATION': {
                const userData = verifyUser(req);
                // Bővítettük: category paraméter is jön
                const { itemName, itemType, category, description, isAnonymous } = req.body;

                if (!itemName || !itemType) return res.status(400).json({ error: "Név és típus kötelező!" });
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                
                // Oszlopok: A:Dátum, B:Név, C:Email, D:Tétel, E:Típus, F:Leírás, G:Anonim, H:Kategória, I:Módosítva
                const newRow = [
                    timestamp,
                    userData.name,
                    userData.email,
                    itemName,
                    itemType,
                    description || '',
                    isAnonymous ? 'TRUE' : 'FALSE',
                    category || 'Egyéb', // H oszlop: Kategória
                    'FALSE'              // I oszlop: Módosítva (alapból nem)
                ];

                // A range-et bővítettük A:I-re
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${RECOMMENDATIONS_SHEET}!A:I`,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] }
                });

                return res.status(201).json({ message: "Ajánlás sikeresen beküldve! 📢" });
            }

            case 'GET_RECOMMENDATIONS': {
                const userData = verifyUser(req);
                // Lekérjük az A:I tartományt (Kategória és Módosítva is kell)
                const recResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${RECOMMENDATIONS_SHEET}!A:I`
                });
                const usersResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${USERS_SHEET}!A:G`
                });

                const allRows = recResponse.data.values || [];
                const allUsers = usersResponse.data.values || [];
                
                const userBadges = {};
                allUsers.forEach(row => {
                    if (row[1] && row[6]) userBadges[row[1]] = row[6];
                });

                const recommendations = allRows.map((row, index) => {
                    if (index === 0) return null; 
                    if (!row || row.length === 0) return null;

                    const isAnon = row[6] === 'TRUE';
                    const email = row[2];
                    
                    let displayName = isAnon ? 'Anonymus 🕵️' : (row[1] || 'Ismeretlen');
                    let displayBadge = isAnon ? '' : (userBadges[email] || '');

                    // Ellenőrizzük, hogy a jelenlegi user-e a tulajdonos (a szerkesztés gombhoz)
                    const isMine = (email === userData.email);

                    return {
                        originalIndex: index, // Fontos a szerkesztéshez! (Ez a sor száma - 1)
                        date: row[0] ? row[0].substring(0, 10) : '',
                        submitter: displayName,
                        email: email, // Kliens oldalon is kellhet az ellenőrzéshez
                        badge: displayBadge,
                        itemName: row[3],
                        type: row[4],
                        description: row[5] || '',
                        isAnon: isAnon,
                        category: row[7] || 'Egyéb', // Kategória
                        isEdited: row[8] === 'TRUE', // Módosítva flag
                        isMine: isMine // Saját-e?
                    };
                }).filter(item => item !== null).reverse();

                return res.status(200).json(recommendations);
            }

            case 'EDIT_RECOMMENDATION': {
                const userData = verifyUser(req);
                const { originalIndex, itemName, itemType, category, description, isAnonymous } = req.body;
                
                // 1. Lekérjük az adott sort ellenőrzésre
                // A sheet sor indexe: originalIndex + 1 (mert a tömb 0-tól indul, sheet 1-től)
                const rowIndex = parseInt(originalIndex) + 1;
                const rangeCheck = `${RECOMMENDATIONS_SHEET}!C${rowIndex}`; // C oszlop az Email
                
                const checkResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: rangeCheck
                });
                
                const ownerEmail = checkResponse.data.values ? checkResponse.data.values[0][0] : null;

                // Biztonsági ellenőrzés: Csak a sajátját szerkesztheti!
                if (ownerEmail !== userData.email) {
                    return res.status(403).json({ error: "Csak a saját ajánlásodat módosíthatod!" });
                }

                // 2. Frissítés
                // Oszlopok, amiket írunk: D(ItemName), E(Type), F(Desc), G(Anon), H(Cat), I(Edited)
                const updateRange = `${RECOMMENDATIONS_SHEET}!D${rowIndex}:I${rowIndex}`;
                const newValues = [
                    itemName,
                    itemType,
                    description,
                    isAnonymous ? 'TRUE' : 'FALSE',
                    category,
                    'TRUE' // I oszlop: Módosítva flag BEÁLLÍTÁSA
                ];

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newValues] }
                });

                return res.status(200).json({ message: "Ajánlás sikeresen módosítva!" });
            }

                 // === TÖRLÉSI FUNKCIÓK ===
                
                case 'DELETE_USER_BEER': {
                    const userData = verifyUser(req);
                    const { index } = req.body;
                    
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
                    
                    // Töröljük a sort: minden sor marad, kivéve a célt
                    const cleanRows = allRows.filter((_, idx) => idx !== globalIndex);
                    
                    // Frissítjük a Sheet-et
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: GUEST_BEERS_SHEET 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: GUEST_BEERS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Sör sikeresen törölve!" });
                }
                
                case 'DELETE_USER_DRINK': {
                    const userData = verifyUser(req);
                    const { index } = req.body;
                    
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
                    
                    const cleanRows = allRows.filter((_, idx) => idx !== globalIndex);
                    
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: GUEST_DRINKS_SHEET 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: GUEST_DRINKS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Ital sikeresen törölve!" });
                }
                
                case 'DELETE_USER_IDEA': {
                    const userData = verifyUser(req);
                    const { index } = req.body;
                    
                    const ideasResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${IDEAS_SHEET}!A:F`
                    });
                    
                    const allRows = ideasResponse.data.values || [];
                    
                    // Csak azokat az ötleteket nézzük, amik a useré ÉS még nem készek
                    const userPendingIdeas = allRows
                        .map((row, idx) => ({ row, originalIndex: idx }))
                        .filter(item => {
                            if (item.originalIndex === 0) return false; // Fejléc
                            const row = item.row;
                            return row[5] === userData.email && row[3] !== 'Megcsinálva';
                        });
                    
                    if (index < 0 || index >= userPendingIdeas.length) {
                        return res.status(400).json({ error: "Érvénytelen index vagy már nem törölhető!" });
                    }
                    
                    const targetOriginalIndex = userPendingIdeas[index].originalIndex;
                    const cleanRows = allRows.filter((_, idx) => idx !== targetOriginalIndex);
                    
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: `${IDEAS_SHEET}!A:F` 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${IDEAS_SHEET}!A:F`,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Ötlet sikeresen törölve!" });
                }
                
                case 'DELETE_USER_RECOMMENDATION': {
                    const userData = verifyUser(req);
                    const { originalIndex } = req.body;
                    
                    // Ellenőrizzük, hogy a sajátja-e
                    const rowIndex = parseInt(originalIndex) + 1;
                    const rangeCheck = `${RECOMMENDATIONS_SHEET}!C${rowIndex}`;
                    
                    const checkResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: rangeCheck
                    });
                    
                    const ownerEmail = checkResponse.data.values ? checkResponse.data.values[0][0] : null;
                    
                    if (ownerEmail !== userData.email) {
                        return res.status(403).json({ error: "Csak a saját ajánlásodat törölheted!" });
                    }
                    
                    // Törlés
                    const recResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${RECOMMENDATIONS_SHEET}!A:I`
                    });
                    
                    const allRows = recResponse.data.values || [];
                    const cleanRows = allRows.filter((_, idx) => idx !== originalIndex);
                    
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: `${RECOMMENDATIONS_SHEET}!A:I` 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${RECOMMENDATIONS_SHEET}!A:I`,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Ajánlás sikeresen törölve!" });
                }
            
            case 'DELETE_USER': {
                const userData = verifyUser(req);
                const userEmail = userData.email;

                try {
                    // --- 1. FELHASZNÁLÓ TÖRLÉSE (USERS_SHEET) ---
                    // Ez a lépés hiányzott vagy volt hibás!
                    const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                    const allUsers = usersRes.data.values || [];
                    
                    // A fejléc (index 0) marad, és azok a sorok, ahol a 2. oszlop (index 1) NEM az email
                    const cleanUsers = allUsers.filter((row, index) => {
                        if (index === 0) return true; 
                        return row[1] !== userEmail; 
                    });

                    // Ha találtunk és töröltünk felhasználót, frissítjük a táblát
                    if (cleanUsers.length !== allUsers.length) {
                        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: USERS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanUsers }
                        });
                    }

                    // --- 2. SÖRÖK TÖRLÉSE (GUEST_BEERS_SHEET) ---
                    const beersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                    const allBeers = beersRes.data.values || [];
                    
                    // Itt a 14. oszlop (index 13) az email cím
                    const cleanBeers = allBeers.filter((row, index) => {
                        if (index === 0) return true;
                        return row[13] !== userEmail; 
                    });

                    if (cleanBeers.length !== allBeers.length) {
                        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: GUEST_BEERS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanBeers }
                        });
                    }

                    // --- 3. ITALOK TÖRLÉSE (GUEST_DRINKS_SHEET) ---
                    const drinksRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_DRINKS_SHEET });
                    const allDrinks = drinksRes.data.values || [];
                    
                    // Itt is a 14. oszlop (index 13) az email cím
                    const cleanDrinks = allDrinks.filter((row, index) => {
                        if (index === 0) return true;
                        return row[13] !== userEmail;
                    });

                    if (cleanDrinks.length !== allDrinks.length) {
                        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: GUEST_DRINKS_SHEET });
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: GUEST_DRINKS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanDrinks }
                        });
                    }
                    
                   // --- 4. ÖTLETEK TÖRLÉSE (IDEAS_SHEET) ---
                    const ideasRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: IDEAS_SHEET });
                    const allIdeas = ideasRes.data.values || [];

                    const cleanIdeas = allIdeas.filter((row, index) => {
                        if (index === 0) return true; 
                        return row[5] !== userEmail; // 5-ös index az email
                    });

                    if (cleanIdeas.length !== allIdeas.length) {
                        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: IDEAS_SHEET });
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: IDEAS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanIdeas }
                        });
                    }

                    return res.status(200).json({ message: "Fiók, adatok és ötletek sikeresen törölve." });

                } catch (error) {
                    console.error("Törlési hiba:", error);
                    return res.status(500).json({ error: "Hiba történt a fiók törlése közben." });
                }
            } // DELETE_USER vége

            default:
                return res.status(400).json({ error: "Ismeretlen művelet." });
        } // Switch vége

    } catch (error) {
        console.error("API Hiba:", error);
        return res.status(500).json({ error: "Kritikus szerverhiba: " + error.message });
    }
} // Handler vége



















