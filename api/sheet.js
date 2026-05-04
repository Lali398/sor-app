// api/sheet.js - Javított verzió
import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { OAuth2Client } from 'google-auth-library';

// === KONFIGURÁCIÓ ===
const ADMIN_BEERS_SHEET = "'Sör táblázat'!A4:V";
const USERS_SHEET = 'Felhasználók'; 
const GUEST_BEERS_SHEET = 'Vendég Sör Teszt';
const GUEST_DRINKS_SHEET = 'Vendég ital teszt';
const IDEAS_SHEET = 'Vendég ötletek';
const RECOMMENDATIONS_SHEET = 'Vendég sör ajánló';
const SUPPORT_SHEET = 'Hibajelentések';
const WINNERS_SHEET = 'Nyertesek';

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
// === STREAK SEGÉDFÜGGVÉNYEK ===

// Dátum konvertálása Év-Hét formátumra (pl. "2024-W05")
const getYearWeek = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1)/7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// Streak frissítése a Sheet-ben
async function updateUserStreak(sheets, spreadsheetId, userEmail) {
    try {
        // 1. Felhasználó megkeresése
        const usersRes = await sheets.spreadsheets.values.get({ 
            spreadsheetId, 
            range: `Felhasználók!A:K` // Kibővítjük a lekérést a K oszlopig
        });
        
        const rows = usersRes.data.values || [];
        const rowIndex = rows.findIndex(row => row[1] === userEmail); // 1-es index az email
        
        if (rowIndex === -1) return null;

        // Adatok kiolvasása (I, J, K oszlopok -> index 8, 9, 10)
        const lastActivityWeek = rows[rowIndex][8] || "";
        let currentStreak = parseInt(rows[rowIndex][9]) || 0;
        let longestStreak = parseInt(rows[rowIndex][10]) || 0;

        const currentYearWeek = getYearWeek(new Date());

        // LOGIKA:
        if (lastActivityWeek === currentYearWeek) {
            // Már posztolt ezen a héten -> Nincs teendő, csak visszaadjuk a jelenlegit
            return { currentStreak, longestStreak, isNew: false };
        }

        // Előző hét kiszámítása ellenőrzéshez
        const d = new Date();
        d.setDate(d.getDate() - 7); // Visszamegyünk 7 napot
        const previousWeek = getYearWeek(d);

        if (lastActivityWeek === previousWeek) {
            // Múlt héten posztolt -> Növeljük a streak-et
            currentStreak++;
        } else {
            // Kihagyott egy hetet (vagy ez az első) -> Reset 1-re
            currentStreak = 1;
        }

        // Rekord ellenőrzése
        if (currentStreak > longestStreak) {
            longestStreak = currentStreak;
        }

        // Mentés a Sheet-be (I, J, K oszlopok frissítése az adott sorban)
        const updateRange = `Felhasználók!I${rowIndex + 1}:K${rowIndex + 1}`;
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [[currentYearWeek, currentStreak, longestStreak]] }
        });

        return { currentStreak, longestStreak, isNew: true };

    } catch (e) {
        console.error("Streak update error:", e);
        return null;
    }
}
  

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
                const { pin } = req.body;
                const correctPin = process.env.ADMIN_PIN;

                if (!correctPin) {
                    return res.status(500).json({ error: 'Szerver hiba: Nincs beállítva PIN.' });
                }

                // === BIZTONSÁGI BŐVÍTÉS ===
                // Ha a PIN hibás, várakoztatjuk a választ 2-3 másodpercig.
                // Így egy robotnak évekbe telne végigpróbálni az összes kombinációt.
                if (String(pin).trim() !== String(correctPin).trim()) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 másodperc szünet
                    return res.status(401).json({ error: 'Hibás PIN kód!' });
                }
                
                const adminToken = jwt.sign(
                    { 
                        email: 'admin@sortablazat.hu', name: 'Admin', isAdmin: true }, 
                        process.env.JWT_SECRET, 
                        { expiresIn: '1d' }
                );

                // Adatok lekérése (EZ IS MARAD A RÉGI)
                const sörökResponse = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: ADMIN_BEERS_SHEET });
                const allRows = sörökResponse.data.values || [];
                const allBeers = [];
                allRows.forEach(row => {
                    const beer1 = transformRowToBeer(row, COL_INDEXES.admin1, 'admin1');
                    if (beer1) allBeers.push(beer1);
                    const beer2 = transformRowToBeer(row, COL_INDEXES.admin2, 'admin2');
                    if (beer2) allBeers.push(beer2);
                });
                
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

            case 'REPORT_CONTENT': {
                const userData = verifyUser(req);
                // MÁR NEM kérünk be 'reportedUserEmail'-t a klienstől, csak contentId-t (ami az index)
                const { type, contentId, reason } = req.body; 
                
                if (!reason) return res.status(400).json({ error: "Indoklás kötelező!" });
                if (contentId === undefined || contentId === null) return res.status(400).json({ error: "Hiányzó tartalom azonosító!" });

                let targetSheet = '';
                let emailColumn = ''; // A betűjele az oszlopnak, ahol az email van

                // 1. Meghatározzuk, melyik munkalapon kell keresni
                switch (type) {
                    case 'Sör': // Vendég Sör Teszt
                        targetSheet = GUEST_BEERS_SHEET;
                        emailColumn = 'N'; // N oszlop (13. index)
                        break;
                    case 'Ital': // Vendég ital teszt
                        targetSheet = GUEST_DRINKS_SHEET;
                        emailColumn = 'N'; // N oszlop (13. index)
                        break;
                    case 'Ötlet': // Vendég ötletek
                        targetSheet = IDEAS_SHEET;
                        emailColumn = 'F'; // F oszlop (5. index)
                        break;
                    case 'Ajánlás': // Vendég sör ajánló
                        targetSheet = RECOMMENDATIONS_SHEET;
                        emailColumn = 'C'; // C oszlop (2. index)
                        break;
                    default:
                        return res.status(400).json({ error: "Ismeretlen tartalom típus!" });
                }

                try {
                    // 2. Kikeresjük a panaszolt fél e-mail címét a táblázatból
                    // A Sheets sorok 1-től kezdődnek, a frontend tömb indexe 0-tól.
                    // Általában: SorIndex = ContentId + 1 
                    // (Feltételezve, hogy a contentId a tömb indexe, és a sheet 1. sora a fejléc)
                    const rowIndex = parseInt(contentId) + 1; 

                    const emailRes = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${targetSheet}!${emailColumn}${rowIndex}`
                    });

                    const foundEmail = emailRes.data.values ? emailRes.data.values[0][0] : null;

                    if (!foundEmail) {
                        return res.status(404).json({ error: "A jelentett tartalom vagy felhasználó nem található." });
                    }

                    // 3. Mentés a Jelentések munkalapra
                    const timestamp = new Date().toLocaleString('hu-HU');
                    const newRow = [
                        timestamp,              // A: Dátum
                        userData.email,         // B: Jelentő
                        type,                   // C: Típus
                        contentId,              // D: Tartalom ID (Index)
                        foundEmail,             // E: Panaszolt fél (MOST KERESTÜK KI)
                        reason,                 // F: Indok
                        'Nyitott'               // G: Státusz
                    ];

                    await sheets.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `Jelentések!A:G`,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [newRow] }
                    });

                    return res.status(200).json({ message: "Jelentés elküldve a moderátoroknak. Köszönjük az éberséget! 🛡️" });

                } catch (error) {
                    console.error("Jelentés hiba:", error);
                    return res.status(500).json({ error: "Szerver hiba a jelentés feldolgozása közben." });
                }
            }

            // === MODERÁCIÓS LISTA LEKÉRÉSE (ADMIN) ===
            case 'GET_MODERATION_TASKS': {
                const userData = verifyUser(req);
                // (Itt érdemes lenne ellenőrizni, hogy admin-e)

                const reportsRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `Jelentések!A:G` });
                const reports = (reportsRes.data.values || []).map((row, i) => {
                    if (i===0 || !row[0]) return null;
                    return {
                        index: i, // Sor index
                        date: row[0],
                        reporter: row[1],
                        type: row[2],
                        content: row[3],
                        reportedUser: row[4],
                        reason: row[5],
                        status: row[6]
                    };
                }).filter(r => r && r.status !== 'Lezárva').reverse();

                return res.status(200).json(reports);
            }

            // === FIGYELMEZTETÉS / KITILTÁS (ADMIN) ===
            case 'WARN_USER': {
                const userData = verifyUser(req);
                const { targetEmail, reportIndex } = req.body; // reportIndex: hogy lezárjuk a jelentést

                // 1. Felhasználó megkeresése
                const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: `${USERS_SHEET}!A:N` });
                const rows = usersRes.data.values || [];
                const rowIndex = rows.findIndex(row => row[1] === targetEmail);

                if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található." });

                const userRow = rows[rowIndex];
                let warnings = [];
                try {
                    // M oszlop (index 12) a figyelmeztetések
                    if (userRow[12]) warnings = JSON.parse(userRow[12]);
                } catch (e) {}

                // 2. Lejárt figyelmeztetések törlése (TISZTÍTÁS)
                const now = new Date();
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(now.getMonth() - 6);

                warnings = warnings.filter(w => new Date(w.date) > sixMonthsAgo);

                // 3. Új figyelmeztetés hozzáadása
                warnings.push({ date: now.toISOString(), reason: "Admin által jóváhagyott jelentés" });

                // 4. Kitiltás ellenőrzése (Ha eléri a 2-t)
                let isBanned = 'FALSE';
                let message = "Figyelmeztetés kiadva.";
                
                if (warnings.length >= 2) {
                    isBanned = 'TRUE';
                    message = "Figyelmeztetés kiadva. A felhasználó automatikusan KITILTÁSRA került (2/2). 🚫";
                }

                // 5. Adatok mentése (M és N oszlop)
                const range = `${USERS_SHEET}!M${rowIndex + 1}:N${rowIndex + 1}`;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[JSON.stringify(warnings), isBanned]] }
                });

                // 6. Jelentés lezárása (ha volt kapcsolódó jelentés)
                if (reportIndex) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `Jelentések!G${parseInt(reportIndex) + 1}`,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [['Lezárva (Büntetve)']] }
                    });
                }

                return res.status(200).json({ message, activeWarnings: warnings.length });
            }

            case 'LOGIN_USER': {
    const { email, password } = req.body;
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:O` // Most már A-tól O-ig kérjük
    });
    
    const rows = usersResponse.data.values || [];
    const rowIndex = rows.findIndex(row => row[1] === email);
    if (rowIndex === -1) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });
    
    const userRow = rows[rowIndex];
    const isPasswordValid = await bcrypt.compare(password, userRow[2]);
    if (!isPasswordValid) return res.status(401).json({ error: "Hibás e-mail cím vagy jelszó." });

    if (userRow[13] === 'TRUE') {
        return res.status(403).json({ error: "A fiókod fel lett függesztve a szabályzat megsértése miatt. 🚫" });
    }

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
    let settings = {};
    try { if (userRow[14]) settings = JSON.parse(userRow[14]); } catch (e) {}
    
    // ÚJ: Badge betöltése (G oszlop - index 6)
    const badge = userRow[6] || '';
    const currentStreak = parseInt(userRow[9]) || 0;
    const longestStreak = parseInt(userRow[10]) || 0;
    
    // Hagyományos belépés
    const user = { 
        name: userRow[0], 
        email: userRow[1], 
        has2FA: false,
        achievements: achievements, // ÚJ
        badge: badge, // ÚJ
        streak: { current: currentStreak, longest: longestStreak },
        isGoogleLinked: !!userRow[11],
        settings: settings
    };
    
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
    return res.status(200).json({ token, user });
}
            case 'VERIFY_2FA_LOGIN': {
    const { email, token: inputToken } = req.body;
    
    const usersResponse = await sheets.spreadsheets.values.get({ 
        spreadsheetId: SPREADSHEET_ID, 
        range: `${USERS_SHEET}!A:O` 
    });
   const rows = usersResponse.data.values || [];
    const userRow = rows.find(row => row[1] === email);
    if (!userRow) return res.status(401).json({ error: "Hiba az azonosításban." });


    if (userRow[13] === 'TRUE') {
        return res.status(403).json({ error: "A fiókod fel lett függesztve. 🚫" });
    }

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
    let settings = {};
    try { if (userRow[14]) settings = JSON.parse(userRow[14]); } catch (e) {}
    
    const badge = userRow[6] || '';
    const currentStreak = parseInt(userRow[9]) || 0;
    const longestStreak = parseInt(userRow[10]) || 0;

const user = { 
    name: userRow[0], 
    email: userRow[1], 
    has2FA: (action === 'VERIFY_2FA_LOGIN' ? true : false), // Vagy ahogy a te kódodban van
    achievements: achievements,
    badge: badge,
    streak: { current: currentStreak, longest: longestStreak },
    isGoogleLinked: !!userRow[11],
    settings: settings
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
                      id: row[14] || `user-${(row[2]||'').replace(/\s+/g,'-')}-${row[0]||''}`, // O oszlop, fallback a régiekhez
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
                const beerId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                
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
                userData.email,  // N: Email
                beerId           //O: Stabil ID
            ];
                
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_BEERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [newRow] },
                });
                await updateUserStreak(sheets, SPREADSHEET_ID, userData.email);
                return res.status(201).json({ message: "Sikeres hozzáadás! (Streak frissítve)" });
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
        await updateUserStreak(sheets, SPREADSHEET_ID, userData.email);
        return res.status(201).json({ message: "Sikeres hozzáadás! (Streak frissítve)" });
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
    const existingBeerId = targetRow[14] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    
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
    userData.email,   // N: Email
    existingBeerId    // O: UUID
];
    const range = `${GUEST_BEERS_SHEET}!A${globalIndex + 1}:O${globalIndex + 1}`;
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
                
                // JAVÍTÁS: A név lehet Anonymous, de az emailt elmentjük a törléshez!
                const submitterName = isAnonymous ? 'Anonymous' : userData.name;
                const userEmail = userData.email; // MINDIG a valódi emailt mentjük!
                
                const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
                const date = new Date().toLocaleDateString('hu-HU');
                
                // Sorrend: A:Beküldő, B:Ötlet, C:Időpont, D:Státusz, E:Dátum, F:Email
                const newRow = [
                    submitterName,           
                    ideaText,                
                    timestamp,               
                    'Megcsinálásra vár',     
                    date,                    
                    userEmail // Itt most már a valódi email lesz
                ];

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

            

            case 'GET_SUPPORT_TICKETS': {
                const userData = verifyUser(req);
                // Csak admin férhet hozzá!
                // (Feltételezzük, hogy az admin tokenben benne van az isAdmin: true, 
                // vagy az email alapján ellenőrzöd, mint a többi helyen)
                
                const ticketsResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `Hibajelentések!A:F` // A:Dátum, B:Név, C:Email, D:Tárgy, E:Üzenet, F:Státusz
                });

                const allRows = ticketsResponse.data.values || [];
                
                // Átalakítás objektumokká (kihagyjuk a fejlécet, ha van)
                const tickets = allRows.map((row, index) => {
                    if (index === 0 && row[0] === 'Dátum') return null; // Fejléc szűrés
                    if (!row || row.length === 0) return null;

                    return {
                        originalIndex: index, // Fontos a módosításhoz (Sor index - 1)
                        date: row[0],
                        name: row[1],
                        email: row[2],
                        subject: row[3],
                        message: row[4],
                        status: row[5] || 'Új'
                    };
                }).filter(item => item !== null).reverse(); // Legújabb elöl

                return res.status(200).json(tickets);
            }

            case 'UPDATE_TICKET_STATUS': {
                const userData = verifyUser(req);
                const { originalIndex, newStatus } = req.body;

                if (originalIndex === undefined || !newStatus) {
                    return res.status(400).json({ error: "Hiányzó adatok!" });
                }

                // A Sheetben a sor indexe: originalIndex + 1 (mivel a tömb 0-tól indul, sheet 1-től)
                const rowIndex = parseInt(originalIndex) + 1;
                const range = `Hibajelentések!F${rowIndex}`; // F oszlop a Státusz

                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[newStatus]] }
                });

                return res.status(200).json({ message: "Státusz sikeresen frissítve! ✅" });
            }
            
            case 'GET_ALL_IDEAS': {
                const userData = verifyUser(req);
                
                const ideasResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    // Bővítettük A:H-ra (G=Count, H=Voters)
                    range: `${IDEAS_SHEET}!A:H` 
                });
                
                const usersResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${USERS_SHEET}!A:G`
                });
                
                const allRows = ideasResponse.data.values || [];
                const allUsers = usersResponse.data.values || [];

                const userBadges = {};
                allUsers.forEach(row => {
                    if (row[1] && row[6]) userBadges[row[1]] = row[6];
                });
                
                const ideas = allRows.map((row, index) => {
                    if (!row || row.length === 0) return null;
                    if (row[0] === 'Beküldő' || row[0] === 'Ki javasolta?') return null;

                    const storedEmail = row[5] || '';
                    const submitterName = row[0] || 'Névtelen';
                    
                    let emailForFrontend = storedEmail;
                    if (submitterName === 'Anonymous' && storedEmail !== userData.email) {
                        emailForFrontend = 'rejtett@anonymous.hu';
                    }

                    let badge = '';
                    if (submitterName !== 'Anonymous' && userBadges[storedEmail]) {
                        badge = userBadges[storedEmail];
                    }

                    // --- SZAVAZAT KEZELÉS ---
                    const voteCount = parseInt(row[6]) || 0; // G oszlop
                    let voters = [];
                    try { if(row[7]) voters = JSON.parse(row[7]); } catch(e){} // H oszlop
                    const hasVoted = voters.includes(userData.email);

                    return {
                        index: index,
                        submitter: submitterName,
                        idea: row[1] || 'Nincs szöveg',
                        timestamp: row[2] || '',
                        status: row[3] || 'Megcsinálásra vár',
                        date: row[4] || '',
                        email: emailForFrontend,
                        badge: badge,
                        voteCount: voteCount, // ÚJ
                        hasVoted: hasVoted    // ÚJ
                    };
                }).filter(item => item !== null);

                // RENDEZÉS: Legtöbb szavazat elöl
                ideas.sort((a, b) => b.voteCount - a.voteCount);

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
                // Bővítettük A:K-ra (J=Count, K=Voters)
                const recResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: `${RECOMMENDATIONS_SHEET}!A:K`
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
                    const isMine = (email === userData.email);

                    // --- SZAVAZAT KEZELÉS ---
                    const voteCount = parseInt(row[9]) || 0; // J oszlop
                    let voters = [];
                    try { if(row[10]) voters = JSON.parse(row[10]); } catch(e){} // K oszlop
                    const hasVoted = voters.includes(userData.email);

                    return {
                        originalIndex: index,
                        date: row[0] ? row[0].substring(0, 10) : '',
                        submitter: displayName,
                        email: email,
                        badge: displayBadge,
                        itemName: row[3],
                        type: row[4],
                        description: row[5] || '',
                        isAnon: isAnon,
                        category: row[7] || 'Egyéb',
                        isEdited: row[8] === 'TRUE',
                        isMine: isMine,
                        voteCount: voteCount, // ÚJ
                        hasVoted: hasVoted    // ÚJ
                    };
                }).filter(item => item !== null);

                // RENDEZÉS: Legtöbb szavazat elöl
                recommendations.sort((a, b) => b.voteCount - a.voteCount);

                return res.status(200).json(recommendations);
            }

            // === SZAVAZÁS KEZELÉSE ===
            case 'VOTE_CONTENT': {
                const userData = verifyUser(req);
                const { type, index, isUpvote } = req.body; // type: 'idea' vagy 'recommendation'

                let sheetName = '';
                let countCol = '';
                let votersCol = '';
                
                // Melyik munkalapon dolgozunk?
                if (type === 'idea') {
                    sheetName = IDEAS_SHEET;
                    countCol = 'G'; // 6. index
                    votersCol = 'H'; // 7. index
                } else if (type === 'recommendation') {
                    sheetName = RECOMMENDATIONS_SHEET;
                    countCol = 'J'; // 9. index
                    votersCol = 'K'; // 10. index
                } else {
                    return res.status(400).json({ error: "Ismeretlen típus" });
                }

                // Az index a Sheetben (Frontend index + fejléc miatti eltolás)
                // Ideas: tömb index = sheet sor index (mivel a map indexet használjuk)
                // De a sheet API sorai 1-től kezdődnek.
                // A 'GET' logikádban az `originalIndex` a tömb indexe (ami a teljes sheet.values tömb indexe).
                // Tehát Sheet Sor = index + 1.
                const rowIndex = parseInt(index) + 1;

                // 1. Lekérjük a jelenlegi szavazatokat
                const range = `${sheetName}!${countCol}${rowIndex}:${votersCol}${rowIndex}`;
                const rowRes = await sheets.spreadsheets.values.get({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range
                });

                const rowData = rowRes.data.values ? rowRes.data.values[0] : [0, "[]"];
                let currentCount = parseInt(rowData[0]) || 0;
                let voters = [];
                try { voters = JSON.parse(rowData[1] || "[]"); } catch(e) {}

                // 2. Logika: Hozzáadás vagy Elvétel
                const userEmail = userData.email;
                
                if (voters.includes(userEmail)) {
                    // Már szavazott -> visszavonjuk (toggle off)
                    voters = voters.filter(e => e !== userEmail);
                    currentCount = Math.max(0, currentCount - 1);
                } else {
                    // Még nem szavazott -> hozzáadjuk
                    voters.push(userEmail);
                    currentCount++;
                }

                // 3. Mentés
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: range,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[currentCount, JSON.stringify(voters)]] }
                });

                return res.status(200).json({ 
                    message: "Szavazat rögzítve", 
                    newCount: currentCount,
                    voted: voters.includes(userEmail)
                });
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
                    
                    // JAVÍTÁS: A:H tartományt kérünk le, hogy a szavazatok (G, H) is benne legyenek!
                    const ideasResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${IDEAS_SHEET}!A:H` 
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
                    
                    // JAVÍTÁS: A teljes tartományt (A:H) töröljük és írjuk vissza
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: `${IDEAS_SHEET}!A:H` 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${IDEAS_SHEET}!A:H`,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Ötlet és a hozzá tartozó szavazatok sikeresen törölve!" });
                }
                
                case 'DELETE_USER_RECOMMENDATION': {
                    const userData = verifyUser(req);
                    const { originalIndex } = req.body;
                    
                    // Ellenőrizzük, hogy a sajátja-e
                    // Itt is fontos a sorindex korrekció (+1)
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
                    
                    // JAVÍTÁS: A:K tartományt kérünk le (J=Count, K=Voters)
                    const recResponse = await sheets.spreadsheets.values.get({
                        spreadsheetId: SPREADSHEET_ID,
                        range: `${RECOMMENDATIONS_SHEET}!A:K`
                    });
                    
                    const allRows = recResponse.data.values || [];
                    const cleanRows = allRows.filter((_, idx) => idx !== originalIndex);
                    
                    // JAVÍTÁS: Teljes törlés és visszaírás A:K tartományban
                    await sheets.spreadsheets.values.clear({ 
                        spreadsheetId: SPREADSHEET_ID, 
                        range: `${RECOMMENDATIONS_SHEET}!A:K` 
                    });
                    
                    if (cleanRows.length > 0) {
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: `${RECOMMENDATIONS_SHEET}!A:K`,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanRows }
                        });
                    }
                    
                    return res.status(200).json({ message: "Ajánlás és a hozzá tartozó szavazatok sikeresen törölve!" });
                }
            case 'ADD_CONSUMPTION': {
            const userData = verifyUser(req);
            const { beerName, beerId, qty, dlPerGlass, totalDl, abv } = req.body;
            const beersResponse = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: GUEST_BEERS_SHEET
            });
            const userOwnsThisBeer = (beersResponse.data.values || [])
                .some(row => row[13] === userData.email && row[2] === beerName);
        
            if (!userOwnsThisBeer) {
                return res.status(403).json({ error: "Ez a sör nem a te listádban szerepel." });
            }
            const newRow = [
                new Date().toISOString().replace('T', ' ').substring(0, 19),
                userData.email,
                beerName,
                beerId,
                qty,
                dlPerGlass,
                totalDl,
                abv
            ];
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Fogyasztás napló',
                valueInputOption: 'USER_ENTERED',
                resource: { values: [newRow] },
            });
            return res.status(201).json({ message: 'Fogyasztás rögzítve!' });
        }
        
        case 'GET_CONSUMPTIONS': {
            const userData = verifyUser(req);
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Fogyasztás napló!A:H'
            });
            const rows = response.data.values || [];
            const userRows = rows.filter(r => r[1] === userData.email);
            const consMap = {};
            userRows.forEach(r => {
                const beerId = r[3];
                if (!consMap[beerId]) consMap[beerId] = { count: 0, totalDl: 0 };
                consMap[beerId].count  += parseInt(r[4]) || 0;
                consMap[beerId].totalDl += parseInt(r[6]) || 0;
            });
            return res.status(200).json(consMap);
        }

            case 'CLAIM_REWARD': {
                const userData = verifyUser(req);
                const { selectedPrize } = req.body;

                if (!['Sör', 'Cola', 'Energia Ital'].includes(selectedPrize)) {
                    return res.status(400).json({ error: "Érvénytelen nyeremény választás!" });
                }

                // 1. Ellenőrizzük, hány nyertes van eddig
                const winnersRes = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: `${WINNERS_SHEET}!A:A` 
                });
                const winnerCount = (winnersRes.data.values || []).length - 1; // Fejléc levonása

                if (winnerCount >= 5) {
                    return res.status(400).json({ error: "Sajnos lemaradtál! Már megvan az első 5 nyertes. 😔" });
                }

                // 2. Ellenőrizzük, hogy ez a user nyert-e már (duplikáció szűrés)
                const winnersFullRes = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: `${WINNERS_SHEET}!C:C` // Email oszlop
                });
                const winnersEmails = (winnersFullRes.data.values || []).flat();
                if (winnersEmails.includes(userData.email)) {
                    return res.status(400).json({ error: "Te már beváltottad a nyereményedet! 🎉" });
                }

                // 3. Ellenőrizzük, hogy töltött-e fel legalább 1 sört VAGY italt
                const beersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                const drinksRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_DRINKS_SHEET });

                const hasBeer = (beersRes.data.values || []).some(row => row[13] === userData.email); // 13-as index az email
                const hasDrink = (drinksRes.data.values || []).some(row => row[13] === userData.email);

                if (!hasBeer && !hasDrink) {
                    return res.status(400).json({ error: "Előbb tölts fel legalább egy Sör vagy Ital tesztet! 📝" });
                }

                // 4. Ha minden oké, mentsük el
                const timestamp = new Date().toLocaleString('hu-HU');
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: WINNERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[timestamp, userData.name, userData.email, selectedPrize]] }
                });

                return res.status(200).json({ message: "GRATULÁLUNK! Nyereményed rögzítve! Keresni fogunk. 🎁" });
            }

                      case 'IMPORT_USER_DATA': {
    const userData = verifyUser(req);
    const { beers, drinks } = req.body;

    if ((!beers || beers.length === 0) && (!drinks || drinks.length === 0)) {
        return res.status(400).json({ error: "Nincs importálható adat!" });
    }

    // ✅ ÚJ SEGÉDFÜGGVÉNY - Illeszd be IDE!
    const normalizeDateToString = (date) => {
        if (!date) return '';
        
        // Ha már string, visszaadjuk
        if (typeof date === 'string') {
            // Ha ISO formátum (pl. "2024-01-15T12:00:00")
            if (date.includes('T')) {
                return date.substring(0, 10);
            }
            // Ha magyar formátum (pl. "2024. 01. 15.")
            if (date.includes('.')) {
                const parts = date.split('.').map(p => p.trim()).filter(Boolean);
                if (parts.length >= 3) {
                    const year = parts[0].padStart(4, '0');
                    const month = parts[1].padStart(2, '0');
                    const day = parts[2].padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
            }
            return date.substring(0, 10);
        }
        
        // Ha Date objektum
        if (date instanceof Date) {
            return date.toISOString().substring(0, 10);
        }
        
        // Ha Excel serial number (pl. 44927)
        if (typeof date === 'number') {
            // Excel dátumok 1900-01-01-től számolnak (Windows)
            const excelEpoch = new Date(1900, 0, 1);
            const jsDate = new Date(excelEpoch.getTime() + (date - 2) * 86400000);
            return jsDate.toISOString().substring(0, 10);
        }
        
        return '';
    };

    try {
        let addedBeersCount = 0;
        let addedDrinksCount = 0;
        let skippedCount = 0;

        // --- SÖRÖK IMPORTÁLÁSA ---
        if (beers && beers.length > 0) {
            const existingBeersRes = await sheets.spreadsheets.values.get({ 
                spreadsheetId: SPREADSHEET_ID, 
                range: GUEST_BEERS_SHEET 
            });
            const existingRows = existingBeersRes.data.values || [];
            const myExistingBeers = existingRows.filter(row => row[13] === userData.email);

            // ✅ JAVÍTOTT createFingerprint
            const createFingerprint = (date, name, type, score) => {
                const d = normalizeDateToString(date); // ÚJ!
                return `${d}|${name.trim().toLowerCase()}|${type.trim().toLowerCase()}|${score}`;
            };

            const existingFingerprints = new Set(myExistingBeers.map(row => 
                createFingerprint(row[0], row[2], row[4], row[9])
            ));

            const newBeerRows = [];

            beers.forEach(beer => {
                const look = parseFloat(beer.look) || 0;
                const smell = parseFloat(beer.smell) || 0;
                const taste = parseFloat(beer.taste) || 0;
                const totalScore = look + smell + taste;
                const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
                
                // ✅ JAVÍTOTT dátum kezelés
                const dateStr = beer.date 
                    ? normalizeDateToString(beer.date) + ' 12:00:00' 
                    : new Date().toISOString().replace('T', ' ').substring(0, 19);

                const fingerprint = createFingerprint(dateStr, beer.beerName, beer.type || '', totalScore);

                if (!existingFingerprints.has(fingerprint)) {
                    newBeerRows.push([
                        dateStr,
                        userData.name,
                        beer.beerName,
                        beer.location || '',
                        beer.type || '',
                        look,
                        smell,
                        taste,
                        beer.beerPercentage || 0,
                        totalScore,
                        avgScore,
                        beer.notes || '',
                        'Nem',
                        userData.email
                    ]);
                    existingFingerprints.add(fingerprint);
                    addedBeersCount++;
                } else {
                    skippedCount++;
                }
            });

            if (newBeerRows.length > 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_BEERS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: newBeerRows },
                });
            }
        }

        // --- ITALOK IMPORTÁLÁSA (UGYANÍGY JAVÍTVA) ---
        if (drinks && drinks.length > 0) {
            const existingDrinksRes = await sheets.spreadsheets.values.get({ 
                spreadsheetId: SPREADSHEET_ID, 
                range: GUEST_DRINKS_SHEET 
            });
            const existingRows = existingDrinksRes.data.values || [];
            const myExistingDrinks = existingRows.filter(row => row[13] === userData.email);

            // ✅ JAVÍTOTT createFingerprint italokhoz is
            const createFingerprint = (date, name, cat, score) => {
                const d = normalizeDateToString(date); // ÚJ!
                return `${d}|${name.trim().toLowerCase()}|${cat.trim().toLowerCase()}|${score}`;
            };

            const existingFingerprints = new Set(myExistingDrinks.map(row => 
                createFingerprint(row[0], row[2], row[3], row[10])
            ));

            const newDrinkRows = [];

            drinks.forEach(drink => {
                const look = parseFloat(drink.look) || 0;
                const smell = parseFloat(drink.smell) || 0;
                const taste = parseFloat(drink.taste) || 0;
                const totalScore = look + smell + taste;
                const avgScore = (totalScore / 3).toFixed(2).replace('.', ',');
                
                // ✅ JAVÍTOTT dátum kezelés
                const dateStr = drink.date 
                    ? normalizeDateToString(drink.date) + ' 12:00:00'
                    : new Date().toISOString().replace('T', ' ').substring(0, 19);

                const fingerprint = createFingerprint(dateStr, drink.drinkName, drink.category || 'Egyéb', totalScore);

                if (!existingFingerprints.has(fingerprint)) {
                    newDrinkRows.push([
                        dateStr,
                        userData.name,
                        drink.drinkName,
                        drink.category || 'Egyéb',
                        drink.type || 'Alkoholos',
                        drink.location || '',
                        drink.drinkPercentage || 0,
                        look,
                        smell,
                        taste,
                        totalScore,
                        avgScore,
                        drink.notes || '',
                        userData.email
                    ]);
                    existingFingerprints.add(fingerprint);
                    addedDrinksCount++;
                } else {
                    skippedCount++;
                }
            });

            if (newDrinkRows.length > 0) {
                await sheets.spreadsheets.values.append({
                    spreadsheetId: SPREADSHEET_ID,
                    range: GUEST_DRINKS_SHEET,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: newDrinkRows },
                });
            }
        }

        return res.status(200).json({ 
            message: `Sikeres importálás! (+${addedBeersCount} sör, +${addedDrinksCount} ital). ${skippedCount} duplikáció átugorva.` 
        });

    } catch (error) {
        console.error("Import error:", error);
        return res.status(500).json({ error: "Hiba az importálás során: " + error.message });
    }
}

            case 'REFRESH_USER_DATA': {
              const userData = verifyUser(req);
              const usersResponse = await sheets.spreadsheets.values.get({ 
                  spreadsheetId: SPREADSHEET_ID, 
                  range: `Felhasználók!A:O` // Kiterjesztjük O-ig, ahol a settings van
              });
              const rows = usersResponse.data.values || [];
              const userRow = rows.find(row => row[1] === userData.email);
              
              if (!userRow) return res.status(404).json({error: "User not found"});
          
              // Streak adatok
              const currentStreak = parseInt(userRow[9]) || 0;
              const longestStreak = parseInt(userRow[10]) || 0;
              
              // Achievementek
              let achievements = { unlocked: [] };
              try { if (userRow[5]) achievements = JSON.parse(userRow[5]); } catch(e){}

              let settings = {};
              try { if (userRow[14]) settings = JSON.parse(userRow[14]); } catch (e) {}
          
              return res.status(200).json({
                  streak: { current: currentStreak, longest: longestStreak },
                  achievements: achievements,
                  badge: userRow[6] || '',
                  settings: settings // Visszaküldjük a kliensnek
              });
          }

          case 'SAVE_SETTINGS': {
              const userData = verifyUser(req);
              const { settings } = req.body; // Ez egy JSON objektum lesz
          
              if (!settings) return res.status(400).json({ error: "Nincs beállítás adat." });
          
              const usersResponse = await sheets.spreadsheets.values.get({ 
                  spreadsheetId: SPREADSHEET_ID, 
                  range: `${USERS_SHEET}!A:O` 
              });
              const rows = usersResponse.data.values || [];
              const rowIndex = rows.findIndex(row => row[1] === userData.email);
          
              if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található." });
          
              // O oszlop frissítése (index 14)
              // A sor indexe a Sheetben: rowIndex + 1
              const updateRange = `${USERS_SHEET}!O${rowIndex + 1}`;
          
              await sheets.spreadsheets.values.update({
                  spreadsheetId: SPREADSHEET_ID,
                  range: updateRange,
                  valueInputOption: 'USER_ENTERED',
                  resource: { values: [[JSON.stringify(settings)]] }
              });
          
              return res.status(200).json({ message: "Beállítások mentve." });
          }
                      
            
            case 'DELETE_USER': {
                const userData = verifyUser(req);
                const userEmail = userData.email;

                try {
                    // --- 1. FELHASZNÁLÓ TÖRLÉSE ---
                    const usersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                    const allUsers = usersRes.data.values || [];
                    const cleanUsers = allUsers.filter((row, index) => {
                        if (index === 0) return true; 
                        return row[1] !== userEmail; 
                    });
                    if (cleanUsers.length !== allUsers.length) {
                        await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: USERS_SHEET });
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: USERS_SHEET,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: cleanUsers }
                        });
                    }

                    // --- 2. SÖRÖK TÖRLÉSE ---
                    const beersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_BEERS_SHEET });
                    const allBeers = beersRes.data.values || [];
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

                    // --- 3. ITALOK TÖRLÉSE ---
                    const drinksRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: GUEST_DRINKS_SHEET });
                    const allDrinks = drinksRes.data.values || [];
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
                    
                    // --- 4. ÖTLETEK TÖRLÉSE + SZAVAZATOK TISZTÍTÁSA ---
                    const ideasRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: IDEAS_SHEET });
                    const allIdeas = ideasRes.data.values || [];
                    
                    // Két dolgot csinálunk: 
                    // 1. Kiszedjük a saját ötleteit.
                    // 2. A maradékban megnézzük, szavazott-e, és ha igen, töröljük a szavazatát.
                    const cleanIdeas = allIdeas.filter((row, index) => {
                        if (index === 0) return true; // Fejléc marad
                        return row[5] !== userEmail; // Saját ötlet törlése
                    }).map((row, index) => {
                        if (index === 0) return row; // Fejlécet ne bántsuk

                        // Szavazatok tisztítása (G oszlop: Count, H oszlop: JSON)
                        let count = parseInt(row[6]) || 0;
                        let voters = [];
                        try { if(row[7]) voters = JSON.parse(row[7]); } catch(e){}

                        if (voters.includes(userEmail)) {
                            // Ha szavazott, kivesszük
                            voters = voters.filter(v => v !== userEmail);
                            count = Math.max(0, count - 1);
                            
                            // Frissítjük a sort
                            row[6] = count;
                            row[7] = JSON.stringify(voters);
                        }
                        return row;
                    });

                    // Mindig frissítjük, mert lehet, hogy csak szavazatot töröltünk
                    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: IDEAS_SHEET });
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: IDEAS_SHEET,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: cleanIdeas }
                    });
                    

                    // --- 5. AJÁNLÁSOK TÖRLÉSE + SZAVAZATOK TISZTÍTÁSA ---
                    const recRes = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: RECOMMENDATIONS_SHEET });
                    const allRecs = recRes.data.values || [];
                    
                    const cleanRecs = allRecs.filter((row, index) => {
                        if (index === 0) return true;
                        return row[2] !== userEmail; // C oszlop az email
                    }).map((row, index) => {
                        if (index === 0) return row;

                        // Szavazatok tisztítása (J oszlop: Count, K oszlop: JSON)
                        // Figyelem: indexek 0-tól -> J=9, K=10
                        let count = parseInt(row[9]) || 0;
                        let voters = [];
                        try { if(row[10]) voters = JSON.parse(row[10]); } catch(e){}

                        if (voters.includes(userEmail)) {
                            voters = voters.filter(v => v !== userEmail);
                            count = Math.max(0, count - 1);
                            
                            row[9] = count;
                            row[10] = JSON.stringify(voters);
                        }
                        return row;
                    });
                    
                    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: RECOMMENDATIONS_SHEET });
                    await sheets.spreadsheets.values.update({
                        spreadsheetId: SPREADSHEET_ID,
                        range: RECOMMENDATIONS_SHEET,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: cleanRecs }
                    });
                    

                    return res.status(200).json({ message: "Fiók, adatok, ajánlások és leadott szavazatok sikeresen törölve." });
                } catch (error) {
                    console.error("Törlési hiba:", error);
                    return res.status(500).json({ error: "Hiba történt a fiók törlése közben." });
                }
            }
            // === GOOGLE LOGIN ÉS REGISZTRÁCIÓ ===
            case 'GOOGLE_LOGIN': {
                const { token: googleToken } = req.body;
                // Ha nincs beállítva a Vercelen a változó, itt hiba lesz, de a logban látni fogod
                const clientId = process.env.GOOGLE_CLIENT_ID; 
                const client = new OAuth2Client(clientId);

                const ticket = await client.verifyIdToken({
                    idToken: googleToken,
                    audience: clientId,
                });
                const payload = ticket.getPayload();
                const googleEmail = payload.email;
                const googleName = payload.name;
                const googleSub = payload.sub; // Google ID

                // Felhasználó keresése
                // FONTOS: Feltételezzük, hogy az 'L' oszlop (index 11) tárolja a Google ID-t.
                // Ha a te táblázatodban máshol van hely, írd át az indexeket!
                const usersResponse = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: `${USERS_SHEET}!A:O` 
                });
                
                const rows = usersResponse.data.values || [];
                let rowIndex = rows.findIndex(row => row[1] === googleEmail); // 1-es index az email
                let userRow;
                let isNewUser = false;

                // Ha NINCS ilyen email -> Regisztráció
                if (rowIndex === -1) {
                    isNewUser = true;
                    // Generálunk random jelszót és recovery kódot, mert Google-lel lép be
                    const hashedPassword = await bcrypt.hash(Math.random().toString(36), 10); 
                    const recoveryCode = Math.random().toString(36).slice(-8).toUpperCase();
                    const hashedRecovery = await bcrypt.hash(recoveryCode, 10);
                    const defaultAchievements = { unlocked: [] };

                    // Új sor: A-tól L-ig (12 oszlop)
                    // Figyelj a sorrendre, ez a te sheeted struktúrája alapján van:
                    // Név, Email, Jelszó, 2FA Secret, 2FA Enabled, Achievements, Badge, RecoveryHash, LastActive, StreakCurr, StreakLong, GOOGLE_ID
                    const newRow = [
                        googleName, 
                        googleEmail, 
                        hashedPassword, 
                        '', 
                        'FALSE', 
                        JSON.stringify(defaultAchievements), 
                        '', 
                        hashedRecovery, 
                        '', 
                        '0', 
                        '0', 
                        googleSub // L oszlop
                    ];

                    await sheets.spreadsheets.values.append({
                        spreadsheetId: SPREADSHEET_ID,
                        range: USERS_SHEET,
                        valueInputOption: 'USER_ENTERED',
                        resource: { values: [newRow] },
                    });
                    
                    userRow = newRow;
                } else {
                    // Ha VAN ilyen email -> Belépés és esetleges összekötés
                    userRow = rows[rowIndex];

                    if (userRow[13] === 'TRUE') {
                    return res.status(403).json({ error: "A fiókod fel lett függesztve a szabályzat megsértése miatt. 🚫" });
                    }
                    
                    // Ha még nincs beírva a Google ID az L oszlopba, pótoljuk
                    if (!userRow[11]) {
                        const updateRange = `${USERS_SHEET}!L${rowIndex + 1}`;
                        await sheets.spreadsheets.values.update({
                            spreadsheetId: SPREADSHEET_ID,
                            range: updateRange,
                            valueInputOption: 'USER_ENTERED',
                            resource: { values: [[googleSub]] }
                        });
                    }
                }

                // User objektum összeállítása a frontendnek
                let achievements = { unlocked: [] };
                try { if (userRow[5]) achievements = JSON.parse(userRow[5]); } catch(e){}
              
                let settings = {};
                try { if (userRow[14]) settings = JSON.parse(userRow[14]); } catch (e) {}

                const user = { 
                    name: userRow[0], 
                    email: userRow[1], 
                    has2FA: userRow[4] === 'TRUE',
                    achievements: achievements,
                    badge: userRow[6] || '',
                    streak: { current: parseInt(userRow[9])||0, longest: parseInt(userRow[10])||0 },
                    isGoogleLinked: true,
                    settings: settings
                };

                const token = jwt.sign(user, JWT_SECRET, { expiresIn: '1d' });
                return res.status(200).json({ token, user, isNewUser });
            }

            // === FIÓK ÖSSZEKÖTÉS (BEÁLLÍTÁSOK) ===
            case 'LINK_GOOGLE_ACCOUNT': {
                const userData = verifyUser(req); // Ellenőrizzük a sima tokent
                const { token: googleToken } = req.body;
                const clientId = process.env.GOOGLE_CLIENT_ID;
                const client = new OAuth2Client(clientId);

                const ticket = await client.verifyIdToken({
                    idToken: googleToken,
                    audience: clientId,
                });
                const { sub: googleSub } = ticket.getPayload();

                const usersResponse = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: `${USERS_SHEET}!A:L` 
                });
                const rows = usersResponse.data.values || [];
                const rowIndex = rows.findIndex(row => row[1] === userData.email);

                if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található" });

                // Ellenőrizzük, hogy más nem használja-e már ezt a Google fiókot
                const isTaken = rows.some(row => row[11] === googleSub && row[1] !== userData.email);
                if (isTaken) return res.status(409).json({ error: "Ez a Google fiók már foglalt!" });

                // Mentés az L oszlopba
                const updateRange = `${USERS_SHEET}!L${rowIndex + 1}`;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [[googleSub]] }
                });

                return res.status(200).json({ message: "Sikeres összekötés! 🎉" });
            }

            // === KAPCSOLAT BONTÁSA ===
            case 'UNLINK_GOOGLE_ACCOUNT': {
                const userData = verifyUser(req);
                
                const usersResponse = await sheets.spreadsheets.values.get({ 
                    spreadsheetId: SPREADSHEET_ID, 
                    range: `${USERS_SHEET}!A:L` 
                });
                const rows = usersResponse.data.values || [];
                const rowIndex = rows.findIndex(row => row[1] === userData.email);
                
                if (rowIndex === -1) return res.status(404).json({ error: "Felhasználó nem található" });

                // Ellenőrzés: Csak akkor engedjük leválasztani, ha az L oszlopban van adat
                if (!rows[rowIndex][11]) {
                     return res.status(400).json({ error: "Nincs Google fiók összekötve!" });
                }

                // Törlés az L oszlopból
                const updateRange = `${USERS_SHEET}!L${rowIndex + 1}`;
                await sheets.spreadsheets.values.update({
                    spreadsheetId: SPREADSHEET_ID,
                    range: updateRange,
                    valueInputOption: 'USER_ENTERED',
                    resource: { values: [['']] } // Üres stringgel felülírjuk
                });

                return res.status(200).json({ message: "Google fiók kapcsolat sikeresen bontva! 🔌" });
            }

            default:
                return res.status(400).json({ error: "Ismeretlen művelet." });
        } // Switch vége

    } catch (error) {
        console.error("API Hiba:", error);
        return res.status(500).json({ error: "Kritikus szerverhiba: " + error.message });
    }
} // Handler vége









































