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
                // Regex: legalább 1 szám, legalább 1 spec. karakter, min 8 hossz
                const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
                
                if (!passwordRegex.test(password)) {
                    return res.status(400).json({ 
                        error: "A jelszó nem megfelelő! (Min. 8 karakter, 1 szám és 1 speciális karakter szükséges)" 
                    });
                }
              

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
                
                // Megkeressük a sort, ahol az email egyezik
                const rows = usersResponse.data.values || [];
                const rowIndex = rows.findIndex(row => row[1] === email);
                
                if (rowIndex === -1) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
                
                const userRow = rows[rowIndex];
                const isPasswordValid = await bcrypt.compare(password, userRow[2]);
                if (!isPasswordValid) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });

                // 2FA ELLENŐRZÉS (E oszlop - index 4)
                const is2FAEnabled = userRow[4] === 'TRUE';

                if (is2FAEnabled) {
                    // Ha be van kapcsolva, NEM adunk tokent, csak jelezzük a kliensnek
                    return res.status(200).json({ 
                        require2fa: true, 
                        tempEmail: email // Ezt visszaküldjük, hogy a kliens tudja kinek kell a kódot küldeni
                    });
                }
                
                // Hagyományos belépés
                const user = { name: userRow[0], email: userRow[1], has2FA: false };
                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
                return res.status(200).json({ token, user });
            }

            case 'VERIFY_2FA_LOGIN': {
                const { email, token: inputToken } = req.body;
                
                const usersResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                const rows = usersResponse.data.values || [];
                const userRow = rows.find(row => row[1] === email);

                if (!userRow) return res.status(401).json({ error: "Hiba az azonosításban." });

                const secret = userRow[3]; // D oszlop: Secret
                
                // Kód ellenőrzése
                const isValid = authenticator.check(inputToken, secret);

                if (!isValid) return res.status(401).json({ error: "Érvénytelen 2FA kód!" });

                // Sikeres belépés
                const user = { name: userRow[0], email: userRow[1], has2FA: true };
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
                const avgScore = (totalScore / 3).toFixed(1).replace('.', ',');
                
                // JAVÍTOTT SORREND:
                const newRow = [
                    new Date().toISOString().replace('T', ' ').substring(0, 19), // A: Dátum
                    userData.name,   // B: Név
                    beerName,        // C: Sör neve
                    location,        // D: Főzési hely (Megcserélve a típussal)
                    type,            // E: Típus
                    look,            // F: Külalak
                    smell,           // G: Illat
                    taste,           // H: Íz
                    totalScore,      // I: Összpontszám (Alkohol % helyett)
                    avgScore,        // J: Átlag (Összpontszám helyett)
                    numPercentage,   // K: Alkohol % (Átlag helyett)
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
        const avgScore = (totalScore / 3).toFixed(1).replace('.', ',');
        
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
    const avgScore = (totalScore / 3).toFixed(1).replace('.', ',');
    
    const updatedRow = [
        targetRow[0],       // A: Dátum (megtartjuk az eredetit)
        userData.name,      // B: Név
        beerName,           // C: Sör neve
        location,           // D: Főzési hely
        type,               // E: Típus
        look,               // F: Külalak
        smell,              // G: Illat
        taste,              // H: Íz
        totalScore,         // I: Összpontszám
        avgScore,           // J: Átlag
        numPercentage,      // K: Alkohol %
        notes || '',        // L: Jegyzetek
        targetRow[12],      // M: Jóváhagyva?
        userData.email      // N: Email
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
    const avgScore = (totalScore / 3).toFixed(1).replace('.', ',');
    
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
// api/sheet.js - Achievement funkciók hozzáadása

// === ACHIEVEMENT KONFIGURÁCIÓK ===
const ACHIEVEMENTS_SHEET = 'VendÃ©g Achievement-ek';

const ACHIEVEMENT_DEFINITIONS = [
    // === MENNYISÉG ALAPJÁN ===
    { id: 'first_beer', name: 'Első korty', desc: 'Értékelj 1 sört', icon: '🍺', points: 10, category: 'mennyiseg' },
    { id: 'beer_5', name: 'Kezdő kóstoló', desc: '5 sör értékelve', icon: '🍻', points: 20, category: 'mennyiseg' },
    { id: 'beer_10', name: 'Rajongó', desc: '10 sör értékelve', icon: '🏅', points: 30, category: 'mennyiseg' },
    { id: 'beer_25', name: 'Sörfürdő', desc: '25 sör értékelve', icon: '🎯', points: 50, category: 'mennyiseg' },
    { id: 'beer_50', name: 'Félszáz!', desc: '50 sör értékelve', icon: '💯', points: 75, category: 'mennyiseg' },
    { id: 'beer_100', name: 'Centurió', desc: '100 sör értékelve', icon: '👑', points: 100, category: 'mennyiseg' },
    { id: 'beer_250', name: 'Sörmilliárdos', desc: '250 sör értékelve', icon: '🌟', points: 150, category: 'mennyiseg' },
    
    // === PONTSZÁM ALAPJÁN ===
    { id: 'first_10', name: 'Tökéletes!', desc: 'Első 10 pontos értékelés', icon: '⭐', points: 25, category: 'pontszam' },
    { id: 'five_9plus', name: 'Válogatós', desc: '5 db 9+ pontszámú sör', icon: '🎖️', points: 40, category: 'pontszam' },
    { id: 'ten_9plus', name: 'Minőség bajnok', desc: '10 db 9+ pontszámú sör', icon: '🏆', points: 60, category: 'pontszam' },
    { id: 'perfect_streak', name: 'Csúcsforma', desc: '3 egymást követő 10 pontos', icon: '🔥', points: 50, category: 'pontszam' },
    { id: 'avg_8plus', name: 'Magas mérce', desc: 'Átlagod 8+ pont', icon: '📈', points: 70, category: 'pontszam' },
    { id: 'avg_9plus', name: 'Elit', desc: 'Átlagod 9+ pont', icon: '💎', points: 100, category: 'pontszam' },
    
    // === TÍPUSOK ALAPJÁN ===
    { id: 'type_3', name: 'Nyitott szemmel', desc: '3 különböző típus', icon: '🎨', points: 20, category: 'tipus' },
    { id: 'type_5', name: 'Kalandvágyó', desc: '5 különböző típus', icon: '🗺️', points: 30, category: 'tipus' },
    { id: 'type_10', name: 'Világutazó', desc: '10 különböző típus', icon: '🌍', points: 50, category: 'tipus' },
    { id: 'type_15', name: 'Univerzális', desc: '15 különböző típus', icon: '🌌', points: 80, category: 'tipus' },
    { id: 'ipa_lover', name: 'IPA Fanatikus', desc: '10 db IPA értékelve', icon: '🍃', points: 40, category: 'tipus' },
    { id: 'lager_king', name: 'Lager Király', desc: '10 db Lager értékelve', icon: '👑', points: 40, category: 'tipus' },
    { id: 'stout_master', name: 'Stout Mester', desc: '10 db Stout/Porter értékelve', icon: '⚫', points: 50, category: 'tipus' },
    
    // === HELYEK ALAPJÁN ===
    { id: 'place_3', name: 'Körbejáró', desc: '3 különböző hely', icon: '🚶', points: 20, category: 'helyek' },
    { id: 'place_5', name: 'Felfedező', desc: '5 különböző hely', icon: '🧭', points: 30, category: 'helyek' },
    { id: 'place_10', name: 'Térkép Úr', desc: '10 különböző hely', icon: '📍', points: 50, category: 'helyek' },
    { id: 'place_20', name: 'Világjáró', desc: '20 különböző hely', icon: '✈️', points: 80, category: 'helyek' },
    { id: 'local_hero', name: 'Törzsvendég', desc: '20 sör ugyanarról a helyről', icon: '🏠', points: 60, category: 'helyek' },
    
    // === IDŐPONT ALAPJÁN ===
    { id: 'early_bird', name: 'Korai madár', desc: 'Reggel 6-9 között értékelés', icon: '🌅', points: 30, category: 'ido' },
    { id: 'lunch_lover', name: 'Ebédidő', desc: 'Délben 12-14 között értékelés', icon: '☀️', points: 20, category: 'ido' },
    { id: 'happy_hour', name: 'Happy Hour', desc: '17-19 között értékelés', icon: '🌆', points: 20, category: 'ido' },
    { id: 'night_owl', name: 'Éjszakai bagoly', desc: 'Éjjel 22-24 között értékelés', icon: '🌙', points: 30, category: 'ido' },
    { id: 'midnight_brewer', name: 'Éjféli kóstoló', desc: 'Éjfél után értékelés', icon: '🌃', points: 40, category: 'ido' },
    
    // === SOROZATOK ===
    { id: 'streak_3', name: '3 napos széria', desc: '3 egymást követő nap', icon: '📅', points: 30, category: 'sorozat' },
    { id: 'streak_7', name: 'Heti bajnok', desc: '7 egymást követő nap', icon: '🗓️', points: 50, category: 'sorozat' },
    { id: 'streak_14', name: 'Kéthetes menet', desc: '14 egymást követő nap', icon: '📆', points: 80, category: 'sorozat' },
    { id: 'streak_30', name: 'Havi legenda', desc: '30 egymást követő nap', icon: '🏅', points: 150, category: 'sorozat' },
    { id: 'daily_3', name: 'Napi rutin', desc: '3 sör egy napon belül', icon: '🔄', points: 25, category: 'sorozat' },
    { id: 'weekend_warrior', name: 'Hétvégi harcos', desc: '5 sör hétvégén', icon: '🎉', points: 35, category: 'sorozat' },
    
    // === KÜLÖNLEGES ===
    { id: 'worst_beer', name: 'Bátorság próba', desc: 'Adj 3 pont alatti értékelést', icon: '💀', points: 15, category: 'kulonleges' },
    { id: 'honest_critic', name: 'Őszinte kritikus', desc: '5 db 5 pont alatti értékelés', icon: '📝', points: 30, category: 'kulonleges' },
    { id: 'high_standard', name: 'Magaslat', desc: '10 db 8+ pontos értékelés', icon: '🎯', points: 50, category: 'kulonleges' },
    { id: 'first_note', name: 'Jegyzetelő', desc: 'Első jegyzet hozzáadása', icon: '📖', points: 10, category: 'kulonleges' },
    { id: 'detailed_notes', name: 'Részletező', desc: '10 részletes jegyzet (50+ karakter)', icon: '✍️', points: 40, category: 'kulonleges' },
    { id: 'strong_beer', name: 'Erős ital', desc: 'Értékelj 8%+ alkoholos sört', icon: '💪', points: 25, category: 'kulonleges' },
    { id: 'light_beer', name: 'Könnyű fuvallat', desc: 'Értékelj 3% alatti sört', icon: '🌬️', points: 20, category: 'kulonleges' },
    { id: 'speed_demon', name: 'Gyors kóstoló', desc: '5 értékelés 1 órán belül', icon: '⚡', points: 35, category: 'kulonleges' },
    { id: 'balanced', name: 'Kiegyensúlyozott', desc: 'Külalak, illat, íz mind 8+', icon: '⚖️', points: 45, category: 'kulonleges' },
    { id: 'triple_threat', name: 'Tripla veszély', desc: '3 különböző sör ugyanazon a napon', icon: '🎲', points: 30, category: 'kulonleges' },
    
    // === KÖZÖSSÉGI ===
    { id: 'idea_submit', name: 'Ötletadó', desc: 'Küldd be első ötleted', icon: '💡', points: 15, category: 'kozossegi' },
    { id: 'support_hero', name: 'Segítőkész', desc: 'Küldj be támogatási kérést', icon: '🆘', points: 10, category: 'kozossegi' },
    { id: 'early_adopter', name: 'Korai felhasználó', desc: 'Regisztráltál az első 100 között', icon: '🎖️', points: 50, category: 'kozossegi' },
];

// SZINTRENDSZER (Badge-ek)
const LEVEL_SYSTEM = [
    { minAchievements: 0, maxAchievements: 5, name: 'Újoncpohár', badge: '🍺', color: '#94a3b8' },
    { minAchievements: 6, maxAchievements: 10, name: 'Korsós', badge: '🍻', color: '#60a5fa' },
    { minAchievements: 11, maxAchievements: 20, name: 'Mester', badge: '🏆', color: '#f59e0b' },
    { minAchievements: 21, maxAchievements: 35, name: 'Sörkirály', badge: '👑', color: '#8b5cf6' },
    { minAchievements: 36, maxAchievements: 50, name: 'Sörimádó', badge: '⭐', color: '#ef4444' },
];

// === ACHIEVEMENT ELLENŐRZŐ FUNKCIÓK ===

function checkAchievements(userBeers, userDrinks, userData) {
    const unlocked = [];
    const totalBeers = userBeers.length;
    
    // MENNYISÉG
    if (totalBeers >= 1 && !hasAchievement('first_beer', userData.achievements)) unlocked.push('first_beer');
    if (totalBeers >= 5) unlocked.push('beer_5');
    if (totalBeers >= 10) unlocked.push('beer_10');
    if (totalBeers >= 25) unlocked.push('beer_25');
    if (totalBeers >= 50) unlocked.push('beer_50');
    if (totalBeers >= 100) unlocked.push('beer_100');
    if (totalBeers >= 250) unlocked.push('beer_250');
    
    // PONTSZÁMOK
    const perfect10 = userBeers.filter(b => parseFloat(b.totalScore) === 30).length;
    const nines = userBeers.filter(b => parseFloat(b.avg) >= 9).length;
    const eights = userBeers.filter(b => parseFloat(b.avg) >= 8).length;
    
    if (perfect10 >= 1) unlocked.push('first_10');
    if (nines >= 5) unlocked.push('five_9plus');
    if (nines >= 10) unlocked.push('ten_9plus');
    if (eights >= 10) unlocked.push('high_standard');
    
    // ÁTLAG
    if (totalBeers >= 5) {
        const avgScore = userBeers.reduce((sum, b) => sum + parseFloat(b.avg || 0), 0) / totalBeers;
        if (avgScore >= 8) unlocked.push('avg_8plus');
        if (avgScore >= 9) unlocked.push('avg_9plus');
    }
    
    // TÍPUSOK
    const uniqueTypes = new Set(userBeers.map(b => b.type).filter(Boolean));
    if (uniqueTypes.size >= 3) unlocked.push('type_3');
    if (uniqueTypes.size >= 5) unlocked.push('type_5');
    if (uniqueTypes.size >= 10) unlocked.push('type_10');
    if (uniqueTypes.size >= 15) unlocked.push('type_15');
    
    // SPECIFIKUS TÍPUSOK
    const ipaCount = userBeers.filter(b => b.type && b.type.toLowerCase().includes('ipa')).length;
    const lagerCount = userBeers.filter(b => b.type && b.type.toLowerCase().includes('lager')).length;
    const stoutCount = userBeers.filter(b => b.type && (b.type.toLowerCase().includes('stout') || b.type.toLowerCase().includes('porter'))).length;
    
    if (ipaCount >= 10) unlocked.push('ipa_lover');
    if (lagerCount >= 10) unlocked.push('lager_king');
    if (stoutCount >= 10) unlocked.push('stout_master');
    
    // HELYEK
    const uniquePlaces = new Set(userBeers.map(b => b.location).filter(Boolean));
    if (uniquePlaces.size >= 3) unlocked.push('place_3');
    if (uniquePlaces.size >= 5) unlocked.push('place_5');
    if (uniquePlaces.size >= 10) unlocked.push('place_10');
    if (uniquePlaces.size >= 20) unlocked.push('place_20');
    
    // HELYEK - TÖRZSVENDÉG
    const placeCounts = {};
    userBeers.forEach(b => {
        if (b.location) placeCounts[b.location] = (placeCounts[b.location] || 0) + 1;
    });
    if (Object.values(placeCounts).some(count => count >= 20)) unlocked.push('local_hero');
    
    // IDŐPONTOK
    userBeers.forEach(beer => {
        if (!beer.date) return;
        const hour = new Date(beer.date).getHours();
        if (hour >= 6 && hour < 9) unlocked.push('early_bird');
        if (hour >= 12 && hour < 14) unlocked.push('lunch_lover');
        if (hour >= 17 && hour < 19) unlocked.push('happy_hour');
        if (hour >= 22 && hour < 24) unlocked.push('night_owl');
        if (hour >= 0 && hour < 6) unlocked.push('midnight_brewer');
    });
    
    // KÜLÖNLEGES
    const lowScores = userBeers.filter(b => parseFloat(b.totalScore) < 9).length; // 3 pont alatti (0-3-3-3)
    const badBeers = userBeers.filter(b => parseFloat(b.avg) < 5).length;
    
    if (lowScores >= 1) unlocked.push('worst_beer');
    if (badBeers >= 5) unlocked.push('honest_critic');
    
    const hasNotes = userBeers.filter(b => b.notes && b.notes.length > 0).length;
    const detailedNotes = userBeers.filter(b => b.notes && b.notes.length > 50).length;
    
    if (hasNotes >= 1) unlocked.push('first_note');
    if (detailedNotes >= 10) unlocked.push('detailed_notes');
    
    const strongBeers = userBeers.filter(b => parseFloat(b.beerPercentage) >= 8).length;
    const lightBeers = userBeers.filter(b => parseFloat(b.beerPercentage) < 3).length;
    
    if (strongBeers >= 1) unlocked.push('strong_beer');
    if (lightBeers >= 1) unlocked.push('light_beer');
    
    // BALANCED (mind a 3 kategória 8+)
    const balanced = userBeers.filter(b => 
        parseFloat(b.look) >= 8 && 
        parseFloat(b.smell) >= 8 && 
        parseFloat(b.taste) >= 8
    ).length;
    if (balanced >= 1) unlocked.push('balanced');
    
    return [...new Set(unlocked)]; // Duplikációk eltávolítása
}

function hasAchievement(achievementId, userAchievements) {
    return userAchievements && userAchievements.includes(achievementId);
}

function calculateLevel(achievementCount) {
    for (const level of LEVEL_SYSTEM) {
        if (achievementCount >= level.minAchievements && achievementCount <= level.maxAchievements) {
            return level;
        }
    }
    return LEVEL_SYSTEM[LEVEL_SYSTEM.length - 1]; // Max szint
}

// === API ENDPOINT-OK ===

// Adja hozzá a handler switch-hez:

case 'GET_ACHIEVEMENTS': {
    const userData = verifyUser(req);
    
    // Felhasználó sörök és italok lekérése
    const beersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: GUEST_BEERS_SHEET 
    });
    const drinksResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: GUEST_DRINKS_SHEET 
    });
    
    const userBeers = beersResponse.data.values?.filter(row => row[13] === userData.email).map(row => ({
        date: row[0],
        beerName: row[2],
        location: row[3],
        type: row[4],
        look: row[5],
        smell: row[6],
        taste: row[7],
        beerPercentage: row[8],
        totalScore: row[9],
        avg: row[10],
        notes: row[11]
    })) || [];
    
    const userDrinks = drinksResponse.data.values?.filter(row => row[13] === userData.email) || [];
    
    // Felhasználó achievement-ek lekérése (Sheets-ből)
    const achResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${ACHIEVEMENTS_SHEET}!A:D`
    });
    
    const rows = achResponse.data.values || [];
    const userRow = rows.find(row => row[0] === userData.email);
    
    let unlockedIds = [];
    let selectedBadge = null;
    
    if (userRow) {
        unlockedIds = userRow[1] ? userRow[1].split(',') : [];
        selectedBadge = userRow[3] || null; // D oszlop
    }
    
    // Új achievement-ek ellenőrzése
    const newlyUnlocked = checkAchievements(userBeers, userDrinks, { achievements: unlockedIds });
    const allUnlocked = [...new Set([...unlockedIds, ...newlyUnlocked])];
    
    // Ha van új, mentsük el
    if (newlyUnlocked.length > 0) {
        if (!userRow) {
            // Új sor létrehozása
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: ACHIEVEMENTS_SHEET,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[userData.email, allUnlocked.join(','), new Date().toISOString(), '']] }
            });
        } else {
            // Meglévő sor frissítése
            const rowIndex = rows.indexOf(userRow) + 1;
            await sheets.spreadsheets.values.update({
                spreadsheetId: SPREADSHEET_ID,
                range: `${ACHIEVEMENTS_SHEET}!B${rowIndex}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [[allUnlocked.join(',')]] }
            });
        }
    }
    
    // Achievement-ek összeállítása teljes adatokkal
    const achievements = ACHIEVEMENT_DEFINITIONS.map(def => ({
        ...def,
        unlocked: allUnlocked.includes(def.id),
        isNew: newlyUnlocked.includes(def.id)
    }));
    
    const level = calculateLevel(allUnlocked.length);
    
    return res.status(200).json({
        achievements,
        level,
        unlockedCount: allUnlocked.length,
        totalCount: ACHIEVEMENT_DEFINITIONS.length,
        newlyUnlocked: newlyUnlocked.map(id => ACHIEVEMENT_DEFINITIONS.find(a => a.id === id)),
        selectedBadge: selectedBadge || level.badge
    });
}

case 'SET_SELECTED_BADGE': {
    const userData = verifyUser(req);
    const { badge } = req.body;
    
    const achResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${ACHIEVEMENTS_SHEET}!A:D`
    });
    
    const rows = achResponse.data.values || [];
    const userRow = rows.find(row => row[0] === userData.email);
    
    if (!userRow) {
        // Ha még nincs sora, hozzuk létre
        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: ACHIEVEMENTS_SHEET,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[userData.email, '', new Date().toISOString(), badge]] }
        });
    } else {
        const rowIndex = rows.indexOf(userRow) + 1;
        await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${ACHIEVEMENTS_SHEET}!D${rowIndex}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[badge]] }
        });
    }
    
    return res.status(200).json({ message: 'Badge sikeresen beállítva!', badge });
}













