document.addEventListener('DOMContentLoaded', function() {

    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#e0e0e0';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
    
    // --- NÉZETEK ÉS ELEMEK ---
    // --- KURZOR ELEMEK ÉS LOGIKA ---
    const beerCursor = document.getElementById('beerCursor');

    // 1. Kurzor mozgatása + Scroll effekt változók
    let currentScrollRotate = -15; // Alap dőlés

    function updateCursorPosition(x, y) {
        if (!document.body.classList.contains('custom-cursor-active')) return;
        
        // Itt kombináljuk a pozíciót a görgetésből számolt dőléssel
        // Fontos: a 'translate' és 'rotate' sorrendje számít!
        beerCursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${currentScrollRotate}deg)`;
    }

    // Egérmozgás figyelése
    document.addEventListener('mousemove', (e) => {
    if (!document.body.classList.contains('custom-cursor-active')) return;
    
    // Csak az első mozdulatnál jelenjen meg, ha eddig rejtve volt
    if (beerCursor.style.display === 'none' || beerCursor.style.opacity === '0') {
        beerCursor.style.display = 'block';
    }

    requestAnimationFrame(() => {
        // x és y pozíció frissítése
        updateCursorPosition(e.clientX, e.clientY);
    });
});

    // 2. GÖRGETÉS EFFEKT (IVÁS / DŐLÉS)
    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        
        // --- JAVÍTÁS: NaN (Not a Number) elkerülése ---
        // Ha teljes képernyőn vagyunk, a docHeight lehet 0, ami osztásnál hibát okoz.
        let scrollPercent = 0;
        if (docHeight > 0) {
            scrollPercent = scrollTop / docHeight;
        }

        // Biztonsági korlát (0 és 1 között tartjuk)
        scrollPercent = Math.min(Math.max(scrollPercent, 0), 1);

        const startAngle = -15;
        const endAngle = -70; 
        
        currentScrollRotate = startAngle + (scrollPercent * (endAngle - startAngle));

        if (window.mouseX !== undefined) {
            updateCursorPosition(window.mouseX, window.mouseY);
        }
    });

    // 3. Intelligens váltás figyelése (Hover effekt)
    document.addEventListener('mouseover', (e) => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        const target = e.target;
        const isClickable = target.closest(`
            button, a, input, select, textarea, label,
            .auth-btn, .admin-btn, .header-btn, .stat-tab-btn, 
            .recap-btn, .suggestion-item, .switch-auth, 
            .clear-search, .modal-close, .kpi-card, .chart-container
        `);

        if (isClickable) {
            document.body.classList.add('hovering-clickable');
            // Ha gomb felett vagyunk, kicsit "koccintósra" állítjuk
            beerCursor.style.transform = `translate(${window.mouseX}px, ${window.mouseY}px) translate(-50%, -50%) rotate(-35deg) scale(1.2)`;
        } else {
            document.body.classList.remove('hovering-clickable');
            // Visszaállunk a görgetés szerinti szögre
            if (window.mouseX) updateCursorPosition(window.mouseX, window.mouseY);
        }
    });

    // 4. Kattintás effekt
    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        createBeerBubbles(e.clientX, e.clientY);
        
        // Pici animáció kattintáskor
        if (!document.body.classList.contains('hovering-clickable')) {
            // Pillanatnyi "koccintás"
            beerCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) rotate(-90deg) scale(0.9)`;
            
            setTimeout(() => {
                // Visszatérés a görgetés szerinti állapothoz
                updateCursorPosition(e.clientX, e.clientY);
            }, 150);
        }
    });
    
    const adminView = document.getElementById('adminView');
    const guestView = document.getElementById('guestView');
    const userView = document.getElementById('userView');
    const adminForm = document.getElementById('adminForm');
    const liveSearchInput = document.getElementById('liveSearchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const searchResultsInfo = document.getElementById('searchResultsInfo');
    const clearSearch = document.getElementById('clearSearch');
    const beerTableBody = document.getElementById('beerTableBody');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const userLogoutBtn = document.getElementById('userLogoutBtn');
    const addBeerForm = document.getElementById('addBeerForm');
    const addDrinkForm = document.getElementById('addDrinkForm');
    const userDrinkTableBody = document.getElementById('userDrinkTableBody');
    const userBeerTableBody = document.getElementById('userBeerTableBody');
    const userWelcomeMessage = document.getElementById('userWelcomeMessage');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const recapControls = document.getElementById('recapControls');
    const recapResultsContainer = document.getElementById('recapResultsContainer');
    const user2FAToggle = document.getElementById('user2FAToggle');
    const setup2FAModal = document.getElementById('setup2FAModal');
    const login2FAModal = document.getElementById('login2FAModal');
    const editBeerModal = document.getElementById('editBeerModal');
    const editBeerForm = document.getElementById('editBeerForm');
    const editDrinkModal = document.getElementById('editDrinkModal');
    const editDrinkForm = document.getElementById('editDrinkForm');
    const guestBeerIcon = document.querySelector('#guestView .beer-icon');
    const adminPinModal = document.getElementById('adminPinModal');
    const adminPinForm = document.getElementById('adminPinForm');
    const adminPinInput = document.getElementById('adminPinInput');
    
    
    // STATISZTIKA ELEMEK
    const statsView = document.getElementById('statsView');
    const statTabButtons = document.getElementById('statTabButtons');
    const statPanes = document.querySelectorAll('.stat-pane');
    
    const loginCard = document.getElementById('loginCard'), registerCard = document.getElementById('registerCard'), switchAuthLinks = document.querySelectorAll('.switch-auth'), logoutBtn = document.getElementById('logoutBtn'), refreshBtn = document.getElementById('refreshBtn');

    // ---(globális) ÁLLAPOT ---
    
    let beersData = [];
    let currentAdminRecapView = 'common';
    let usersData = [];
    let filteredBeers = [];
    let selectedSuggestionIndex = -1;
    let charts = {};
    let currentUserBeers = [];
    let currentUserDrinks = [];
    let temp2FASecret = ''; // Ideiglenes tároló a setup közben
    let tempLoginEmail = ''; // Ideiglenes tároló login közben
    let adminClickCount = 0;
    let adminClickTimer = null;

    if (guestBeerIcon) {
    guestBeerIcon.addEventListener('click', () => {
        adminClickCount++;
        
        // Vizuális visszajelzés (ikon "rázkódás")
        guestBeerIcon.style.animation = 'none';
        setTimeout(() => {
            guestBeerIcon.style.animation = 'bounce 0.3s ease';
        }, 10);
        
        // Ha 5x rákattintottak
        if (adminClickCount === 5) {
            openAdminPinModal();
            adminClickCount = 0; // Reset
            clearTimeout(adminClickTimer);
        }
        
        // Timer reset - ha 2 másodpercen belül nem kattint újra, nullázódik a számláló
        clearTimeout(adminClickTimer);
        adminClickTimer = setTimeout(() => {
            adminClickCount = 0;
        }, 2000);
    });
}

// === MODAL MEGNYITÁSA ===
function openAdminPinModal() {
    if (!adminPinModal) return;
    
    adminPinModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Input fókusz kis késleltetéssel
    setTimeout(() => {
        if (adminPinInput) adminPinInput.focus();
    }, 300);
    
    // Reset form
    if (adminPinForm) adminPinForm.reset();
}

// === MODAL BEZÁRÁSA ===
window.closeAdminPinModal = function() {
    if (!adminPinModal) return;
    
    adminPinModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    if (adminPinForm) adminPinForm.reset();
}

// === MODAL BEZÁRÁSA KÍVÜLRE KATTINTVA ===
if (adminPinModal) {
    adminPinModal.addEventListener('click', (e) => {
        if (e.target === adminPinModal) {
            closeAdminPinModal();
        }
    });
}

// === FORM BEKÜLDÉSE ===
if (adminPinForm) {
    adminPinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const pin = adminPinInput.value.trim();
        const submitBtn = adminPinForm.querySelector('.auth-btn');
        
        if (!pin || pin.length !== 6) {
            showError("Add meg a 6 számjegyű PIN kódot!");
            return;
        }
        
        setLoading(submitBtn, true);
        
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'ADMIN_LOGIN_WITH_PIN', 
                    pin: pin 
                })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Helytelen PIN kód!');
            }
            
            // Sikeres belépés! Token és adatok mentése
            if (result.adminToken) {
                localStorage.setItem('userToken', result.adminToken);
                localStorage.setItem('userData', JSON.stringify({ 
                    name: 'Adminisztrátor', 
                    email: 'admin@sortablazat.hu', 
                    isAdmin: true 
                }));
            }
            
            // Adatok mentése
            beersData = result.beers || [];
            usersData = result.users || [];
            filteredBeers = [...beersData];
            
            showSuccess('🔐 Sikeres titkos belépés!');
            
            setTimeout(() => {
                closeAdminPinModal();
                switchToAdminView();
            }, 1000);
            
        } catch (error) {
            console.error("PIN belépési hiba:", error);
            showError(error.message || 'Helytelen PIN kód!');
            adminPinInput.value = '';
            adminPinInput.focus();
        } finally {
            setLoading(submitBtn, false);
        }
    });
}
    // ======================================================
    // === FŐ FUNKCIÓK (SZERVER KOMMUNIKÁCIÓ) ===
    // ======================================================

    
    
    // ======================================================
    // === VENDÉG FELHASZNÁLÓ FUNKCIÓK ===
    // ======================================================

    async function handleAddBeer(e) {
    e.preventDefault();
    const beerName = document.getElementById('beerName').value;
    const type = document.getElementById('beerType').value;
    const location = document.getElementById('beerLocation').value;
    const beerPercentage = document.getElementById('beerPercentage').value;
    const look = document.getElementById('beerLook').value;
    const smell = document.getElementById('beerSmell').value;
    const taste = document.getElementById('beerTaste').value;
    const notes = document.getElementById('beerNotes').value;
    const submitBtn = addBeerForm.querySelector('.auth-btn');

    setLoading(submitBtn, true);
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'ADD_USER_BEER', beerName, type, location, beerPercentage, look, smell, taste, notes })
        });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                showError("A munkameneted lejárt, kérlek jelentkezz be újra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(result.error || 'Szerverhiba');
        }
        showSuccess('Sör sikeresen hozzáadva!');
        addBeerForm.reset();
        closeAddModal('beer');
        loadUserData();
    } catch (error) {
        console.error("Hiba sör hozzáadásakor:", error);
        showError(error.message || "Nem sikerült a sört hozzáadni.");
    } finally {
        setLoading(submitBtn, false);
    }
}

    async function handleAddDrink(e) {
    e.preventDefault();
    const drinkName = document.getElementById('drinkName').value;
    const category = document.getElementById('drinkCategory').value;
    const type = document.getElementById('drinkType').value;
    const location = document.getElementById('drinkLocation').value;
    const drinkPercentage = document.getElementById('drinkPercentage').value || 0;
    const look = document.getElementById('drinkLook').value;
    const smell = document.getElementById('drinkSmell').value;
    const taste = document.getElementById('drinkTaste').value;
    const notes = document.getElementById('drinkNotes').value;
    const submitBtn = addDrinkForm.querySelector('.auth-btn');

    setLoading(submitBtn, true);
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'ADD_USER_DRINK', 
                drinkName, 
                category, 
                type, 
                location, 
                drinkPercentage, 
                look, 
                smell, 
                taste, 
                notes 
            })
        });
        const result = await response.json();
        if (!response.ok) {
            if (response.status === 401) {
                showError("A munkameneted lejárt, kérlek jelentkezz be újra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(result.error || 'Szerverhiba');
        }
        showSuccess('Ital sikeresen hozzáadva!');
        addDrinkForm.reset();
        closeAddModal('drink');
        loadUserDrinks(); // Újratöltjük az italokat
    } catch (error) {
        console.error("Hiba ital hozzáadásakor:", error);
        showError(error.message || "Nem sikerült az italt hozzáadni.");
    } finally {
        setLoading(submitBtn, false);
    }
}

async function loadUserDrinks() {
    const user = JSON.parse(localStorage.getItem('userData'));
    if (!user) return;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_USER_DRINKS' })
        });
        const drinks = await response.json();
        
        if (!response.ok) {
            if (response.status !== 401) {
                throw new Error(drinks.error || 'Szerverhiba');
            }
            return;
        }
        
        // 1. Globális változó frissítése (Eredeti indexxel!)
        currentUserDrinks = drinks.map((drink, index) => ({
            ...drink,
            originalIndex: index
        }));

        // --- ÚJ RÉSZ: ITALOK RENDEZÉSE ---
        if (currentSort.drink.column && currentSort.drink.direction) {
            sortAndRenderDrinks(currentSort.drink.column, currentSort.drink.dataType, currentSort.drink.direction);
            
            // Nyilak visszaállítása
            setTimeout(() => {
                const header = document.querySelector(`#user-drinks-content .sortable[data-sort="${currentSort.drink.column}"]`);
                if (header) updateSortArrows('drink', header, currentSort.drink.direction);
            }, 100);
        } else {
            renderUserDrinks(currentUserDrinks);
        }
        // ---------------------------------

        updateUserDrinkStats(drinks);
        
        if (typeof checkAchievements === 'function') {
            await checkAchievements();
            renderAchievements();
        }

    } catch (error) {
        console.error("Hiba az italok betöltésekor:", error);
    }
}



    // === ÖTLET LÁDA FUNKCIÓK ===

// 1. Ötlet beküldése
async function handleIdeaSubmit(e) {
    e.preventDefault();
    const text = document.getElementById('ideaText').value;
    const isAnon = document.getElementById('ideaAnonymous').checked;
    const btn = e.target.querySelector('button');

    setLoading(btn, true);

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'SUBMIT_IDEA', 
                ideaText: text, 
                isAnonymous: isAnon 
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Hiba történt.");

        showSuccess(result.message || "Ötlet sikeresen beküldve! Köszi! 💡");
        document.getElementById('ideaText').value = ''; // Törlés
        loadUserIdeas(); // Lista frissítése

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(btn, false);
    }
}

// 3. ÖTLETEK BETÖLTÉSE (BADGE TÁMOGATÁSSAL + TÖRLÉS)
async function loadUserIdeas() {
    const hallContainer = document.getElementById('hallOfFameList');
    const pendingContainer = document.getElementById('pendingIdeasList');
    
    hallContainer.innerHTML = '<div class="recap-spinner"></div>';
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_ALL_IDEAS' })
        });
        const ideas = await response.json();
        if (!response.ok) throw new Error("Nem sikerült betölteni az ötleteket.");
        
        hallContainer.innerHTML = '';
        pendingContainer.innerHTML = '';
        
        if(ideas.length === 0) {
            pendingContainer.innerHTML = '<p style="text-align:center; color:#aaa;">Még nincsenek ötletek. Légy te az első!</p>';
            return;
        }

        // Aktuális felhasználó email-je
        const userData = JSON.parse(localStorage.getItem('userData'));
        const currentUserEmail = userData ? userData.email : null;

        let hasFame = false;
        let pendingIndex = 0; // Számláló a törölhető ötletekhez

        ideas.forEach(item => {
            const isDone = (item.status === 'Megcsinálva');
            const isOwner = (item.email === currentUserEmail);
            
            const badgeHtml = item.badge 
                ? `<span class="fame-badge">${item.badge}</span>` 
                : '';

            if (isDone) {
                // DICSŐSÉGFAL
                hasFame = true;
                const card = `
                <div class="fame-card">
                    <div class="fame-user">
                        <span class="fame-avatar">👑</span>
                        <span class="fame-name">
                            ${item.submitter}
                            ${badgeHtml}
                        </span>
                    </div>
                    <div class="fame-idea">"${item.idea}"</div>
                    <div class="fame-footer">
                        Köszönjük az ötletet! • ${item.date}
                    </div>
                </div>`;
                hallContainer.insertAdjacentHTML('beforeend', card);
            } else {
                // VÁRAKOZÓ LISTA
                // Csak a saját, nem elfogadott ötleteinél jelenik meg törlés gomb
                const deleteBtn = isOwner 
                    ? `<button class="delete-idea-btn" onclick="deleteUserIdea(${pendingIndex})" title="Törlés">🗑️</button>`
                    : '';

                const card = `
                <div class="pending-idea-card">
                    <div class="pending-content">
                        <h4>${item.idea}</h4>
                        <p>
                            Beküldte: ${item.submitter} ${badgeHtml} • ${item.date}
                        </p>
                    </div>
                    <div class="pending-actions">
                        <div class="pending-status">⏳ ${item.status}</div>
                        ${deleteBtn}
                    </div>
                </div>`;
                pendingContainer.insertAdjacentHTML('beforeend', card);
                
                // Csak a nem kész ötleteket számláljuk (mert csak ezeket lehet törölni)
                pendingIndex++;
            }
        });
        
        if(!hasFame) {
            hallContainer.innerHTML = '<p style="color:#aaa; font-style:italic;">Még üres a dicsőségfal. Küldj be egy jó ötletet!</p>';
        }

    } catch (error) {
        console.error(error);
        hallContainer.innerHTML = '<p class="error">Hiba a betöltéskor.</p>';
    }
}
    
// 3. Ötletek betöltése (Admin oldal)
async function loadAllIdeasForAdmin() {
    const tbody = document.getElementById('adminIdeasTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Betöltés...</td></tr>';

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_ALL_IDEAS' })
        });

        const ideas = await response.json();
        tbody.innerHTML = '';

        if(ideas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-results">Nincsenek beküldött ötletek.</td></tr>';
            return;
        }

        ideas.forEach(item => {
            const isDone = (item.status === 'Megcsinálva');
            const statusClass = isDone ? 'status-done' : 'status-waiting';
            
            // Gomb: Ha már kész, ne legyen gomb, vagy legyen inaktív
            const actionBtn = isDone 
                ? '✅ Kész' 
                : `<button class="mark-done-btn" onclick="markIdeaAsDone(${item.index})">🏁 Kész</button>`;

            const row = `
            <tr>
                <td>${item.date}</td>
                <td>${item.submitter} <br><small style="color:#aaa;">${item.email}</small></td>
                <td>${item.idea}</td>
                <td><span class="status-badge ${statusClass}">${item.status}</span></td>
                <td>${actionBtn}</td>
            </tr>`;
            tbody.insertAdjacentHTML('beforeend', row);
        });

    } catch (error) {
        showError("Hiba az admin lista betöltésekor.");
    }
}

// 4. Státusz frissítése (Admin művelet)
async function markIdeaAsDone(index) {
    if(!confirm("Biztosan megjelölöd ezt az ötletet 'Megcsinálva' státusszal? Ezzel kikerül a Dicsőségfalra!")) return;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'UPDATE_IDEA_STATUS', 
                index: index, 
                newStatus: 'Megcsinálva' 
            })
        });

        if(response.ok) {
            showSuccess("Státusz frissítve! Irány a dicsőségfal! 🏆");
            loadAllIdeasForAdmin(); // Táblázat újratöltése
        } else {
            showError("Hiba a mentéskor.");
        }
    } catch (error) {
        showError("Hálózati hiba.");
    }
}
    
    async function handleGuestRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const termsAccepted = document.getElementById('registerTerms').checked;
        const submitBtn = registerForm.querySelector('.auth-btn');

        // --- VALIDÁCIÓK  ---
        
        // 1. Minimum 8 karakter ellenőrzése
        if (password.length < 8) {
            showError("A jelszónak legalább 8 karakter hosszúnak kell lennie!");
            return;
        }

        // 2. Szám ellenőrzése (RegExp)
        if (!/\d/.test(password)) {
            showError("A jelszónak tartalmaznia kell legalább egy számot!");
            return;
        }

        // 3. Speciális karakter ellenőrzése
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            showError("A jelszónak tartalmaznia kell legalább egy speciális karaktert!");
            return;
        }

        if (password !== passwordConfirm) {
            showError("A két jelszó nem egyezik!");
            return;
        }
        
        if (!termsAccepted) {
            showError("A regisztrációhoz el kell fogadnod az Adatvédelmi Tájékoztatót!");
            return;
        }

        // --- BEKÜLDÉS ---

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REGISTER_USER', name, email, password })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');

            // --- ITT AZ ÚJ MENŐ RÉSZ ---
            if (result.recoveryCode) {
            // Bezárjuk a regisztrációt
            registerCard.classList.remove('active');
            
            // Beírjuk a kódot az új menő ablakba
            document.getElementById('newRecoveryCodeDisplay').textContent = result.recoveryCode;
            
            // Megnyitjuk a menő ablakot
            document.getElementById('recoveryCodeModal').classList.add('active');
        } else {
            showSuccess('Sikeres regisztráció!');
            registerCard.classList.remove('active');
            setTimeout(() => loginCard.classList.add('active'), 300);
        }
        // ---------------------------

    } catch (error) {
        console.error("Regisztrációs hiba:", error);
        showError(error.message || 'A regisztráció sikertelen.');
    } finally {
        setLoading(submitBtn, false);
    }
}

    async function handleGuestLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('.auth-btn');

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'LOGIN_USER', email, password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');
            
            // --- ITT VOLT A HIÁNYZÓ RÉSZ ---
            // Ha a szerver azt mondja, hogy 2FA kell:
            if (result.require2fa) {
                tempLoginEmail = result.tempEmail; // Elmentjük az emailt későbbre
                login2FAModal.classList.add('active'); // Feldobjuk a kódkérő ablakot
                
                // Kis kényelem: fókuszáljunk a mezőre
                setTimeout(() => {
                    const input = document.getElementById('login2FACode');
                    if(input) input.focus();
                }, 100);
                
                // Megállítjuk a töltést a gombnál, de NEM lépünk tovább
                setLoading(submitBtn, false);
                return; // KILÉPÜNK A FÜGGVÉNYBŐL!
            }
            // ---------------------------------

            // Ez a rész csak akkor fut le, ha NINCS bekapcsolva a 2FA a usernél
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));

            showSuccess(`Sikeres bejelentkezés, ${result.user.name}!`);
            setTimeout(switchToUserView, 1000);
        } catch (error) {
            console.error("Bejelentkezési hiba:", error);
            showError(error.message || 'Hibás e-mail cím vagy jelszó!');
        } finally {
            // Csak akkor kapcsoljuk ki a töltést, ha nem nyílt meg a 2FA ablak
            // (Ha megnyílt, ott már kikapcsoltuk a 'if' ágban)
            if (!login2FAModal.classList.contains('active')) {
                 setLoading(submitBtn, false);
            }
        }
    }

    // --- ÚJ: FELHASZNÁLÓI FIÓK KEZELÉSE ---
    
    async function handleChangePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;
        const submitBtn = changePasswordForm.querySelector('.action-btn');

        if (newPassword !== newPasswordConfirm) {
            showError("Az új jelszavak nem egyeznek!");
            return;
        }
        if (newPassword.length < 6) {
             showError("Az új jelszónak legalább 6 karakter hosszúnak kell lennie.");
             return;
        }

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
                body: JSON.stringify({ action: 'CHANGE_PASSWORD', oldPassword: currentPassword, newPassword: newPassword })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Szerverhiba");
            
            showSuccess("Jelszó sikeresen módosítva!");
            changePasswordForm.reset();
        } catch (error) {
            showError(error.message || "Nem sikerült a jelszó módosítása.");
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // ======================================================
    // === ÚJ: FŐ NAVIGÁCIÓS FÜLEK KEZELÉSE ===
    // ======================================================

    function initializeMainTabs(viewElement) {
    // Kétféle navigációt támogatunk: a régi tab-listát (admin) és az új oldalsávot (user)
    const navButtons = viewElement.querySelectorAll('.main-tab-btn, .nav-item[data-tab-content]');
    const tabPanes = viewElement.querySelectorAll('.main-tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Megakadályozzuk, hogy a gomb belsejére kattintva elvesszen a referencia
            const clickedButton = e.target.closest('button'); 
            if (!clickedButton) return;

            // Ha kijelentkezés gomb, azt hagyjuk a saját eseménykezelőjére
            if (clickedButton.id === 'userLogoutBtn') return;

            // Aktív állapot beállítása
            navButtons.forEach(b => b.classList.remove('active'));
            clickedButton.classList.add('active');

            // Címsor frissítése mobilon
            const label = clickedButton.querySelector('.label');
            const dashboardTitle = document.querySelector('.dashboard-topbar h3');
            if(dashboardTitle && label) {
                dashboardTitle.textContent = label.textContent;
            }

            // Tartalom váltása
            const targetPaneId = clickedButton.dataset.tabContent;
            tabPanes.forEach(pane => {
                pane.classList.toggle('active', pane.id === targetPaneId);
            });
            
            // Ha az ötletekre váltunk, töltsük be
            if(targetPaneId === 'user-ideas-content') loadUserIdeas();
            if(targetPaneId === 'admin-ideas-content') loadAllIdeasForAdmin();
        });
    });
}

// 1. Modal megnyitása (JAVÍTVA: function deklarációval, hogy működjön a hívás)
function handleDeleteUser() { 
    const modal = document.getElementById('deleteAccountModal');
    const input = document.getElementById('deleteConfirmationInput');
    const btn = document.getElementById('finalDeleteBtn');
    
    // Reset
    if(input) input.value = '';
    if(btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
    }
    
    if(modal) modal.classList.add('active');
    
    // Figyeljük, hogy beírta-e a TÖRLÉS szót
    if(input) {
        input.oninput = function() {
            if (this.value === 'TÖRLÉS') {
                btn.disabled = false;
                btn.style.opacity = '1';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
            }
        }
    }
}
// Ezzel biztosítjuk, hogy globálisan is elérhető maradjon (pl. onclick attribútumból)
window.handleDeleteUser = handleDeleteUser;

// 2. Modal bezárása
window.closeDeleteModal = function() {
    const modal = document.getElementById('deleteAccountModal');
    if (modal) modal.classList.remove('active');
}

// 3. A tényleges törlés indítása
window.confirmDeleteAccount = async function() {
    const btn = document.getElementById('finalDeleteBtn');
    const input = document.getElementById('deleteConfirmationInput');
    
    // Biztonsági ellenőrzés kliens oldalon is
    if(input.value !== 'TÖRLÉS') return;
    
    btn.innerText = "Törlés folyamatban...";
    setLoading(btn, true); // Feltételezve, hogy a setLoading elérhető globálisan

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ action: 'DELETE_USER' })
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || "Szerverhiba");

        // Siker!
        window.closeDeleteModal();
        alert("A fiókodat és minden adatodat töröltük. Viszlát! 👋");
        
        // Ha van ilyen függvényed a kilépéshez:
        if (typeof switchToGuestView === 'function') {
            switchToGuestView();
        } else {
            location.reload(); // Ha nincs, újratöltjük az oldalt
        }

    } catch (error) {
        // Ha van showError függvényed:
        if (typeof showError === 'function') {
            showError(error.message || "A fiók törlése nem sikerült.");
        } else {
            alert(error.message || "A fiók törlése nem sikerült.");
        }
        btn.innerText = "Végleges Törlés 💣";
    } finally {
        // Ha van setLoading függvényed:
        if (typeof setLoading === 'function') {
            setLoading(btn, false);
        }
    }
}
    
// ======================================================
    // === ÚJ: STATISZTIKA FUNKCIÓK ===
    // ======================================================

    function setupStatistics() {
        statTabButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const targetTab = e.target.dataset.tab;
                switchStatTab(targetTab);
            }
        });

}
    // js.js (ÚJ FUNKCIÓ)
function setupAdminRecap() {
    const recapTabContainer = document.getElementById('admin-recap-content');
    if (!recapTabContainer) return; // Csak akkor fut, ha létezik a konténer

    const tabButtons = document.getElementById('adminRecapTabButtons');
    const controls = document.getElementById('adminRecapControls');
    const resultsContainer = document.getElementById('adminRecapResultsContainer');
    
    // 1. Belső fül váltó (Közös, Gabz, Lajos)
    tabButtons.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.stat-tab-btn');
        if (!clickedButton) return;
        
        currentAdminRecapView = clickedButton.dataset.tab;
        
        // Gombok aktív állapotának frissítése
        tabButtons.querySelectorAll('.stat-tab-btn').forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        
        // Eredmény törlése váltáskor
        resultsContainer.innerHTML = '<p class="recap-placeholder">Válassz egy időszakot a kezdéshez.</p>';
    });

    // 2. Időszak gomb (Heti, Havi...)
    controls.addEventListener('click', (e) => {
        const button = e.target.closest('.recap-btn');
        if (!button) return;
        
        const period = button.dataset.period;
        // Átadjuk a gombot és a periódust az új generáló funkciónak
        handleAdminRecapGenerate(period, button);
    });
}

    function switchStatTab(tabName) {
        statTabButtons.querySelectorAll('.stat-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        statPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-stats`);
        });
    }

    function destroyAllCharts() {
        Object.values(charts).forEach(chart => chart.destroy());
        charts = {};
    }

    function renderAllCharts(beers) {
        destroyAllCharts(); // Előző grafikonok törlése újrarajzolás előtt

        const gabzBeers = beers.filter(b => b.ratedBy === 'admin1');
        const lajosBeers = beers.filter(b => b.ratedBy === 'admin2');

        // Közös statisztikák
        renderKpis('common', beers);
        renderTypeChart('common-type-chart', 'Sörök típus szerint (Közös)', beers);
        renderScoreDistributionChart('common-score-dist-chart', 'Pontszámok eloszlása (Közös)', beers);
        renderMonthlyAverageChart('common-monthly-avg-chart', 'Havi átlagpontszám alakulása (Közös)', beers);

        // Gabz statisztikák
        renderKpis('gabz', gabzBeers);
        renderTypeChart('gabz-type-chart', 'Sörök típus szerint (Gabz)', gabzBeers);
        renderScoreDistributionChart('gabz-score-dist-chart', 'Pontszámok eloszlása (Gabz)', gabzBeers);

        // Lajos statisztikák
        renderKpis('lajos', lajosBeers);
        renderTypeChart('lajos-type-chart', 'Sörök típus szerint (Lajos)', lajosBeers);
        renderScoreDistributionChart('lajos-score-dist-chart', 'Pontszámok eloszlása (Lajos)', lajosBeers);
    }

    function renderKpis(prefix, beers) {
        if (beers.length === 0) return;

        // Legjobb sör
        const bestBeer = beers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), beers[0]);
        document.getElementById(`${prefix}-best-beer`).textContent = `${bestBeer.beerName} (${bestBeer.totalScore} pont)`;

        // Kedvenc típus
        const typeCounts = beers.reduce((acc, beer) => { acc[beer.type] = (acc[beer.type] || 0) + 1; return acc; }, {});
        const favType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
        document.getElementById(`${prefix}-fav-type`).textContent = favType;
        
        if (prefix === 'common') {
             // Leggyakoribb hely
            const locationCounts = beers.reduce((acc, beer) => { acc[beer.location] = (acc[beer.location] || 0) + 1; return acc; }, {});
            const favLocation = Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b);
            document.getElementById(`common-fav-location`).textContent = favLocation;
        } else {
            // Személyes átlag
            const avgScore = (beers.reduce((sum, b) => sum + b.totalScore, 0) / beers.length).toFixed(2);
            document.getElementById(`${prefix}-avg-score`).textContent = `${avgScore} pont`;
        }
    }

    function renderTypeChart(canvasId, title, beers) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const typeCounts = beers.reduce((acc, beer) => {
            const type = beer.type || 'Ismeretlen';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
        
        charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    label: 'Sörök száma',
                    data: Object.values(typeCounts),
                    backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#f39c12', '#27ae60', '#3498db'],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 16 } } } }
        });
    }

    function renderScoreDistributionChart(canvasId, title, beers) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const scoreCounts = beers.reduce((acc, beer) => {
            const score = beer.totalScore || 0;
            acc[score] = (acc[score] || 0) + 1;
            return acc;
        }, {});

        charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(scoreCounts).sort((a,b) => a-b),
                datasets: [{
                    label: 'Értékelések száma',
                    data: Object.values(scoreCounts),
                    backgroundColor: 'rgba(118, 75, 162, 0.7)',
                    borderColor: 'rgba(118, 75, 162, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { title: { display: true, text: title, font: { size: 16 } } } }
        });
    }
    
    function renderMonthlyAverageChart(canvasId, title, beers) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        const monthlyData = beers.reduce((acc, beer) => {
            if (!beer.date) return acc;
            const month = new Date(beer.date).toISOString().slice(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = { sum: 0, count: 0 };
            }
            acc[month].sum += beer.totalScore;
            acc[month].count++;
            return acc;
        }, {});

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(m => new Date(m + '-02').toLocaleString('hu-HU', { year:'numeric', month: 'short' }));
        const data = sortedMonths.map(m => monthlyData[m].sum / monthlyData[m].count);

        charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Átlagpontszám',
                    data: data,
                    fill: true,
                    backgroundColor: 'rgba(102, 126, 234, 0.2)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    tension: 0.1
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: title, font: { size: 16 } } } }
        });
    }


    
   // ======================================================
    // === NÉZETVÁLTÁS ÉS ADATKEZELÉS ===
    // ======================================================
    
    function switchToGuestView() {
        document.body.classList.remove('custom-cursor-active');
        
        // 1. Töröljük a helyi tárolót
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        // 2. Globális adatok nullázása (Achievement bug ellen)
        currentUserBeers = [];
        currentUserDrinks = [];
        beersData = []; 
        usersData = [];
        filteredBeers = [];
        allRecommendationsData = []; 
        
        // 3. UI elemek "takarítása"
        const achiGrid = document.getElementById('achievementsGrid');
        if (achiGrid) achiGrid.innerHTML = ''; 
        
        const progBar = document.getElementById('achievementProgressBar');
        if (progBar) {
            progBar.style.width = '0%';
            progBar.style.background = '#bdc3c7';
        }

        const progText = document.getElementById('achievementProgressText');
        if (progText) progText.textContent = '';
        
        const currentLevelDisplay = document.getElementById('currentLevelDisplay');
        if (currentLevelDisplay) {
            currentLevelDisplay.textContent = '-';
            currentLevelDisplay.style.background = 'transparent';
            currentLevelDisplay.style.boxShadow = 'none';
        }

        const headerBadge = document.querySelector('.user-badge-display');
        if (headerBadge) headerBadge.remove();

        if (typeof userWelcomeMessage !== 'undefined' && userWelcomeMessage) {
            userWelcomeMessage.textContent = '';
        }

        // --- ÚJ RÉSZ: A SEGÍTSÉG GOMB VISSZAHOZÁSA ---
        const guestSupportBtn = document.getElementById('guestSupportBtn');
        if (guestSupportBtn) {
            guestSupportBtn.style.display = 'block'; // Vagy 'flex', ha elcsúszna, de a block általában jó
        }
        // ---------------------------------------------

        // 4. Nézetek kezelése
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        userView.style.display = 'none';
        
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        
        if (typeof liveSearchInput !== 'undefined') liveSearchInput.value = '';
        if (typeof hideSearchSuggestions === 'function') hideSearchSuggestions();
    }
    
    async function loadUserData() {
    const user = JSON.parse(localStorage.getItem('userData'));
    if (!user) {
        if(document.getElementById('userView').style.display !== 'none') {
             showError('Nem vagy bejelentkezve.');
             switchToGuestView();
        }
        return;
    }
    
    if(userWelcomeMessage) userWelcomeMessage.textContent = `Szia, ${user.name}!`;
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_USER_BEERS' })
        });
        const beers = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                showError("A munkameneted lejárt, jelentkezz be újra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(beers.error || 'Szerverhiba');
        }
        
        // 1. Globális változó frissítése (Eredeti indexxel, amit az előbb beszéltünk!)
        currentUserBeers = beers.map((beer, index) => ({
            ...beer,
            originalIndex: index
        }));

        // --- ÚJ RÉSZ: RENDEZÉS ELLENŐRZÉSE ---
        // Ha van aktív rendezés, akkor azt alkalmazzuk, különben sima renderelés
        if (currentSort.beer.column && currentSort.beer.direction) {
            sortAndRenderBeers(currentSort.beer.column, currentSort.beer.dataType, currentSort.beer.direction);
            
            // Fontos: A nyilakat is vissza kell rakni a helyére!
            // Megkeressük a megfelelő fejlécet
            setTimeout(() => {
                const header = document.querySelector(`#user-beers-content .sortable[data-sort="${currentSort.beer.column}"]`);
                if (header) updateSortArrows('beer', header, currentSort.beer.direction);
            }, 100);
        } else {
            // Ha nincs rendezés, akkor az alap (szerver szerinti) sorrend
            renderUserBeers(currentUserBeers);
        }
        // --------------------------------------

        updateUserStats(currentUserBeers); // Megjegyzés: itt currentUserBeers-t használunk a beers helyett, de mindegy mert ugyanaz

        // Achievementek
        if (typeof checkAchievements === 'function') {
            await checkAchievements();
            renderAchievements(); 
        }

    } catch (error) {
        console.error("Hiba a felhasználói adatok betöltésekor:", error);
        showError(error.message || "Nem sikerült betölteni a söreidet.");
    }
}
    
    
    function updateUserStats(beers) {
    // 1. Fejléc statisztikák frissítése (ha léteznek)
    const headerCount = document.getElementById('headerBeerCount');
    const headerAvg = document.getElementById('headerAvgScore');

    if(headerCount) headerCount.textContent = beers.length;

    // 2. Tabon belüli statisztikák frissítése
    const tabCount = document.getElementById('tabBeerCount');
    const tabAvg = document.getElementById('tabBeerAvg');

    if (tabCount) tabCount.textContent = beers.length;

    if (beers.length === 0) {
        if(headerAvg) headerAvg.textContent = '0.0';
        if(tabAvg) tabAvg.textContent = '0.0';
        return;
    }

    // --- JAVÍTOTT SZÁMOLÁS: ÁTLAGOK ÁTLAGA ---
    const totalAvgSum = beers.reduce((total, beer) => {
        // Biztonságos konverzió: vessző cseréje pontra, majd számmá alakítás
        const val = parseFloat(beer.avg.toString().replace(',', '.')) || 0;
        return total + val;
    }, 0);
    
    const average = (totalAvgSum / beers.length).toFixed(2);
    // ------------------------------------------
    
    if(headerAvg) headerAvg.textContent = average;
    if(tabAvg) tabAvg.textContent = average;
}
    

    function updateUserDrinkStats(drinks) {
    // Fejléc statisztikák
    const headerCount = document.getElementById('headerDrinkCount');
    const headerAvg = document.getElementById('headerDrinkAvgScore');

    if(headerCount) headerCount.textContent = drinks.length;

    if (drinks.length === 0) {
        if(headerAvg) headerAvg.textContent = '0.0';
        return;
    }
    
    // --- JAVÍTOTT SZÁMOLÁS: ÁTLAGOK ÁTLAGA ---
    const totalAvgSum = drinks.reduce((total, drink) => {
        // Biztonságos konverzió: vessző cseréje pontra, majd számmá alakítás
        const val = parseFloat(drink.avg.toString().replace(',', '.')) || 0;
        return total + val;
    }, 0);

    const average = (totalAvgSum / drinks.length).toFixed(2);
    // ------------------------------------------
    
    if(headerAvg) headerAvg.textContent = average;
}

    function calculateIndexedAverage(beers = beersData) {
        if (!beers || beers.length === 0) return 0;
        const validAverages = beers.map(beer => parseFloat(beer.avg.toString().replace(',', '.')) || 0).filter(avg => avg > 0);
        if (validAverages.length === 0) return 0;
        const sum = validAverages.reduce((total, avg) => total + avg, 0);
        return (sum / validAverages.length).toFixed(2);
    }

    function updateIndexedAverage() {
        const average = calculateIndexedAverage(filteredBeers.length > 0 ? filteredBeers : beersData);
        const avgElement = document.getElementById('indexedAverage');
        avgElement.textContent = average;
        const avgValue = parseFloat(average);
        if (avgValue >= 4.0) { avgElement.style.color = '#27ae60'; } 
        else if (avgValue >= 3.0) { avgElement.style.color = '#f39c12'; }
        else if (avgValue >= 2.0) { avgElement.style.color = '#e67e22'; } 
        else { avgElement.style.color = '#e74c3c'; }
    }

    function initializeLiveSearch() {
        liveSearchInput.addEventListener('input', handleLiveSearch);
        liveSearchInput.addEventListener('keydown', handleSearchKeyNavigation);
        liveSearchInput.addEventListener('focus', showSearchSuggestions);
        liveSearchInput.addEventListener('blur', hideSearchSuggestionsDelayed);
        clearSearch.addEventListener('click', clearSearchInput);
        searchSuggestions.addEventListener('mousedown', handleSuggestionClick);
    }

    function handleLiveSearch() {
        const searchTerm = liveSearchInput.value.trim();
        clearSearch.style.display = searchTerm ? 'flex' : 'none';
        if (!searchTerm) {
            filteredBeers = [...beersData];
            hideSearchSuggestions();
            updateSearchResultsInfo();
            updateIndexedAverage();
            renderBeerTable(filteredBeers);
            return;
        }
        performLiveSearch(searchTerm);
        showSearchSuggestions();
        updateSearchResultsInfo();
        updateIndexedAverage();
    }

    function performLiveSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredBeers = beersData.filter(beer => 
            (beer.beerName?.toLowerCase() || '').includes(term) ||
            (beer.type?.toLowerCase() || '').includes(term) ||
            (beer.location?.toLowerCase() || '').includes(term) ||
            (beer.ratedBy?.toLowerCase() || '').includes(term)
        );
        filteredBeers.sort((a, b) => {
            const aName = (a.beerName?.toLowerCase() || '').includes(term);
            const bName = (b.beerName?.toLowerCase() || '').includes(term);
            if (aName && !bName) return -1;
            if (!aName && bName) return 1;
            return 0;
        });
        renderBeerTable(filteredBeers);
    }

    function generateSearchSuggestions(searchTerm) {
        if (!searchTerm) return [];
        const term = searchTerm.toLowerCase();
        const suggestions = new Map();
        beersData.forEach(beer => {
            if (beer.beerName?.toLowerCase().includes(term) && !suggestions.has(beer.beerName)) { suggestions.set(beer.beerName, { text: beer.beerName, type: 'beer', icon: '🍺' }); }
            if (beer.type?.toLowerCase().includes(term) && !suggestions.has(beer.type)) { suggestions.set(beer.type, { text: beer.type, type: 'type', icon: '🏷️' }); }
            if (beer.location?.toLowerCase().includes(term) && !suggestions.has(beer.location)) { suggestions.set(beer.location, { text: beer.location, type: 'location', icon: '📍' }); }
            if (beer.ratedBy?.toLowerCase().includes(term) && !suggestions.has(beer.ratedBy)) { suggestions.set(beer.ratedBy, { text: beer.ratedBy, type: 'rater', icon: '👤' }); }
        });
        return Array.from(suggestions.values()).slice(0, 6);
    }

    function showSearchSuggestions() {
        const searchTerm = liveSearchInput.value.trim();
        if (!searchTerm) { hideSearchSuggestions(); return; }
        const suggestions = generateSearchSuggestions(searchTerm);
        if (suggestions.length === 0) { hideSearchSuggestions(); return; }
        searchSuggestions.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}" data-text="${suggestion.text}">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-text">${highlightSearchTerm(suggestion.text, searchTerm)}</span>
                <span class="suggestion-type">${getSuggestionTypeLabel(suggestion.type)}</span>
            </div>`).join('');
        searchSuggestions.style.display = 'block';
    }

    function hideSearchSuggestions() { searchSuggestions.style.display = 'none'; selectedSuggestionIndex = -1; }
    function hideSearchSuggestionsDelayed() { setTimeout(() => hideSearchSuggestions(), 150); }

    function handleSearchKeyNavigation(e) {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1); updateSelectedSuggestion(); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1); updateSelectedSuggestion(); } 
        else if (e.key === 'Enter') { e.preventDefault(); if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) { selectSuggestion(suggestions[selectedSuggestionIndex].dataset.text); } } 
        else if (e.key === 'Escape') { hideSearchSuggestions(); liveSearchInput.blur(); }
    }

    function updateSelectedSuggestion() {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => item.classList.toggle('selected', index === selectedSuggestionIndex));
    }

    function handleSuggestionClick(e) { const item = e.target.closest('.suggestion-item'); if (item) { selectSuggestion(item.dataset.text); } }
    function selectSuggestion(text) { liveSearchInput.value = text; hideSearchSuggestions(); handleLiveSearch(); liveSearchInput.focus(); }
    function clearSearchInput() { liveSearchInput.value = ''; clearSearch.style.display = 'none'; filteredBeers = [...beersData]; hideSearchSuggestions(); updateSearchResultsInfo(); updateIndexedAverage(); renderBeerTable(filteredBeers); liveSearchInput.focus(); }

    function updateSearchResultsInfo() {
        const total = beersData.length;
        const filtered = filteredBeers.length;
        const searchTerm = liveSearchInput.value.trim();
        if (!searchTerm) { searchResultsInfo.textContent = `${total} sör összesen`; searchResultsInfo.style.color = ''; } 
        else if (filtered === 0) { searchResultsInfo.textContent = `Nincs találat "${searchTerm}" keresésre`; searchResultsInfo.style.color = '#e74c3c'; } 
        else { searchResultsInfo.textContent = `${filtered} találat ${total} sörből`; searchResultsInfo.style.color = '#3498db'; }
    }

    function highlightSearchTerm(text, searchTerm) { if (!searchTerm) return text; const regex = new RegExp(`(${searchTerm})`, 'gi'); return text.replace(regex, '<mark>$1</mark>'); }
    function getSuggestionTypeLabel(type) { const labels = { 'beer': 'Sör név', 'type': 'Típus', 'location': 'Hely', 'rater': 'Értékelő' }; return labels[type] || ''; }
    function getTestedBy(ratedBy) { const testers = { 'admin1': 'Gabz', 'admin2': 'Lajos' }; return testers[ratedBy] || ratedBy; }

    function renderBeerTable(beersToRender) {
        beerTableBody.innerHTML = '';
        if (!beersToRender || beersToRender.length === 0) { const searchTerm = liveSearchInput.value.trim(); const message = searchTerm ? `Nincs a "${searchTerm}" keresésnek megfelelő sör.` : 'Nincsenek sörök az adatbázisban.'; beerTableBody.innerHTML = `<tr><td colspan="10" class="no-results">${message}</td></tr>`; return; }
        beersToRender.forEach(beer => {
            const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : 'N/A';
            const formattedAvg = beer.avg ? parseFloat(beer.avg.toString().replace(',', '.')).toFixed(2) : '0.00';
            const row = `
                <tr>
                    <td>${formattedDate}</td>
                    <td>${beer.beerName || ''}</td>
                    <td>${beer.location || ''}</td>
                    <td>${beer.beerPercentage || 0}%</td>
                    <td>${beer.look || 0}</td>
                    <td>${beer.smell || 0}</td>
                    <td>${beer.taste || 0}</td>
                    <td>${beer.totalScore || 0}</td>
                    <td class="average-cell">${formattedAvg}</td>
                    <td>${getTestedBy(beer.ratedBy)}</td>
                </tr>`;
            beerTableBody.insertAdjacentHTML('beforeend', row);
        });
    }

    function loadAdminData() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
        filteredBeers = [...beersData];
        renderBeerTable(filteredBeers);
        updateSearchResultsInfo();
        updateIndexedAverage();
        renderAllCharts(beersData); // STATISZTIKÁK KIRAJZOLÁSA
    }
    function switchToAdminView() {
        document.body.classList.add('custom-cursor-active');
        guestView.style.display = 'none';
        userView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';

        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed'; // Háttér fixálása

        // Fő fülek inicializálása az admin nézeten
        initializeMainTabs(adminView);

        loadAdminData();
        initializeLiveSearch();
        setupStatistics(); // Statisztika fül inicializálása
        setupAdminRecap();
    }

    // --- Eseménykezelők ---
    
    logoutBtn.addEventListener('click', switchToGuestView);
    refreshBtn.addEventListener('click', loadAdminData);

    loginForm.addEventListener('submit', handleGuestLogin);
    registerForm.addEventListener('submit', handleGuestRegister);
    
    // Felhasználói nézet eseménykezelői
    userLogoutBtn.addEventListener('click', switchToGuestView);
    addBeerForm.addEventListener('submit', handleAddBeer);
    addDrinkForm.addEventListener('submit', handleAddDrink);
    changePasswordForm.addEventListener('submit', handleChangePassword);
    deleteUserBtn.addEventListener('click', handleDeleteUser);
    recapControls.addEventListener('click', handleRecapPeriodClick);

    switchAuthLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); if (this.dataset.target === 'register') { loginCard.classList.remove('active'); setTimeout(() => registerCard.classList.add('active'), 300); } else { registerCard.classList.remove('active'); setTimeout(() => loginCard.classList.add('active'), 300); } }); });


   // ======================================================
// === EGYSÉGESÍTETT STORY / RECAP RENDSZER (ADMIN ÉS USER) ===
// ======================================================

// Segédfüggvény: Dátum biztonságos konvertálása
function parseBeerDate(dateString) {
    if (!dateString) return null;
    // Megpróbáljuk ISO-ként (pl. 2023-10-10 12:00:00)
    let d = new Date(dateString.replace(' ', 'T'));
    // Ha nem sikerült, próbáljuk simán (pl. 2023. 10. 10.)
    if (isNaN(d.getTime())) {
        d = new Date(dateString);
    }
    return isNaN(d.getTime()) ? null : d;
}

// Segédfüggvény: Kezdő dátum kiszámolása
function getStartDateForPeriod(period) {
    const now = new Date();
    let startDate = new Date();
    switch (period) {
        case 'weekly': startDate.setDate(now.getDate() - 7); break;
        case 'monthly': startDate.setMonth(now.getMonth() - 1); break;
        case 'quarterly': startDate.setMonth(now.getMonth() - 3); break;
        case 'yearly': startDate.setFullYear(now.getFullYear() - 1); break;
    }
    return startDate;
}

// Segédfüggvény: Statisztikák számolása (Közös logika)
function calculateRecapStats(beers) {
    if (!beers || beers.length === 0) return null;

    const totalBeers = beers.length;
    // Pontszámok biztosítása
    const validBeers = beers.map(b => ({ ...b, totalScore: parseFloat(b.totalScore) || 0 }));
    
    // Átlag
    const sumScore = validBeers.reduce((sum, b) => sum + b.totalScore, 0);
    const averageScore = (sumScore / totalBeers).toFixed(2);
    
    // Legjobb sör
    const bestBeer = validBeers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), validBeers[0]);
    
    // Kedvenc típus
    const typeCounts = validBeers.reduce((acc, beer) => {
        const val = beer.type || 'Egyéb';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    const favoriteType = Object.keys(typeCounts).sort((a,b) => typeCounts[b] - typeCounts[a])[0] || '-';

    // Kedvenc hely
    const locCounts = validBeers.reduce((acc, beer) => {
        const val = beer.location || 'Ismeretlen';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    const favoriteLocation = Object.keys(locCounts).sort((a,b) => locCounts[b] - locCounts[a])[0] || '-';

    // Átlagos ivási idő (óra)
    let avgHour = 18; // Default
    const hours = validBeers.map(b => {
        const d = parseBeerDate(b.date);
        return d ? d.getHours() : null;
    }).filter(h => h !== null);
    
    if (hours.length > 0) {
        avgHour = Math.floor(hours.reduce((a,b)=>a+b,0) / hours.length);
    }

    return {
        count: totalBeers,
        avg: averageScore,
        topBeer: bestBeer.beerName,
        topScore: bestBeer.totalScore,
        favType: favoriteType,
        favPlace: favoriteLocation,
        drinkingTime: `${avgHour}:00`
    };
}

// === 1. USER OLDALI KEZELŐ ===
async function handleRecapPeriodClick(e) {
    const button = e.target.closest('.recap-btn');
    if (!button) return;
    if (button.closest('#adminRecapControls')) return; // Admin gomboknál ne fusson

    const period = button.dataset.period;
    const container = document.getElementById('recapResultsContainer');
    container.innerHTML = '<div class="recap-spinner"></div>';

    setTimeout(() => {
        try {
            const startDate = getStartDateForPeriod(period);
            const now = new Date();

            if (!currentUserBeers || currentUserBeers.length === 0) {
                container.innerHTML = `<p class="recap-no-results">Még nem értékeltél söröket. 🍺</p>`;
                return;
            }

            const filtered = currentUserBeers.filter(beer => {
                const d = parseBeerDate(beer.date);
                return d && d >= startDate && d <= now;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<p class="recap-no-results">Ebben az időszakban nem volt aktivitás.</p>`;
                return;
            }

            const data = calculateRecapStats(filtered);
            data.periodName = getPeriodName(period);
            
            renderStoryMode(data, container);

        } catch (err) {
            console.error(err);
            container.innerHTML = `<p class="recap-no-results">Hiba történt. :(</p>`;
        }
    }, 500);
}

// === 2. ADMIN OLDALI KEZELŐ ===
async function handleAdminRecapGenerate(period, button) {
    const resultsContainer = document.getElementById('adminRecapResultsContainer');
    
    // UI Loading
    const allButtons = button.closest('.recap-controls').querySelectorAll('.recap-btn');
    allButtons.forEach(btn => btn.classList.remove('loading'));
    button.classList.add('loading');
    resultsContainer.innerHTML = '<div class="recap-spinner"></div>';

    setTimeout(() => {
        try {
            // Szűrés a kiválasztott fül alapján (Közös/Gabz/Lajos)
            let targetBeers = [];
            if (currentAdminRecapView === 'common') {
                targetBeers = [...beersData];
            } else {
                const filterKey = (currentAdminRecapView === 'gabz') ? 'admin1' : 'admin2';
                targetBeers = beersData.filter(b => b.ratedBy === filterKey);
            }

            // Dátum szűrés
            const startDate = getStartDateForPeriod(period);
            const now = new Date();
            
            const filtered = targetBeers.filter(beer => {
                const d = parseBeerDate(beer.date);
                return d && d >= startDate && d <= now;
            });

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `<p class="recap-no-results">Nincs adat erre az időszakra.</p>`;
                button.classList.remove('loading');
                return;
            }

            const data = calculateRecapStats(filtered);
            // Cím módosítása, hogy látszódjon kiről van szó
            const userLabels = { 'common': 'Közös', 'gabz': 'Gabz', 'lajos': 'Lajos' };
            data.periodName = `${userLabels[currentAdminRecapView]} - ${getPeriodName(period)}`;

            // UGYANAZT a Story módot hívjuk meg!
            renderStoryMode(data, resultsContainer);

        } catch (error) {
            console.error("Admin recap hiba:", error);
            resultsContainer.innerHTML = `<p class="recap-no-results">Hiba történt.</p>`;
        } finally {
            button.classList.remove('loading');
        }
    }, 500);
}

function getPeriodName(period) {
    const names = { 'weekly': 'Heti', 'monthly': 'Havi', 'quarterly': 'Negyedéves', 'yearly': 'Éves' };
    return names[period] || 'Összesítő';
}

// === STORY MODE RENDERER (ANIMÁCIÓ & HTML) ===
let storyInterval;

function renderStoryMode(data, container) {
    // HTML Struktúra
    const html = `
<div class="recap-story-container" id="storyContainer">
    <button class="story-fullscreen-btn" onclick="toggleFullscreen()">
        ⛶
    </button>

    <div class="story-progress-container">
        <div class="story-progress-bar" id="bar-0"><div class="story-progress-fill"></div></div>
        <div class="story-progress-bar" id="bar-1"><div class="story-progress-fill"></div></div>
        <div class="story-progress-bar" id="bar-2"><div class="story-progress-fill"></div></div>
        <div class="story-progress-bar" id="bar-3"><div class="story-progress-fill"></div></div>
    </div>

    <div class="story-nav-left" onclick="prevSlide()"></div>
    <div class="story-nav-right" onclick="nextSlide()"></div>

    <div class="story-slide active" id="slide-0">
        <h3 class="story-title">${data.periodName}</h3>
        <p class="story-text">Nem voltál szomjas!</p>
        <div class="story-big-number">${data.count}</div>
        <p class="story-text">sört kóstoltál meg.</p>
        <span style="font-size: 3rem; margin-top: 20px;">🍻</span>
    </div>

    <div class="story-slide" id="slide-1">
        <h3 class="story-title">Az abszolút kedvenc</h3>
        <p class="story-text">Ez vitte a prímet:</p>
        <span class="story-highlight" style="font-size: 1.8rem; margin: 20px 0; word-wrap: break-word;">${data.topBeer}</span>
        <div class="recap-stat-value" style="font-size: 2.5rem;">${data.topScore} ⭐</div>
    </div>

    <div class="story-slide" id="slide-2">
        <h3 class="story-title">Így szereted</h3>
        <p class="story-text">Kedvenc típus:</p>
        <span class="story-highlight">${data.favType}</span>
        <br>
        <p class="story-text">Legtöbbször itt:</p>
        <span class="story-highlight">${data.favPlace}</span>
        <br>
        <p class="story-text">Átlagos időpont:</p>
        <span class="story-highlight">${data.drinkingTime}</span>
    </div>

    <div class="story-slide" id="slide-3" style="z-index: 30;"> 
        <h3 class="story-title">Összegzés</h3>
        <div class="story-summary-grid" id="captureTarget">
            <div class="summary-item">
                <span class="summary-label">Összes sör</span>
                <span class="summary-value">${data.count} db</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Átlag</span>
                <span class="summary-value">${data.avg}</span>
            </div>
            <div class="summary-item" style="grid-column: 1/-1">
                <span class="summary-label">Top Sör</span>
                <span class="summary-value">${data.topBeer}</span>
            </div>
        </div>
        
        <div class="story-actions">
            <button class="story-btn btn-restart" onclick="startStory(0)">Újra ⟳</button>
            <button class="story-btn btn-download" onclick="downloadRecap()">Mentés 📥</button>
        </div>
    </div>
</div>
`;

    container.innerHTML = html;
    
    // Indítás
    window.currentSlide = 0;
    window.totalSlides = 4;
    startStory(0);
}

// Globális függvények (hogy a HTML gombok elérjék őket)
window.startStory = function(slideIndex) {
    if(storyInterval) clearInterval(storyInterval);
    window.currentSlide = slideIndex;
    showSlide(window.currentSlide);
}

window.nextSlide = function() {
    if (window.currentSlide < window.totalSlides - 1) {
        window.currentSlide++;
        showSlide(window.currentSlide);
    }
}

window.prevSlide = function() {
    if (window.currentSlide > 0) {
        window.currentSlide--;
        showSlide(window.currentSlide);
    }
}

function showSlide(index) {
    document.querySelectorAll('.story-slide').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    document.querySelectorAll('.story-progress-bar').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        el.querySelector('.story-progress-fill').style.width = '0%';
        
        if (i < index) {
            el.classList.add('completed');
            el.querySelector('.story-progress-fill').style.width = '100%';
        } else if (i === index) {
            el.classList.add('active');
            animateProgress(el.querySelector('.story-progress-fill'));
        }
    });
}

function animateProgress(fillElement) {
    if(storyInterval) clearInterval(storyInterval);
    let width = 0;
    const isLast = window.currentSlide === window.totalSlides - 1;
    
    storyInterval = setInterval(() => {
        width += 1;
        fillElement.style.width = width + '%';
        if (width >= 100) {
            clearInterval(storyInterval);
            if (!isLast) {
                window.nextSlide();
            }
        }
    }, 40); // 4mp / slide
}

window.downloadRecap = function() {
    const element = document.getElementById('storyContainer');
    if (!element) return;

    // Elemek elrejtése a képről
    const actions = element.querySelector('.story-actions');
    const navL = element.querySelector('.story-nav-left');
    const navR = element.querySelector('.story-nav-right');
    
    if(actions) actions.style.display = 'none';
    if(navL) navL.style.display = 'none';
    if(navR) navR.style.display = 'none';

    // Ellenőrizzük, hogy a html2canvas be van-e töltve
    if (typeof html2canvas === 'undefined') {
        alert("Hiba: A html2canvas könyvtár nincs betöltve! Ellenőrizd az index.html fájlt.");
        if(actions) actions.style.display = 'flex';
        return;
    }

    html2canvas(element, { 
        backgroundColor: '#10002b',
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'sor-recap-2025.png';
        link.href = canvas.toDataURL();
        link.click();
        
        // Visszaállítás
        if(actions) actions.style.display = 'flex';
        if(navL) navL.style.display = 'block';
        if(navR) navR.style.display = 'block';
        showSuccess("Sikeres letöltés! 📸");
    }).catch(err => {
        console.error(err);
        showError("Nem sikerült a kép mentése.");
        if(actions) actions.style.display = 'flex';
    });
}

// --- SEGÉDFÜGGVÉNYEK ---
// ... (a fájl többi része változatlan) ...
    
    // --- SEGÉDFÜGGVÉNYEK ---
    function setLoading(button, isLoading) { button.classList.toggle('loading', isLoading); button.disabled = isLoading; }
    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showNotification(message, type) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; Object.assign(notification.style, { position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px', color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)', transition: 'transform 0.3s ease', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db') }); document.body.appendChild(notification); setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100); setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); }, 4000); }
    
    console.log('🍺 Gabz és Lajos Sör Táblázat alkalmazás betöltve!');
// === DINAMIKUS FEJLÉC SCROLL KEZELÉS (JAVÍTOTT) ===
let lastScrollTop = 0;

window.addEventListener('scroll', function() {
    // Itt a querySelector helyett querySelectorAll-t használunk, hogy MINDEN fejlécet megtaláljon
    const headers = document.querySelectorAll('.admin-header'); 
    
    if (headers.length === 0) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.min(scrollTop / 300, 1); // 300px-ig töltődik
    
    // Végigmegyünk az összes megtalált fejlécen (User és Admin is)
    headers.forEach(header => {
        // Sör feltöltés animáció - inline style-lal állítjuk be
        header.style.setProperty('--fill-percent', scrollPercent);
        
        if (scrollPercent >= 1) {
            header.classList.add('filled');
        } else {
            header.classList.remove('filled');
        }
        
        // Fejléc elrejtése lefelé görgetéskor (csak ha már van görgetés)
        if (scrollTop > lastScrollTop && scrollTop > 350) {
            header.classList.add('hidden');
        } else if (scrollTop < lastScrollTop || scrollTop < 100) {
            header.classList.remove('hidden');
        }
    });
    
    lastScrollTop = scrollTop;
    // ======================================================
    // === SZEMÉLYRE SZABÁS (BEÁLLÍTÁSOK MENTÉSE) - JAVÍTOTT ===
    // ======================================================

    // Beállítás betöltése és szinkronizálása
    function loadUserPreferences(userEmail) {
        if (!userEmail) return;

        const userToggle = document.getElementById('userCursorToggle');
        const adminToggle = document.getElementById('adminCursorToggle');

        // Egyedi kulcs a felhasználóhoz
        const storageKey = `cursor_pref_${userEmail}`;
        const savedPref = localStorage.getItem(storageKey);

        // Alapértelmezés: BEKAPCSOLVA (ha nincs mentve semmi, vagy 'true')
        // Ha 'null', akkor is true legyen (default state)
        const isCursorActive = savedPref === null ? true : (savedPref === 'true');

        console.log(`Beállítás betöltése (${userEmail}):`, isCursorActive ? "BE" : "KI");

        // 1. Kapcsolók vizuális állapotának beállítása (SZINKRONIZÁLÁS)
        if (userToggle) {
            userToggle.checked = isCursorActive;
        }
        if (adminToggle) {
            adminToggle.checked = isCursorActive;
        }

        // 2. A tényleges kurzor be/kikapcsolása
        toggleCustomCursor(isCursorActive);
    }

    // Kurzor be/kikapcsoló segédfüggvény
    function toggleCustomCursor(isActive) {
        if (isActive) {
            document.body.classList.add('custom-cursor-active');
        } else {
            document.body.classList.remove('custom-cursor-active');
        }
    }

    // Beállítás mentése gombnyomáskor
    function saveCursorPreference(isActive) {
        let currentUserEmail = null;
        
        // Megnézzük ki van bejelentkezve
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        // Ha a user nézet látható és van user adat
        if (document.getElementById('userView').style.display !== 'none' && userData) {
            currentUserEmail = userData.email;
        } 
        // Ha az admin nézet látható
        else if (document.getElementById('adminView').style.display !== 'none') {
            currentUserEmail = 'admin_user'; 
        }

        if (currentUserEmail) {
            const storageKey = `cursor_pref_${currentUserEmail}`;
            localStorage.setItem(storageKey, isActive);
            toggleCustomCursor(isActive);
            
            // Szinkronizáljuk a másik gombot is (hogy ne legyen eltérés ha nézetet váltasz)
            const userToggle = document.getElementById('userCursorToggle');
            const adminToggle = document.getElementById('adminCursorToggle');
            if(userToggle) userToggle.checked = isActive;
            if(adminToggle) adminToggle.checked = isActive;

            showNotification(isActive ? "Sör kurzor bekapcsolva! 🍺" : "Sör kurzor kikapcsolva.", "success");
        }
    }

    // Eseményfigyelők csatolása
    // (Újra lekérjük az elemeket, hogy biztosan meglegyenek)
    const uToggle = document.getElementById('userCursorToggle');
    const aToggle = document.getElementById('adminCursorToggle');

    if (uToggle) {
        uToggle.addEventListener('change', (e) => {
            saveCursorPreference(e.target.checked);
        });
    }

    if (aToggle) {
        aToggle.addEventListener('change', (e) => {
            saveCursorPreference(e.target.checked);
        });
    }

    // Admin nézet váltásakor betöltjük a beállítást
    const originalSwitchToAdminView = switchToAdminView;
    switchToAdminView = function() {
        const guestSupportBtn = document.getElementById('guestSupportBtn');
        if(guestSupportBtn) guestSupportBtn.style.display = 'none';

        guestView.style.display = 'none';
        userView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        initializeMainTabs(adminView);
        loadAdminData();
        initializeLiveSearch();
        setupStatistics();
        setupAdminRecap();

        // Beállítások betöltése Adminnak
        loadUserPreferences('admin_user');
    };
    // === SPOTIFY STORY LOGIKA ===

function generateStoryData(beers, period) {
    // Alap statisztikák számolása
    const stats = calculateRecapStats(beers);
    
    // Átlagos ivási időpont számítása (Biztonságos módon)
    let avgHour = 18; // Alapértelmezett: este 6
    try {
        const hours = beers
            .map(b => {
                if(!b.date) return null;
                const d = new Date(b.date.replace(' ', 'T'));
                return isNaN(d.getTime()) ? null : d.getHours();
            })
            .filter(h => h !== null);
            
        if (hours.length > 0) {
            avgHour = Math.floor(hours.reduce((a,b)=>a+b,0) / hours.length);
        }
    } catch (e) {
        console.warn("Nem sikerült kiszámolni az időpontot", e);
    }
    
    // Időszak nevek magyarul
    const periodNames = { 
        'weekly': 'A heted', 
        'monthly': 'A hónapod', 
        'quarterly': 'A negyedéved', 
        'yearly': 'Az éved' 
    };
    
    return {
        periodName: periodNames[period] || 'Összesítőd',
        count: stats.totalBeers,
        avg: stats.averageScore,
        topBeer: stats.bestBeer.name || 'Ismeretlen sör', // Fallback ha nincs név
        topScore: stats.bestBeer.score || 0,
        favType: stats.favoriteType || 'Nincs adat',
        favPlace: stats.favoriteLocation || 'Nincs adat',
        drinkingTime: `${avgHour}:00`
    };
}


function showSlide(index) {
    // Slide csere
    document.querySelectorAll('.story-slide').forEach((el, i) => {
        el.classList.toggle('active', i === index);
    });

    // Progress bar kezelés
    document.querySelectorAll('.story-progress-bar').forEach((el, i) => {
        el.classList.remove('active', 'completed');
        el.querySelector('.story-progress-fill').style.width = '0%';
        
        if (i < index) {
            el.classList.add('completed');
            el.querySelector('.story-progress-fill').style.width = '100%';
        } else if (i === index) {
            el.classList.add('active');
            animateProgress(el.querySelector('.story-progress-fill'));
        }
    });
}

function animateProgress(fillElement) {
    if(storyInterval) clearInterval(storyInterval);
    let width = 0;
    
    // Ha az utolsó slide, ne lapozzon automatikusan, csak teljen meg
    const isLast = window.currentSlide === window.totalSlides - 1;
    
    storyInterval = setInterval(() => {
        width += 1;
        fillElement.style.width = width + '%';
        
        if (width >= 100) {
            clearInterval(storyInterval);
            if (!isLast) {
                window.nextSlide();
            }
        }
    }, 40); // 4 másodperc per slide
}
});
// CSERÉLD LE EZT A RÉSZT A FÁJL VÉGÉN (window.downloadRecap után):

window.toggleFullscreen = function() {
    const elem = document.getElementById('storyContainer');
    const cursor = document.getElementById('beerCursor'); // Kurzor megkeresése
    const btn = document.querySelector('.story-fullscreen-btn');

    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement) {
        
        // --- BELÉPÉS ---
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        // TRÜKK: Átmozgatjuk a kurzort a fullscreen elembe, hogy látszódjon
        // Különben a böngésző kitakarja, mert a body-ban van
        if (cursor && elem) {
            elem.appendChild(cursor);
        }
        
        if(btn) btn.innerHTML = '✕'; 

    } else {
        // --- KILÉPÉS ---
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        if(btn) btn.innerHTML = '⛶';
    }
}

// Eseményfigyelő, ami akkor is visszapakolja a kurzort, ha ESC-el lépsz ki
function handleFullscreenChange() {
    const btn = document.querySelector('.story-fullscreen-btn');
    const cursor = document.getElementById('beerCursor');
    const storyContainer = document.getElementById('storyContainer');
    
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFullscreen) {
        // Kilépéskor visszatesszük a kurzort a body-ba (hogy mindenhol működjön)
        if(btn) btn.innerHTML = '⛶';
        if (cursor && document.body) {
            document.body.appendChild(cursor);
        }
    } else {
        // Belépéskor ellenőrizzük, hogy jó helyen van-e
        if(btn) btn.innerHTML = '✕';
        if (cursor && storyContainer && cursor.parentElement !== storyContainer) {
            storyContainer.appendChild(cursor);
        }
    }
}

// Figyeljük a változást minden böngészőben
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);
// === 2FA KEZELÉS ===

// Kapcsoló eseménykezelő
if (user2FAToggle) {
    user2FAToggle.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        
        if (isChecked) {
            // Bekapcsolás: Kérjünk titkos kulcsot és QR kódot
            e.target.checked = false; // Még ne kapcsoljuk be vizuálisan, amíg nincs kész
            await start2FASetup();
        } else {
            // Kikapcsolás
            if (confirm("Biztosan ki akarod kapcsolni a kétlépcsős azonosítást?")) {
                await disable2FA();
            } else {
                e.target.checked = true; // Visszakapcsoljuk, ha mégsem
            }
        }
    });
}

async function start2FASetup() {
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'MANAGE_2FA', subAction: 'GENERATE' })
        });
        const result = await response.json();
        
        if (result.qrCode) {
            document.getElementById('qrCodeImage').src = result.qrCode;
            document.getElementById('manualSecret').textContent = result.secret;
            temp2FASecret = result.secret;
            
            // Modal megjelenítése
            setup2FAModal.classList.add('active');
        }
    } catch (error) {
        showError("Hiba a 2FA generálásakor.");
    }
}

// "Aktiválás" gomb a modalban
document.getElementById('confirm2FABtn').addEventListener('click', async () => {
    const code = document.getElementById('setup2FACode').value;
    if (code.length < 6) { showError("Add meg a 6 jegyű kódot!"); return; }

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'MANAGE_2FA', subAction: 'ENABLE', code: code, secret: temp2FASecret })
        });
        
        if (response.ok) {
            showSuccess("2FA sikeresen bekapcsolva!");
            setup2FAModal.classList.remove('active');
            user2FAToggle.checked = true;
            
            // Frissítjük a lokális adatot is
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.has2FA = true;
            localStorage.setItem('userData', JSON.stringify(userData));
        } else {
            const res = await response.json();
            showError(res.error || "Hibás kód!");
        }
    } catch (error) {
        showError("Hiba az aktiváláskor.");
    }
});

async function disable2FA() {
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'MANAGE_2FA', subAction: 'DISABLE' })
        });
        
        if (response.ok) {
            showSuccess("2FA kikapcsolva.");
            user2FAToggle.checked = false;
            // Lokális adat frissítése
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.has2FA = false;
            localStorage.setItem('userData', JSON.stringify(userData));
        }
    } catch (error) {
        showError("Nem sikerült kikapcsolni.");
        user2FAToggle.checked = true;
    }
}

// Modal bezárás (globális)
window.close2FAModal = function() {
    setup2FAModal.classList.remove('active');
    document.getElementById('setup2FACode').value = '';
}

// 2FA Login Form kezelése
document.getElementById('verify2FALoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('login2FACode').value;
    const btn = e.target.querySelector('button');
    
    // Kis vizuális visszajelzés a gombon
    const originalText = btn.innerText;
    btn.innerText = "Ellenőrzés...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'VERIFY_2FA_LOGIN', 
                email: tempLoginEmail, 
                token: code 
            })
        });
        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Hibás kód!");

        // Sikeres belépés
        localStorage.setItem('userToken', result.token);
        localStorage.setItem('userData', JSON.stringify(result.user));
        
        login2FAModal.classList.remove('active');
        showSuccess(`Sikeres belépés!`);
        switchToUserView();

    } catch (error) {
        showError(error.message);
        btn.innerText = originalText;
        btn.disabled = false;
        document.getElementById('login2FACode').value = '';
    }
});
// === UI FRISSÍTÉSEK (Kurzor + 2FA) ===

// Segédfüggvény a kapcsolók beállításához
// === JAVÍTOTT UI FRISSÍTÉS (KURZOR + 2FA EGYBEN) ===

function updateSettingsUI() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    // --- 1. 2FA Kapcsoló beállítása ---
    const toggle2FA = document.getElementById('user2FAToggle');
    if (userData && toggle2FA) {
        toggle2FA.checked = (userData.has2FA === true);
    }

    // --- 2. Kurzor beállítása (EZ HOZZA VISSZA A SÖRT) ---
    let emailKey = null;
    const userViewElem = document.getElementById('userView');
    const adminViewElem = document.getElementById('adminView');

    // Megnézzük, ki van épp bejelentkezve (User vagy Admin)
    if (userData && userViewElem && userViewElem.style.display !== 'none') {
        emailKey = userData.email;
    } else if (adminViewElem && adminViewElem.style.display !== 'none') {
        emailKey = 'admin_user';
    }

    if (emailKey) {
        const storageKey = `cursor_pref_${emailKey}`;
        const savedPref = localStorage.getItem(storageKey);
        // Alapértelmezés: BEKAPCSOLVA (true), ha nincs még mentve semmi
        const isCursorActive = savedPref === null ? true : (savedPref === 'true');
        
        // Itt kapcsoljuk be/ki a tényleges sörkurzort
        if (isCursorActive) {
            document.body.classList.add('custom-cursor-active');
        } else {
            document.body.classList.remove('custom-cursor-active');
        }

        // A kapcsolók vizuális állapotának frissítése
        const uToggle = document.getElementById('userCursorToggle');
        const aToggle = document.getElementById('adminCursorToggle');
        if (uToggle) uToggle.checked = isCursorActive;
        if (aToggle) aToggle.checked = isCursorActive;
    }
}
    // Eseménykezelő az ötlet űrlaphoz
const submitIdeaForm = document.getElementById('submitIdeaForm');
if(submitIdeaForm) {
    submitIdeaForm.addEventListener('submit', handleIdeaSubmit);
}

// Fülek váltásakor töltsük be az adatokat
document.querySelectorAll('.main-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.dataset.tabContent;
        if(target === 'user-ideas-content') {
            loadUserIdeas();
        } else if(target === 'admin-ideas-content') {
            loadAllIdeasForAdmin();
        }
    });
});

// Admin gomb globális elérése (hogy az onclick="markIdeaAsDone(..)" működjön)
window.markIdeaAsDone = markIdeaAsDone;
window.loadAllIdeasForAdmin = loadAllIdeasForAdmin;

// A nézetváltó függvény, ami meghívja a fenti javított beállítót
switchToUserView = function() {
    const guestSupportBtn = document.getElementById('guestSupportBtn');
    if(guestSupportBtn) guestSupportBtn.style.display = 'none';
    // Nézetek kezelése
    document.getElementById('guestView').style.display = 'none';
    document.getElementById('adminView').style.display = 'none';
    document.getElementById('userView').style.display = 'block';
    
    document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
    document.body.style.backgroundAttachment = 'fixed';
    
    // === ÚJ SOROK - BIZTONSÁGOS RESET ===
    allRecommendationsData = []; // Ajánlások törlése az új user betöltése előtt
    
    // Töröljük az ajánlások konténert is, hogy ne látszódjanak régi adatok
    const recList = document.getElementById('recommendationsList');
    if (recList) {
        recList.innerHTML = '<div class="recap-spinner"></div>';
    }
    
    // Adatok betöltése (ha léteznek a függvények a scope-ban)
    if (typeof initializeMainTabs === 'function') initializeMainTabs(document.getElementById('userView'));
    if (typeof loadUserData === 'function') loadUserData();

     // ⬇️ EZT A SORT ADD HOZZÁ! ⬇️
    if (typeof loadUserDrinks === 'function') loadUserDrinks(); // Ez betölti az italokat
    if (typeof loadRecommendations === 'function') {
        setTimeout(() => {
            loadRecommendations(); // Betöltjük az ajánlásokat is
        }, 500); // Kis késleltetés, hogy ne akadjon minden egyszerre
    }

    // A LÉNYEG: Itt hívjuk meg a javított beállítót
    updateSettingsUI();
};
    // === SÖR SZERKESZTÉS ===
window.openEditBeerModal = function(index) {
    const beer = currentUserBeers[index];
    
    document.getElementById('editBeerIndex').value = index;
    document.getElementById('editBeerName').value = beer.beerName;
    document.getElementById('editBeerType').value = beer.type || '';
    document.getElementById('editBeerLocation').value = beer.location;
    document.getElementById('editBeerPercentage').value = beer.beerPercentage || 0;
    document.getElementById('editBeerLook').value = beer.look || 0;
    document.getElementById('editBeerSmell').value = beer.smell || 0;
    document.getElementById('editBeerTaste').value = beer.taste || 0;
    document.getElementById('editBeerNotes').value = beer.notes || '';
    
    editBeerModal.classList.add('active');
}

window.closeEditBeerModal = function() {
    editBeerModal.classList.remove('active');
    editBeerForm.reset();
}

editBeerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('editBeerIndex').value);
    const submitBtn = editBeerForm.querySelector('.auth-btn');
    
    const updatedBeer = {
        beerName: document.getElementById('editBeerName').value,
        type: document.getElementById('editBeerType').value,
        location: document.getElementById('editBeerLocation').value,
        beerPercentage: document.getElementById('editBeerPercentage').value,
        look: document.getElementById('editBeerLook').value,
        smell: document.getElementById('editBeerSmell').value,
        taste: document.getElementById('editBeerTaste').value,
        notes: document.getElementById('editBeerNotes').value
    };
    
    setLoading(submitBtn, true);
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'EDIT_USER_BEER', 
                index: index,
                ...updatedBeer
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Sör sikeresen módosítva!');
        closeEditBeerModal();
        loadUserData(); // Újratöltés
    } catch (error) {
        showError(error.message || "Nem sikerült módosítani.");
    } finally {
        setLoading(submitBtn, false);
    }
});

// === ITAL SZERKESZTÉS ===
window.openEditDrinkModal = function(index) {
    const drink = currentUserDrinks[index];
    
    document.getElementById('editDrinkIndex').value = index;
    document.getElementById('editDrinkName').value = drink.drinkName;
    document.getElementById('editDrinkCategory').value = drink.category || '';
    document.getElementById('editDrinkType').value = drink.type || '';
    document.getElementById('editDrinkLocation').value = drink.location;
    document.getElementById('editDrinkPercentage').value = drink.drinkPercentage || '';
    document.getElementById('editDrinkLook').value = drink.look || 0;
    document.getElementById('editDrinkSmell').value = drink.smell || 0;
    document.getElementById('editDrinkTaste').value = drink.taste || 0;
    document.getElementById('editDrinkNotes').value = drink.notes || '';
    
    editDrinkModal.classList.add('active');
}

window.closeEditDrinkModal = function() {
    editDrinkModal.classList.remove('active');
    editDrinkForm.reset();
}

editDrinkForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const index = parseInt(document.getElementById('editDrinkIndex').value);
    const submitBtn = editDrinkForm.querySelector('.auth-btn');
    
    const updatedDrink = {
        drinkName: document.getElementById('editDrinkName').value,
        category: document.getElementById('editDrinkCategory').value,
        type: document.getElementById('editDrinkType').value,
        location: document.getElementById('editDrinkLocation').value,
        drinkPercentage: document.getElementById('editDrinkPercentage').value || 0,
        look: document.getElementById('editDrinkLook').value,
        smell: document.getElementById('editDrinkSmell').value,
        taste: document.getElementById('editDrinkTaste').value,
        notes: document.getElementById('editDrinkNotes').value
    };
    
    setLoading(submitBtn, true);
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'EDIT_USER_DRINK', 
                index: index,
                ...updatedDrink
            })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Ital sikeresen módosítva!');
        closeEditDrinkModal();
        loadUserDrinks(); // Újratöltés
    } catch (error) {
        showError(error.message || "Nem sikerült módosítani.");
    } finally {
        setLoading(submitBtn, false);
    }
});
    // === BUBOREK EFFEKT FÜGGVÉNY (Ezt másold be a js.js fájlba) ===
function createBeerBubbles(x, y) {
    const bubbleCount = 8; // Buborékok száma kattintásonként
    
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.classList.add('beer-bubble');
        
        // Kezdő pozíció (az egér helye)
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        
        // Véletlenszerű irány és távolság (CSS változókhoz)
        // tx: vízszintes elmozdulás (-50px és +50px között)
        // ty: függőleges elmozdulás (felfelé, -50px és -150px között)
        const tx = (Math.random() - 0.5) * 100; 
        const ty = -(50 + Math.random() * 100); 
        
        bubble.style.setProperty('--tx', `${tx}px`);
        bubble.style.setProperty('--ty', `${ty}px`);
        
        // Véletlenszerű méret
        const size = 5 + Math.random() * 10; 
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // Véletlenszerű sör-színek (sárgás-fehéres)
        const colors = ['rgba(255, 255, 255, 0.8)', 'rgba(255, 198, 0, 0.6)', 'rgba(255, 255, 255, 0.5)'];
        bubble.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        document.body.appendChild(bubble);

        // Törlés az animáció után (0.6s a CSS-ben)
        setTimeout(() => {
            bubble.remove();
        }, 600);
    }
}
    // === ÚJ UI JAVÍTÁSOK (Scroll & Szinkronizálás) ===

// 1. Scroll Animáció ("Reveal on Scroll")
const observerOptions = {
    threshold: 0.1 // Akkor aktiválódik, ha az elem 10%-a látszik
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Minden kártyát és szekciót figyelünk
function initScrollAnimation() {
    const elements = document.querySelectorAll('.card, .stat-card, .kpi-card, .chart-container');
    elements.forEach(el => {
        el.classList.add('reveal-on-scroll'); // Alapból adjuk hozzá az osztályt
        observer.observe(el);
    });
}

// 2. Sidebar és Bottom Nav szinkronizálása
// Ha a sidebaron kattintasz, a mobil menü is váltson, és fordítva.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item, .nav-item-mobile');
    if (!btn) return;

    const targetId = btn.dataset.tabContent;
    if(!targetId) return;

    // Minden navigációs elemet frissítünk (Sidebar ÉS Mobil is)
    const allNavs = document.querySelectorAll(`[data-tab-content="${targetId}"]`);
    
    // Aktív osztályok törlése mindenhonnan
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(b => b.classList.remove('active'));
    
    // Új aktív hozzáadása
    allNavs.forEach(nav => nav.classList.add('active'));
});

// A 'userLogoutBtnSidebar' gomb bekötése a régi kijelentkezéshez
const sidebarLogout = document.getElementById('userLogoutBtnSidebar');
if(sidebarLogout) {
    sidebarLogout.addEventListener('click', switchToGuestView);
}

// Inicializálás nézetváltáskor
const originalSwitchToUserViewUpdate = switchToUserView;
switchToUserView = function() {
    originalSwitchToUserViewUpdate(); // Eredeti logika futtatása
    
    // Név frissítése a sidebarban is
    const user = JSON.parse(localStorage.getItem('userData'));
    if(user && document.getElementById('userWelcomeMessageSidebar')) {
        document.getElementById('userWelcomeMessageSidebar').textContent = `Szia, ${user.name}!`;
    }
    
    // Animációk indítása kis késleltetéssel (hogy a DOM felépüljön)
    setTimeout(initScrollAnimation, 100);
};
    const fabMainBtn = document.getElementById('fabMainBtn');
const fabContainer = document.getElementById('fabContainer');

if (fabMainBtn) {
    fabMainBtn.addEventListener('click', () => {
        fabContainer.classList.toggle('active');
    });

    // Ha máshova kattintunk, záródjon be
    document.addEventListener('click', (e) => {
        if (!fabContainer.contains(e.target)) {
            fabContainer.classList.remove('active');
        }
    });
}

// === ÚJ MODAL FUNKCIÓK (SÖR/ITAL HOZZÁADÁS) ===
window.openAddModal = function(type) {
    fabContainer.classList.remove('active'); // FAB bezárása
    
    if (type === 'beer') {
        document.getElementById('addBeerModal').classList.add('active');
    } else if (type === 'drink') {
        document.getElementById('addDrinkModal').classList.add('active');
    }
    document.body.style.overflow = 'hidden'; // Görgetés tiltása
}

window.closeAddModal = function(type) {
    if (type === 'beer') {
        document.getElementById('addBeerModal').classList.remove('active');
    } else if (type === 'drink') {
        document.getElementById('addDrinkModal').classList.remove('active');
    }
    document.body.style.overflow = 'auto';
}
    // === SEGÍTSÉG / HIBABEJELENTÉS FUNKCIÓK ===

// Modal megnyitása
window.openSupportModal = function() {
    const modal = document.getElementById('supportModal');
    const emailGroup = document.getElementById('supportEmailGroup');
    const nameInput = document.getElementById('supportName');
    const emailInput = document.getElementById('supportEmail');
    
    // Ellenőrizzük, be van-e jelentkezve a user
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    if (userData) {
        // Bejelentkezett user: töltjük ki az adatokat
        nameInput.value = userData.name;
        emailInput.value = userData.email;
        // Email mező elrejtése (read-only)
        emailGroup.style.display = 'none';
    } else {
        // Vendég: kell az email mező
        emailGroup.style.display = 'block';
        nameInput.value = '';
        emailInput.value = '';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // FAB bezárása ha nyitva volt
    const fabContainer = document.getElementById('fabContainer');
    if(fabContainer) fabContainer.classList.remove('active');
}

// Modal bezárása
window.closeSupportModal = function() {
    const modal = document.getElementById('supportModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    document.getElementById('supportForm').reset();
}

// Form beküldése
document.getElementById('supportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('supportName').value;
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;
    const btn = e.target.querySelector('.auth-btn');
    
    // Email cím lekérése
    let email;
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData) {
        email = userData.email;
    } else {
        email = document.getElementById('supportEmail').value;
    }
    
    setLoading(btn, true);
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
                // NEM kell token, mert vendégek is elérhetik
            },
            body: JSON.stringify({ 
                action: 'SUBMIT_SUPPORT_TICKET', 
                name, 
                email, 
                subject, 
                message 
            })
        });
        
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Hiba történt.");
        
        showSuccess("Üzeneted elküldve! Hamarosan válaszolunk. 📧");
        closeSupportModal();
        
    } catch (error) {
        showError(error.message || "Nem sikerült elküldeni az üzenetet.");
    } finally {
        setLoading(btn, false);
    }
});

// Vendég gomb eseménykezelő
const guestSupportBtn = document.getElementById('guestSupportBtn');
if(guestSupportBtn) {
    guestSupportBtn.addEventListener('click', openSupportModal);
}
    // [js.js - ACHIEVEMENT RENDSZER]

// --- KONFIGURÁCIÓ: 50 ACHIEVEMENT ---
const ACHIEVEMENTS = [
    // --- MENNYISÉG ---
    { 
        id: 'cnt_1', icon: '🍺', title: 'Első korty', desc: 'Értékelj 1 sört', 
        check: (b, d) => b.length >= 1,
        getProgress: (b, d) => ({ current: b.length, target: 1 }) 
    },
    { 
        id: 'cnt_5', icon: '🖐️', title: 'Bemelegítés', desc: 'Értékelj 5 sört', 
        check: (b, d) => b.length >= 5,
        getProgress: (b, d) => ({ current: b.length, target: 5 })
    },
    { 
        id: 'cnt_10', icon: '🔟', title: 'Amatőr', desc: 'Értékelj 10 sört', 
        check: (b, d) => b.length >= 10,
        getProgress: (b, d) => ({ current: b.length, target: 10 })
    },
    { 
        id: 'cnt_25', icon: '🥉', title: 'Rendszeres', desc: 'Értékelj 25 sört', 
        check: (b, d) => b.length >= 25,
        getProgress: (b, d) => ({ current: b.length, target: 25 })
    },
    { 
        id: 'cnt_50', icon: '🥈', title: 'Profi', desc: 'Értékelj 50 sört', 
        check: (b, d) => b.length >= 50,
        getProgress: (b, d) => ({ current: b.length, target: 50 })
    },
    { 
        id: 'cnt_100', icon: '🥇', title: 'Sörmester', desc: 'Értékelj 100 sört', 
        check: (b, d) => b.length >= 100,
        getProgress: (b, d) => ({ current: b.length, target: 100 })
    },
    { 
        id: 'drk_1', icon: '🍹', title: 'Kóstoló', desc: 'Értékelj 1 italt', 
        check: (b, d) => d.length >= 1,
        getProgress: (b, d) => ({ current: d.length, target: 1 })
    },
    { 
        id: 'drk_10', icon: '🍸', title: 'Mixer', desc: 'Értékelj 10 italt', 
        check: (b, d) => d.length >= 10,
        getProgress: (b, d) => ({ current: d.length, target: 10 })
    },
    { 
        id: 'drk_50', icon: '🥂', title: 'Sommelier', desc: 'Értékelj 50 italt', 
        check: (b, d) => d.length >= 50,
        getProgress: (b, d) => ({ current: d.length, target: 50 })
    },
    { 
        id: 'total_10', icon: '🚀', title: 'Kezdő I.', desc: 'Összesen 10 értékelés (Sör+Ital)', 
        check: (b, d) => (b.length + d.length) >= 10,
        getProgress: (b, d) => ({ current: b.length + d.length, target: 10 })
    },
    { 
        id: 'total_50', icon: '🔥', title: 'Haladó II.', desc: 'Összesen 50 értékelés', 
        check: (b, d) => (b.length + d.length) >= 50,
        getProgress: (b, d) => ({ current: b.length + d.length, target: 50 })
    },
    { 
        id: 'total_200', icon: '👑', title: 'Legenda', desc: 'Összesen 200 értékelés', 
        check: (b, d) => (b.length + d.length) >= 200,
        getProgress: (b, d) => ({ current: b.length + d.length, target: 200 })
    },

    // --- PONTSZÁMOK ---
    { 
        id: 'score_max', icon: '😍', title: 'Mennyei', desc: 'Adj 10/10 pontot valamire', 
        check: (b, d) => [...b, ...d].some(x => parseFloat(x.avg) >= 10),
        getProgress: (b, d) => ({ current: [...b, ...d].filter(x => parseFloat(x.avg) >= 10).length, target: 1 })
    },
    { 
        id: 'score_min', icon: '🤢', title: 'Moslék', desc: 'Adj 2 pont alatt valamire', 
        check: (b, d) => [...b, ...d].some(x => parseFloat(x.avg) > 0 && parseFloat(x.avg) < 2),
        getProgress: (b, d) => ({ current: [...b, ...d].filter(x => parseFloat(x.avg) > 0 && parseFloat(x.avg) < 2).length, target: 1 })
    },
    // (A "check" függvények maradnak, de ahol nehéz progress-t számolni, ott manuálisan 0/1-et adunk vissza)
    { id: 'score_perf_look', icon: '👀', title: 'Szépkilátás', desc: '10-es Külalak', check: (b, d) => [...b, ...d].some(x => parseFloat(x.look) === 10), getProgress: (b, d) => ({ current: [...b, ...d].some(x => parseFloat(x.look) === 10) ? 1 : 0, target: 1 }) },
    { id: 'score_perf_smell', icon: '👃', title: 'Illatfelhő', desc: '10-es Illat', check: (b, d) => [...b, ...d].some(x => parseFloat(x.smell) === 10), getProgress: (b, d) => ({ current: [...b, ...d].some(x => parseFloat(x.smell) === 10) ? 1 : 0, target: 1 }) },
    { id: 'score_perf_taste', icon: '👅', title: 'Ízorgia', desc: '10-es Íz', check: (b, d) => [...b, ...d].some(x => parseFloat(x.taste) === 10), getProgress: (b, d) => ({ current: [...b, ...d].some(x => parseFloat(x.taste) === 10) ? 1 : 0, target: 1 }) },
    
    // Átlagoknál az aktuális átlagot mutatjuk
    { 
        id: 'avg_high', icon: '📈', title: 'Szigorú', desc: 'Az átlagod 8 felett van (min 5 teszt)', 
        check: (b, d) => (b.length+d.length) > 5 && calculateTotalAvg(b,d) > 8,
        getProgress: (b, d) => ({ current: calculateTotalAvg(b,d).toFixed(1), target: 8, suffix: 'pont' })
    },
    { 
        id: 'avg_low', icon: '📉', title: 'Kritikus', desc: 'Az átlagod 4 alatt van (min 5 teszt)', 
        check: (b, d) => (b.length+d.length) > 5 && calculateTotalAvg(b,d) < 4,
        getProgress: (b, d) => ({ current: calculateTotalAvg(b,d).toFixed(1), target: 4, suffix: 'pont', inverse: true }) // inverse: minél kisebb, annál jobb
    },
    { id: 'precision', icon: '🎯', title: 'Tizedes', desc: 'Adj nem egész pontszámot (pl. 7.5)', check: (b, d) => [...b, ...d].some(x => x.avg % 1 !== 0), getProgress: (b, d) => ({ current: [...b, ...d].some(x => x.avg % 1 !== 0) ? 1 : 0, target: 1 }) },

    // --- TÍPUSOK ---
    { 
        id: 'type_ipa', icon: '🌲', title: 'Komlófej', desc: '3 db IPA típusú sör', 
        check: (b) => b.filter(x => x.type.toLowerCase().includes('ipa')).length >= 3,
        getProgress: (b) => ({ current: b.filter(x => x.type.toLowerCase().includes('ipa')).length, target: 3 })
    },
    { 
        id: 'type_lager', icon: '🍞', title: 'Klasszikus', desc: '5 db Lager/Pilsner', 
        check: (b) => b.filter(x => /lager|pils/i.test(x.type)).length >= 5,
        getProgress: (b) => ({ current: b.filter(x => /lager|pils/i.test(x.type)).length, target: 5 })
    },
    { 
        id: 'type_stout', icon: '☕', title: 'Feketeöves', desc: '3 db Stout/Porter', 
        check: (b) => b.filter(x => /stout|porter|barna/i.test(x.type)).length >= 3,
        getProgress: (b) => ({ current: b.filter(x => /stout|porter|barna/i.test(x.type)).length, target: 3 })
    },
    { 
        id: 'type_fruit', icon: '🍒', title: 'Gyümölcsös', desc: '3 db Gyümölcsös sör', 
        check: (b) => b.filter(x => /gyüm|meggy|málna/i.test(x.type)).length >= 3,
        getProgress: (b) => ({ current: b.filter(x => /gyüm|meggy|málna/i.test(x.type)).length, target: 3 })
    },
    { 
        id: 'type_biza', icon: 'wheat', title: 'Búzamező', desc: '3 db Búzasör', 
        check: (b) => b.filter(x => /búza|wheat|weiss/i.test(x.type)).length >= 3,
        getProgress: (b) => ({ current: b.filter(x => /búza|wheat|weiss/i.test(x.type)).length, target: 3 })
    },
    { 
        id: 'cat_wine', icon: '🍷', title: 'Borász', desc: '3 db Bor', 
        check: (b, d) => d.filter(x => x.category === 'Bor').length >= 3,
        getProgress: (b, d) => ({ current: d.filter(x => x.category === 'Bor').length, target: 3 })
    },
    { 
        id: 'cat_spirit', icon: '🥃', title: 'Rövid', desc: '5 db Tömény (Pálinka, Whisky...)', 
        check: (b, d) => d.filter(x => ['Pálinka', 'Whisky', 'Vodka', 'Rum', 'Gin', 'Likőr'].includes(x.category)).length >= 5,
        getProgress: (b, d) => ({ current: d.filter(x => ['Pálinka', 'Whisky', 'Vodka', 'Rum', 'Gin', 'Likőr'].includes(x.category)).length, target: 5 })
    },
    { 
        id: 'type_cocktail', icon: '🍹', title: 'Koktélkirály', desc: '3 db Koktél', 
        check: (b, d) => d.filter(x => x.category === 'Koktél').length >= 3,
        getProgress: (b, d) => ({ current: d.filter(x => x.category === 'Koktél').length, target: 3 })
    },
    { 
        id: 'type_champagne', icon: '🥂', title: 'Pezsgő pillanat', desc: '3 db Pezsgő', 
        check: (b, d) => d.filter(x => x.category === 'Pezsgő').length >= 3,
        getProgress: (b, d) => ({ current: d.filter(x => x.category === 'Pezsgő').length, target: 3 })
    },
    { 
        id: 'type_alcohol_free', icon: '🧃', title: 'Józan Élet', desc: '3 db Alkoholmentes tétel', 
        check: (b, d) => [...b, ...d].filter(x => x.type === 'Nem alkoholos').length >= 3,
        getProgress: (b, d) => ({ current: [...b, ...d].filter(x => x.type === 'Nem alkoholos').length, target: 3 })
    }
];

// --- RANGOK (SZINTEK) ---
const LEVELS = [
    { name: 'Kezdő', min: 0, color: '#bdc3c7' },
    { name: 'Lelkes', min: 5, color: '#1abc9c' },
    { name: 'Haladó', min: 10, color: '#3498db' },
    { name: 'Ínyenc', min: 20, color: '#9b59b6' },
    { name: 'Szakértő', min: 35, color: '#e67e22' },
    { name: 'Mester', min: 50, color: '#e74c3c' },
    { name: 'Legenda', min: 75, color: '#f1c40f' }
];

// --- SEGÉDFÜGGVÉNYEK AZ ACHIEVEMENTEKHEZ ---

// Átlag számolása a feltételekhez (sör + ital)
function calculateTotalAvg(beers, drinks) {
    const all = [...beers, ...drinks];
    if (all.length === 0) return 0;
    const sum = all.reduce((acc, item) => acc + (parseFloat(item.avg.toString().replace(',', '.')) || 0), 0);
    return sum / all.length;
}

// --- FŐ LOGIKA: EREDMÉNYEK ELLENŐRZÉSE ---
async function checkAchievements() {
    // 1. Jelenlegi adatok összegyűjtése
    const allBeers = currentUserBeers || [];
    const allDrinks = currentUserDrinks || [];
    
    // 2. Felhasználó profiljának és korábbi eredményeinek betöltése
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) return;

    // Ha még nincs achievements objektum, létrehozzuk
    if (!userData.achievements) {
        userData.achievements = { unlocked: [] };
    }
    
    const unlockedIds = userData.achievements.unlocked.map(a => a.id);
    let newUnlock = false;

    // 3. Végigmegyünk az összes definíción és ellenőrizzük a feltételt
    ACHIEVEMENTS.forEach(achi => {
        // Ha már megvan, nem érdekes
        if (unlockedIds.includes(achi.id)) return;

        // Ellenőrzés futtatása
        if (achi.check(allBeers, allDrinks)) {
            // SIKER! Új achievement
            const unlockData = {
                id: achi.id,
                date: new Date().toLocaleDateString('hu-HU')
            };
            
            userData.achievements.unlocked.push(unlockData);
            unlockedIds.push(achi.id);
            newUnlock = true;

            // Értesítés megjelenítése
            showAchievementToast(achi);
        }
    });

    // 4. Ha volt új feloldás, mentünk a szerverre és frissítjük a UI-t
    if (newUnlock) {
        localStorage.setItem('userData', JSON.stringify(userData));
        renderAchievements();
        await saveAchievementsToCloud(userData.achievements, userData.badge);
    }
}

// --- MENTÉS A SZERVERRE ---
async function saveAchievementsToCloud(achievements, badge) {
    try {
        await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'UPDATE_ACHIEVEMENTS', 
                achievements: achievements,
                badge: badge || ''
            })
        });
        console.log("Achievementek szinkronizálva.");
    } catch (e) {
        console.error("Hiba az achievement mentésekor:", e);
    }
}

// --- UI MEGJELENÍTÉS (JAVÍTOTT PROGRESS BAR) ---
function renderAchievements() {
    console.log(">>> renderAchievements FUTÁSA INDUL...");

    const grid = document.getElementById('achievementsGrid');
    if (!grid) {
        console.warn(">>> HIBA: Nem találom az 'achievementsGrid' elemet. (Talán nem a User nézetben vagy?)");
        return; 
    }

    // --- 1. ADATOK BETÖLTÉSE ---
    let userData = null;
    try {
        userData = JSON.parse(localStorage.getItem('userData'));
    } catch (e) {
        console.error(">>> HIBA: A localStorage 'userData' sérült vagy nem olvasható.");
    }
    
    // Ha nincs adat, csinálunk egy üreset, hogy ne fagyjon le
    if (!userData) userData = { achievements: { unlocked: [] } };
    if (!userData.achievements) userData.achievements = { unlocked: [] };

    const unlockedIds = (userData.achievements.unlocked || []).map(a => a.id);
    const unlockedCount = unlockedIds.length;
    
    console.log(`>>> Jelenlegi eredmények száma: ${unlockedCount}`);

    // --- 2. SZINTEK DEFINIÁLÁSA (Hogy biztosan elérhető legyen) ---
    // Ezt bemásoltam ide, hogy elkerüljük a "LEVELS is not defined" hibát
    const LOCAL_LEVELS = [
        { name: 'Kezdő', min: 0, color: '#bdc3c7' },
        { name: 'Lelkes', min: 5, color: '#1abc9c' },
        { name: 'Haladó', min: 10, color: '#3498db' },
        { name: 'Ínyenc', min: 20, color: '#9b59b6' },
        { name: 'Szakértő', min: 35, color: '#e67e22' },
        { name: 'Mester', min: 50, color: '#e74c3c' },
        { name: 'Legenda', min: 75, color: '#f1c40f' }
    ];

    // --- 3. SZINT MEGHATÁROZÁSA ---
    let currentLevelIndex = 0;
    for (let i = LOCAL_LEVELS.length - 1; i >= 0; i--) {
        if (unlockedCount >= LOCAL_LEVELS[i].min) {
            currentLevelIndex = i;
            break;
        }
    }
    const currentLevel = LOCAL_LEVELS[currentLevelIndex];
    const nextLevel = LOCAL_LEVELS[currentLevelIndex + 1];

    console.log(`>>> Jelenlegi szint: ${currentLevel.name} (Min: ${currentLevel.min})`);

    // --- 4. PROGRESS BAR MATEK ÉS FRISSÍTÉS ---
    const progressBar = document.getElementById('achievementProgressBar');
    const progressText = document.getElementById('achievementProgressText');
    const levelBadge = document.getElementById('currentLevelDisplay');
    
    if (progressBar && progressText) {
        if (nextLevel) {
            // MATEMATIKA:
            const levelStart = currentLevel.min;    // Pl. 5
            const levelEnd = nextLevel.min;         // Pl. 10
            
            // Biztosítjuk, hogy ne legyen negatív szám (Math.max)
            const progressInLevel = Math.max(0, unlockedCount - levelStart);
            const totalDistance = Math.max(1, levelEnd - levelStart); // Ne osszunk nullával
            const remaining = Math.max(0, levelEnd - unlockedCount);

            console.log(`>>> MATEK: ${progressInLevel} szerzett a szinten belül. Cél távolság: ${totalDistance}.`);

            // Százalék számítás
            let percent = (progressInLevel / totalDistance) * 100;
            
            // Biztonsági korlát (0-100%)
            if (isNaN(percent)) percent = 0;
            percent = Math.max(0, Math.min(100, percent));

            console.log(`>>> SZÁZALÉK: ${percent}%`);

            // --- UI FRISSÍTÉS ---
            progressBar.style.width = `${percent}%`;
            progressBar.style.background = `linear-gradient(90deg, ${currentLevel.color}, ${nextLevel.color})`;
            
            // JAVÍTOTT KIÍRÁS:
            const percentRounded = Math.round(percent);
            
            progressText.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 250px;">
                    <span style="font-weight:bold; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
                        ${unlockedCount} / ${levelEnd}
                    </span>
                    <span style="font-size: 0.85rem; color: #eee; text-shadow: 0 1px 3px rgba(0,0,0,0.8); white-space: nowrap;">
                        Még <b>${remaining} db</b> <span style="color: #ffd700;">(${percentRounded}%)</span>
                    </span>
                </div>
            `;
            
        } else {
            // MAX SZINT ELÉRVE
            console.log(">>> MAX SZINT ELÉRVE");
            progressBar.style.width = '100%';
            progressBar.style.background = 'linear-gradient(90deg, #f1c40f, #e67e22)';
            progressText.innerHTML = `🏆 MAX SZINT ELÉRVE! (${unlockedCount} db)`;
        }
    } else {
        console.error(">>> HIBA: Nem találom a Progress Bar HTML elemeket (achievementProgressBar vagy achievementProgressText). Ellenőrizd az index.html-t!");
    }

    // --- 5. BADGE FRISSÍTÉSE ---
    if (levelBadge) {
        levelBadge.textContent = currentLevel.name;
        levelBadge.style.background = currentLevel.color;
        levelBadge.style.boxShadow = `0 0 10px ${currentLevel.color}`;
    }

    // --- 6. IKONOK KIRAJZOLÁSA ---
    grid.innerHTML = '';
    
    if (typeof ACHIEVEMENTS !== 'undefined') {
        ACHIEVEMENTS.forEach(achi => {
            const isUnlocked = unlockedIds.includes(achi.id);
            const cardClass = isUnlocked ? 'achi-card unlocked' : 'achi-card';
            const statusIcon = isUnlocked ? '✅' : '🔒';
            const iconStyle = !isUnlocked ? 'filter: grayscale(1); opacity: 0.5;' : '';

            let dateStr = '';
            let progressHtml = ''; // Ebbe tesszük a progress bar-t

            if (isUnlocked) {
                const data = userData.achievements.unlocked.find(u => u.id === achi.id);
                if (data && data.date) dateStr = `<div style="font-size:0.6rem; margin-top:5px; color:#ffd700;">Megszerezve: ${data.date}</div>`;
            } else {
                // Ha ZÁROLVA van, számoljuk ki a folyamatot
                if (achi.getProgress) {
                    const allBeers = currentUserBeers || []; // Biztos ami biztos
                    const allDrinks = currentUserDrinks || [];
                    
                    const p = achi.getProgress(allBeers, allDrinks);
                    
                    // Százalék számítás
                    let percent = 0;
                    if (p.inverse) {
                         // Pl. átlag: minél kisebb, annál jobb, ezt most egyszerűsítve csak kiírjuk
                         percent = 0; 
                    } else {
                        percent = (p.current / p.target) * 100;
                    }
                    // Limitálás 100%-ra
                    percent = Math.min(100, Math.max(0, percent));
                    
                    const unit = p.suffix || ''; // pl "pont"

                    progressHtml = `
                        <div class="achi-progress-container">
                            <div class="achi-progress-text">${p.current} / ${p.target} ${unit}</div>
                            <div class="achi-progress-bar-bg">
                                <div class="achi-progress-bar-fill" style="width: ${percent}%"></div>
                            </div>
                        </div>
                    `;
                }
            }

            const html = `
            <div class="${cardClass}" title="${achi.title}">
                <span class="achi-icon" style="${iconStyle}">${achi.icon}</span>
                <div class="achi-title">${achi.title}</div>
                <div class="achi-desc">${achi.desc}</div>
                ${dateStr}
                ${progressHtml} <div style="position: absolute; top: 5px; right: 5px; font-size: 0.8rem;">${statusIcon}</div>
            </div>
            `;
            grid.insertAdjacentHTML('beforeend', html);
        });
    } else {
        console.error(">>> HIBA: Az ACHIEVEMENTS tömb nem elérhető.");
    }

    // Badge választó frissítése
    if (typeof updateBadgeSelector === 'function') {
        updateBadgeSelector(currentLevel.name, userData.badge);
    }
}

// --- BADGE VÁLASZTÓ FRISSÍTÉSE ---
function updateBadgeSelector(maxLevelName, currentBadge) {
    const select = document.getElementById('userBadgeSelector');
    if (!select) return;

    select.innerHTML = '<option value="">Nincs</option>';
    
    // Csak azokat a rangokat választhatja, amit már elért
    let canSelect = true;
    LEVELS.forEach(lvl => {
        if (canSelect) {
            const selected = (lvl.name === currentBadge) ? 'selected' : '';
            select.insertAdjacentHTML('beforeend', `<option value="${lvl.name}" ${selected}>${lvl.name}</option>`);
        }
        // Ha elértük a jelenlegi szintjét, a többit nem rakjuk be (vagy letiltjuk)
        if (lvl.name === maxLevelName) {
            canSelect = false;
        }
    });

    // Ha megváltoztatja, mentsük el
    select.onchange = async () => {
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.badge = select.value;
        localStorage.setItem('userData', JSON.stringify(userData));
        
        // Frissítjük a UI-t (Headerben a badge)
        updateHeaderBadge();
        
        // Mentés felhőbe
        await saveAchievementsToCloud(userData.achievements, userData.badge);
        showSuccess('Rang sikeresen beállítva!');
    };
}

// --- FEJLÉC BADGE MEGJELENÍTÉSE ---
function updateHeaderBadge() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const welcomeMsg = document.getElementById('userWelcomeMessage');
    
    if (welcomeMsg && userData) {
        // Töröljük a régit ha van
        const oldBadge = welcomeMsg.querySelector('.user-badge-display');
        if (oldBadge) oldBadge.remove();

        // Ha van beállítva, odarakjuk
        if (userData.badge) {
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'user-badge-display';
            badgeSpan.textContent = userData.badge;
            welcomeMsg.appendChild(badgeSpan);
        }
    }
}

// --- TOAST ÉRTESÍTÉS ---
function showAchievementToast(achi) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
        <div style="font-size: 2rem;">${achi.icon}</div>
        <div>
            <div style="font-weight:700; color:#ffd700; font-size:0.8rem; text-transform:uppercase;">Új Eredmény!</div>
            <div style="font-weight:600; font-size:1rem;">${achi.title}</div>
            <div style="font-size:0.8rem; opacity:0.8;">${achi.desc}</div>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    // Animáció
    requestAnimationFrame(() => {
        toast.classList.add('active');
    });

    // Hang lejátszása (opcionális, rövid "pop" hang)
    // const audio = new Audio('achievement_sound.mp3'); audio.play().catch(e=>{});

    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

// ======================================================
// === INICIALIZÁLÁS (AZ ADATOK BETÖLTÉSEKOR) ===
// ======================================================

// Ezt a részt be kell szúrni a `loadUserData` függvény végére, 
// illetve a `loadUserDrinks` végére a fő kódban!
// De mivel ez a fájl végére kerül, felülírjuk a global függvényhívásokat, 
// vagy kibővítjük a `switchToUserView`-t.

const originalUserViewInit = switchToUserView;

switchToUserView = function() {
    // 1. Lefuttatjuk az eredeti inicializálást (betölti a söröket, beállításokat)
    originalUserViewInit(); 

    // 2. Biztosítjuk, hogy az italok is betöltődjenek (ha még nem történt meg)
    if (typeof loadUserDrinks === 'function') loadUserDrinks();

    // 3. Várakozunk kicsit, hogy az API válaszok (sörök + italok) megérkezzenek
    // Fontos: Itt hívjuk meg a checkAchievements-t, hogy újraszámolja a százalékokat!
    setTimeout(async () => {
        // Ellenőrizzük, vannak-e betöltött adatok
        if (currentUserBeers.length > 0 || currentUserDrinks.length > 0) {
            console.log("Adatok betöltve, Achievementek ellenőrzése...");
            
            // FONTOS: Ez számolja ki a progress-t az aktuális listák alapján!
            await checkAchievements(); 
        }
        
        // Frissítjük a vizuális elemeket (Rács + Header Badge)
        renderAchievements();
        updateHeaderBadge();
        
    }, 1500); // 1.5 mp késleltetés, hogy biztosan meglegyen minden adat a szerverről
};

// Figyeljük a változásokat (Ha hozzáadunk sört/italt, fusson le az ellenőrzés)
const originalAddBeer = handleAddBeer;
handleAddBeer = async function(e) {
    await originalAddBeer(e);
    // Sikeres hozzáadás után ellenőrzés
    setTimeout(() => { checkAchievements(); }, 1500); 
};

const originalAddDrink = handleAddDrink;
handleAddDrink = async function(e) {
    await originalAddDrink(e);
    // Sikeres hozzáadás után ellenőrzés
    setTimeout(() => { checkAchievements(); }, 1500);
};
    // === JELSZÓ HELYREÁLLÍTÁS ===

// Modal megnyitása
window.openForgotModal = function() {
    document.getElementById('loginCard').classList.remove('active'); // Login eltüntetése
    document.getElementById('forgotPasswordModal').classList.add('active');
}

// Modal bezárása
window.closeForgotModal = function() {
    document.getElementById('forgotPasswordModal').classList.remove('active');
    document.getElementById('loginCard').classList.add('active'); // Login visszahozása
}

// Form beküldése (Elfelejtett jelszó)
const forgotForm = document.getElementById('forgotPasswordForm');
if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('forgotEmail').value;
        const code = document.getElementById('forgotRecoveryCode').value;
        const newPass = document.getElementById('forgotNewPassword').value;
        // ÚJ: Megerősítő jelszó kiolvasása
        const confirmPass = document.getElementById('forgotNewPasswordConfirm').value;
        
        const btn = forgotForm.querySelector('.auth-btn');

        // 1. ÚJ ELLENŐRZÉS: Egyezés vizsgálata
        if (newPass !== confirmPass) {
            showError("A két jelszó nem egyezik!");
            // Opcionális: töröljük a jelszó mezőket, hogy újraírhassa
            document.getElementById('forgotNewPassword').value = '';
            document.getElementById('forgotNewPasswordConfirm').value = '';
            return;
        }

        // 2. Hossz ellenőrzése
        if (newPass.length < 8) {
            showError("Az új jelszó túl rövid (min. 8 karakter)!");
            return;
        }

        setLoading(btn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'RESET_PASSWORD', email, recoveryCode: code, newPassword: newPass })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || "Hiba történt.");

            showSuccess(result.message);
            closeForgotModal();
            forgotForm.reset();
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(btn, false);
        }
    });
}
    // === ÚJ "MENŐ" MODAL KEZELÉSE ===

// Kód másolása vágólapra
window.copyRecoveryCode = function() {
    const code = document.getElementById('newRecoveryCodeDisplay').textContent;
    navigator.clipboard.writeText(code).then(() => {
        // Visszajelzés animáció
        const feedback = document.getElementById('copyFeedback');
        feedback.style.opacity = '1';
        setTimeout(() => { feedback.style.opacity = '0'; }, 2000);
    }).catch(err => {
        console.error('Nem sikerült másolni', err);
    });
}

// A kód ablak bezárása -> Irány a Login
window.closeRecoveryModal = function() {
    document.getElementById('recoveryCodeModal').classList.remove('active');
    // Kis késleltetéssel beúsztatjuk a logint
    setTimeout(() => {
        loginCard.classList.add('active');
    }, 300);
}
    // ======================================================
    // === ÚJ: FEJLÉC ÖSSZECSUKÁS (HEADER TOGGLE) ===
    // ======================================================
    const headerToggleBtn = document.getElementById('headerToggleBtn');
    const userHeader = document.getElementById('userHeader');
    
    if (headerToggleBtn && userHeader) {
        headerToggleBtn.addEventListener('click', function() {
            // 1. Osztályok kapcsolása a fejlécen és a gombon
            userHeader.classList.toggle('manual-collapsed');
            this.classList.toggle('rotated');
            
            // 2. Body osztály kapcsolása (ha a tartalomnak feljebb kell csúsznia)
            document.body.classList.toggle('header-is-collapsed');
            
            // 3. Menő effekt: Ha összecsukjuk, mentsük el a localStorage-ba
            // Így frissítés után is összecsukva marad, ha úgy hagytad
            const isCollapsed = userHeader.classList.contains('manual-collapsed');
            localStorage.setItem('headerCollapsedPreference', isCollapsed);
        });

        // +1. Betöltéskor ellenőrizzük a mentett állapotot
        const savedState = localStorage.getItem('headerCollapsedPreference');
        if (savedState === 'true') {
            userHeader.classList.add('manual-collapsed');
            headerToggleBtn.classList.add('rotated');
            document.body.classList.add('header-is-collapsed');
        }
    }
    // ======================================================
// === AJÁNLÓ RENDSZER (LOGIKA) ===
// ======================================================

// Kategória definíciók
const REC_CATEGORIES = {
    'Sör': ['IPA', 'Lager', 'Pilsner', 'Stout', 'Porter', 'Búza', 'Gyümölcsös', 'Ale', 'Egyéb'],
    'Ital': ['Energia ital', 'Bor', 'Pezsgő', 'Vermut', 'Pálinka', 'Whisky', 'Vodka', 'Rum', 'Gin', 'Likőr', 'Koktél', 'Üdítő', 'Egyéb']
};

let allRecommendationsData = []; // Helyi tároló a szűréshez

// 1. Dinamikus kategória betöltő (Modalhoz)
window.updateRecCategoryOptions = function(selectedValue = null) {
    const typeSelect = document.getElementById('recItemType');
    const catSelect = document.getElementById('recCategory');
    
    // Ha véletlenül nincs meg az elem (pl. admin nézetben vagyunk), ne dobjon hibát
    if(!typeSelect || !catSelect) return;

    const currentType = typeSelect.value;
    catSelect.innerHTML = ''; // Törlés
    
    const categories = REC_CATEGORIES[currentType] || ['Egyéb'];
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (selectedValue && cat === selectedValue) option.selected = true;
        catSelect.appendChild(option);
    });
}

// 2. Modal Megnyitása (ÚJ vagy SZERKESZTÉS)
window.openRecModal = function(editIndex = -1) {
    const fabContainer = document.getElementById('fabContainer');
    if(fabContainer) fabContainer.classList.remove('active');

    const modal = document.getElementById('addRecModal');
    const form = document.getElementById('addRecForm');
    const title = document.getElementById('recModalTitle');
    const btnText = document.getElementById('recSubmitBtnText');
    const indexInput = document.getElementById('recEditIndex');

    if (editIndex === -1) {
        // --- ÚJ LÉTREHOZÁSA ---
        form.reset();
        title.textContent = "Mit ajánlasz?";
        btnText.textContent = "AJÁNLÁS BEKÜLDÉSE 🚀";
        indexInput.value = "-1";
        updateRecCategoryOptions(); // Default betöltés
    } else {
        // --- SZERKESZTÉS ---
        const rec = allRecommendationsData.find(r => r.originalIndex === editIndex);
        if (!rec) return;

        title.textContent = "Ajánlás Szerkesztése ✏️";
        btnText.textContent = "MÓDOSÍTÁS MENTÉSE 💾";
        indexInput.value = editIndex;

        document.getElementById('recItemName').value = rec.itemName;
        document.getElementById('recItemType').value = rec.type;
        document.getElementById('recDescription').value = rec.description;
        document.getElementById('recAnonymous').checked = rec.isAnon;
        
        // Kategóriák frissítése és a mentett érték kiválasztása
        updateRecCategoryOptions(rec.category);
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeRecModal = function() {
    document.getElementById('addRecModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 3. Beküldés / Mentés kezelése
const addRecForm = document.getElementById('addRecForm');
if (addRecForm) {
    addRecForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const originalIndex = parseInt(document.getElementById('recEditIndex').value);
        const itemName = document.getElementById('recItemName').value;
        const itemType = document.getElementById('recItemType').value;
        const category = document.getElementById('recCategory').value;
        const description = document.getElementById('recDescription').value;
        const isAnonymous = document.getElementById('recAnonymous').checked;
        const btn = addRecForm.querySelector('.auth-btn');

        const action = originalIndex === -1 ? 'ADD_RECOMMENDATION' : 'EDIT_RECOMMENDATION';

        setLoading(btn, true);

        try {
            const bodyData = { 
                action, 
                itemName, 
                itemType, 
                category, 
                description, 
                isAnonymous 
            };

            if (originalIndex !== -1) {
                bodyData.originalIndex = originalIndex;
            }

            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(bodyData)
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Hiba történt.");

            showSuccess(originalIndex === -1 ? "Ajánlás sikeresen beküldve! 📢" : "Sikeres módosítás! ✅");
            closeRecModal();
            loadRecommendations(); 

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(btn, false);
        }
    });
}

// 4. Betöltés
async function loadRecommendations() {
    const container = document.getElementById('recommendationsList');
    if (!container) return;
    
    container.innerHTML = '<div class="recap-spinner"></div>';

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ action: 'GET_RECOMMENDATIONS' })
        });

        const recs = await response.json();
        allRecommendationsData = recs || []; 

        applyRecFilters(); 

    } catch (error) {
        console.error("Hiba:", error);
        container.innerHTML = '<p class="error">Hiba a betöltéskor.</p>';
    }
}

// 5. AJÁNLÁSOK SZŰRÉSE ÉS MEGJELENÍTÉSE (TÖRLÉS GOMBBAL)
function applyRecFilters() {
    const container = document.getElementById('recommendationsList');
    const filterType = document.getElementById('filterRecType').value;
    const filterCat = document.getElementById('filterRecCategory').value;
    const filterMyRecs = document.getElementById('filterMyRecs').checked;

    container.innerHTML = '';

    const filtered = allRecommendationsData.filter(item => {
        if (filterType !== 'all' && item.type !== filterType) return false;
        if (filterCat !== 'all' && item.category !== filterCat) return false;
        if (filterMyRecs && !item.isMine) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<p class="rec-no-results">Nincs találat a szűrésre.</p>`;
        return;
    }

    filtered.forEach(item => {
        const isBeer = item.type === 'Sör';
        const typeClass = isBeer ? 'type-beer' : 'type-drink';
        const typeIcon = isBeer ? '🍺' : '🍹';
        const userClass = item.isAnon ? 'rec-user anon' : 'rec-user';
        
        const badgeHtml = (item.badge && !item.isAnon) 
            ? `<span class="user-badge-display tiny">${item.badge}</span>` : '';

        // SZERKESZTÉS ÉS TÖRLÉS GOMBOK - csak ha a sajátja
        const actionBtns = item.isMine 
            ? `
                <button class="edit-rec-btn" onclick="openRecModal(${item.originalIndex})" title="Szerkesztés">✏️</button>
                <button class="delete-rec-btn" onclick="deleteUserRecommendation(${item.originalIndex})" title="Törlés">🗑️</button>
              ` 
            : '';
            
        const editedHtml = item.isEdited 
            ? `<span class="rec-edited-tag">(módosítva)</span>` 
            : '';

        const html = `
        <div class="rec-card ${typeClass}">
            <div class="rec-action-btns">
                ${actionBtns}
            </div>
            <div class="rec-header">
                <div>
                    <div class="rec-item-name">${item.itemName}</div>
                    <div class="rec-sub-info">${item.category}</div>
                </div>
                <div class="rec-type-badge">${typeIcon} ${item.type}</div>
            </div>
            
            <div class="rec-desc">
                "${item.description}"
            </div>
            
            <div class="rec-footer">
                <div class="${userClass}">
                    <span>${item.isAnon ? '🕵️' : '👤'}</span>
                    <span>${item.submitter}</span>
                    ${badgeHtml}
                </div>
                <div class="rec-meta">
                    <div class="rec-date">${item.date}</div>
                    ${editedHtml}
                </div>
            </div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// 6. Eseménykezelők a szűréshez
const filterTypeEl = document.getElementById('filterRecType');
if(filterTypeEl) {
    filterTypeEl.addEventListener('change', (e) => {
        const type = e.target.value;
        const catSelect = document.getElementById('filterRecCategory');
        
        catSelect.innerHTML = '<option value="all">Összes kategória</option>';
        
        if (type !== 'all' && REC_CATEGORIES[type]) {
            REC_CATEGORIES[type].forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.textContent = cat;
                catSelect.appendChild(opt);
            });
        }
        applyRecFilters();
    });
}

const filterCatEl = document.getElementById('filterRecCategory');
if(filterCatEl) filterCatEl.addEventListener('change', applyRecFilters);

const filterMyRecsEl = document.getElementById('filterMyRecs');
if(filterMyRecsEl) filterMyRecsEl.addEventListener('change', applyRecFilters);

// Tab kattintás figyelése
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item');
    if (!btn) return;
    
    // Ha az Ajánlások tabra kattintunk, MINDIG újratöltjük az adatokat
    if (btn.dataset.tabContent === 'user-recommendations-content') {
        // Először töröljük a régit
        allRecommendationsData = [];
        // Aztán betöltjük az újat
        loadRecommendations();
    }
});
// === TÖRLÉSI FUNKCIÓK ===
// Illeszd be a js.js fájl végére

// 1. SÖR TÖRLÉSE
window.deleteUserBeer = async function(index) {
    if (!confirm("Biztosan törölni akarod ezt a sört? Ez a művelet nem visszavonható!")) {
        return;
    }
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_BEER', 
                index: index 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Szerverhiba');
        }
        
        showSuccess('Sör sikeresen törölve! 🗑️');
        loadUserData(); // Újratöltjük a listát
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni a sört.");
    }
}

// 2. ITAL TÖRLÉSE
window.deleteUserDrink = async function(index) {
    if (!confirm("Biztosan törölni akarod ezt az italt? Ez a művelet nem visszavonható!")) {
        return;
    }
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_DRINK', 
                index: index 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Szerverhiba');
        }
        
        showSuccess('Ital sikeresen törölve! 🗑️');
        loadUserDrinks(); // Újratöltjük a listát
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az italt.");
    }
}

// 3. ÖTLET TÖRLÉSE
window.deleteUserIdea = async function(index) {
    if (!confirm("Biztosan törölni akarod ezt az ötletet? Ez a művelet nem visszavonható!")) {
        return;
    }
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_IDEA', 
                index: index 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Szerverhiba');
        }
        
        showSuccess('Ötlet sikeresen törölve! 🗑️');
        loadUserIdeas(); // Újratöltjük a listát
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az ötletet.");
    }
}

// 4. AJÁNLÁS TÖRLÉSE
window.deleteUserRecommendation = async function(originalIndex) {
    if (!confirm("Biztosan törölni akarod ezt az ajánlást? Ez a művelet nem visszavonható!")) {
        return;
    }
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_RECOMMENDATION', 
                originalIndex: originalIndex 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Szerverhiba');
        }
        
        showSuccess('Ajánlás sikeresen törölve! 🗑️');
        loadRecommendations(); // Újratöltjük a listát
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az ajánlást.");
    }
}
    // === TÖRLÉS MODALOK - JavaScript Logika ===
// Illeszd be a js.js fájl végére (a deleteUserBeer, deleteUserDrink stb. függvények HELYETT)

// === GLOBÁLIS VÁLTOZÓK A TÖRLÉSHEZ ===
let deletePendingIndex = null;
let deletePendingData = null;

// =========================================
// === 1. SÖR TÖRLÉS ===
// =========================================

window.deleteUserBeer = function(index) {
    // Modal megnyitása
    const modal = document.getElementById('deleteBeerModal');
    const input = document.getElementById('deleteBeerConfirmInput');
    const btn = document.getElementById('finalDeleteBeerBtn');
    
    // Adatok betöltése
    const beer = currentUserBeers[index];
    if (!beer) return;
    
    deletePendingIndex = index;
    
    // Részletek megjelenítése
    document.getElementById('deleteBeerName').textContent = beer.beerName;
    document.getElementById('deleteBeerDetails').textContent = 
        `${beer.type} • ${beer.location} • Átlag: ${beer.avg}`;
    
    // Reset
    input.value = '';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    modal.classList.add('active');
    
    // Input figyelés
    input.oninput = function() {
        if (this.value === 'TÖRLÉS') {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
}

window.closeDeleteBeerModal = function() {
    document.getElementById('deleteBeerModal').classList.remove('active');
    deletePendingIndex = null;
}

window.confirmDeleteBeer = async function() {
    const btn = document.getElementById('finalDeleteBeerBtn');
    const input = document.getElementById('deleteBeerConfirmInput');
    
    if (input.value !== 'TÖRLÉS') return;
    
    btn.innerText = "Törlés folyamatban...";
    btn.disabled = true;
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_BEER', 
                index: deletePendingIndex 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Sör sikeresen törölve! 🗑️');
        closeDeleteBeerModal();
        loadUserData(); // Újratöltés
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni a sört.");
        btn.innerText = "Sör Törlése 🗑️";
        btn.disabled = false;
    }
}

// =========================================
// === 2. ITAL TÖRLÉS ===
// =========================================

window.deleteUserDrink = function(index) {
    const modal = document.getElementById('deleteDrinkModal');
    const input = document.getElementById('deleteDrinkConfirmInput');
    const btn = document.getElementById('finalDeleteDrinkBtn');
    
    const drink = currentUserDrinks[index];
    if (!drink) return;
    
    deletePendingIndex = index;
    
    document.getElementById('deleteDrinkName').textContent = drink.drinkName;
    document.getElementById('deleteDrinkDetails').textContent = 
        `${drink.category} • ${drink.location} • Átlag: ${drink.avg}`;
    
    input.value = '';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    modal.classList.add('active');
    
    input.oninput = function() {
        if (this.value === 'TÖRLÉS') {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
}

window.closeDeleteDrinkModal = function() {
    document.getElementById('deleteDrinkModal').classList.remove('active');
    deletePendingIndex = null;
}

window.confirmDeleteDrink = async function() {
    const btn = document.getElementById('finalDeleteDrinkBtn');
    const input = document.getElementById('deleteDrinkConfirmInput');
    
    if (input.value !== 'TÖRLÉS') return;
    
    btn.innerText = "Törlés folyamatban...";
    btn.disabled = true;
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_DRINK', 
                index: deletePendingIndex 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Ital sikeresen törölve! 🗑️');
        closeDeleteDrinkModal();
        loadUserDrinks();
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az italt.");
        btn.innerText = "Ital Törlése 🗑️";
        btn.disabled = false;
    }
}

// =========================================
// === 3. ÖTLET TÖRLÉS ===
// =========================================

window.deleteUserIdea = function(index) {
    const modal = document.getElementById('deleteIdeaModal');
    const input = document.getElementById('deleteIdeaConfirmInput');
    const btn = document.getElementById('finalDeleteIdeaBtn');
    
    deletePendingIndex = index;
    
    // Az ötlet szövegét meg kell keresni az adatok között
    // Ez a loadUserIdeas függvénytől függ, hogyan tárolja
    const ideaText = document.querySelectorAll('.pending-idea-card h4')[index]?.textContent || 'Ötlet';
    
    document.getElementById('deleteIdeaText').textContent = `"${ideaText}"`;
    
    input.value = '';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    modal.classList.add('active');
    
    input.oninput = function() {
        if (this.value === 'TÖRLÉS') {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
}

window.closeDeleteIdeaModal = function() {
    document.getElementById('deleteIdeaModal').classList.remove('active');
    deletePendingIndex = null;
}

window.confirmDeleteIdea = async function() {
    const btn = document.getElementById('finalDeleteIdeaBtn');
    const input = document.getElementById('deleteIdeaConfirmInput');
    
    if (input.value !== 'TÖRLÉS') return;
    
    btn.innerText = "Törlés folyamatban...";
    btn.disabled = true;
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_IDEA', 
                index: deletePendingIndex 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Ötlet sikeresen törölve! 🗑️');
        closeDeleteIdeaModal();
        loadUserIdeas();
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az ötletet.");
        btn.innerText = "Ötlet Törlése 🗑️";
        btn.disabled = false;
    }
}

// =========================================
// === 4. AJÁNLÁS TÖRLÉS ===
// =========================================

window.deleteUserRecommendation = function(originalIndex) {
    const modal = document.getElementById('deleteRecModal');
    const input = document.getElementById('deleteRecConfirmInput');
    const btn = document.getElementById('finalDeleteRecBtn');
    
    deletePendingIndex = originalIndex;
    
    // Az ajánlás adatait meg kell keresni
    const rec = allRecommendationsData.find(r => r.originalIndex === originalIndex);
    if (!rec) return;
    
    document.getElementById('deleteRecName').textContent = rec.itemName;
    document.getElementById('deleteRecDetails').textContent = 
        `${rec.type} • ${rec.category}`;
    document.getElementById('deleteRecDesc').textContent = rec.description;
    
    input.value = '';
    btn.disabled = true;
    btn.style.opacity = '0.5';
    
    modal.classList.add('active');
    
    input.oninput = function() {
        if (this.value === 'TÖRLÉS') {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
}

window.closeDeleteRecModal = function() {
    document.getElementById('deleteRecModal').classList.remove('active');
    deletePendingIndex = null;
}

window.confirmDeleteRec = async function() {
    const btn = document.getElementById('finalDeleteRecBtn');
    const input = document.getElementById('deleteRecConfirmInput');
    
    if (input.value !== 'TÖRLÉS') return;
    
    btn.innerText = "Törlés folyamatban...";
    btn.disabled = true;
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('userToken')}` 
            },
            body: JSON.stringify({ 
                action: 'DELETE_USER_RECOMMENDATION', 
                originalIndex: deletePendingIndex 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) throw new Error(result.error || 'Szerverhiba');
        
        showSuccess('Ajánlás sikeresen törölve! 🗑️');
        closeDeleteRecModal();
        loadRecommendations();
        
    } catch (error) {
        console.error("Törlési hiba:", error);
        showError(error.message || "Nem sikerült törölni az ajánlást.");
        btn.innerText = "Ajánlás Törlése 🗑️";
        btn.disabled = false;
    }
}
    // === TELJES ADAT MEGTEKINTÉS FUNKCIÓK ===
// ILLESZD BE A JS.JS FÁJL VÉGÉRE

// === 1. SÖR TELJES ADATAI ===
window.openViewBeerModal = function(index) {
    const beer = currentUserBeers[index];
    if (!beer) return;

    // Modal megnyitása
    const modal = document.getElementById('viewBeerModal');
    
    // Adatok beállítása
    document.getElementById('viewBeerName').textContent = beer.beerName;
    document.getElementById('viewBeerType').textContent = beer.type || 'N/A';
    document.getElementById('viewBeerLocation').textContent = beer.location || '-';
    document.getElementById('viewBeerPercentage').textContent = beer.beerPercentage ? `${beer.beerPercentage}%` : '-';
    
    // Dátum formázása
    const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : '-';
    document.getElementById('viewBeerDate').textContent = formattedDate;
    
    // Pontszámok
    document.getElementById('viewBeerLook').textContent = beer.look || 0;
    document.getElementById('viewBeerSmell').textContent = beer.smell || 0;
    document.getElementById('viewBeerTaste').textContent = beer.taste || 0;
    document.getElementById('viewBeerTotal').textContent = beer.totalScore || 0;
    
    // Átlag formázása
    const avgValue = parseFloat(beer.avg.toString().replace(',', '.')) || 0;
    document.getElementById('viewBeerAvg').textContent = avgValue.toFixed(2);
    
    // Jegyzetek kezelése
    const notesSection = document.getElementById('viewBeerNotesSection');
    const notesBox = document.getElementById('viewBeerNotes');
    
    if (beer.notes && beer.notes.trim() !== '') {
        notesBox.textContent = beer.notes;
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
    
    // Modal megjelenítése
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeViewBeerModal = function() {
    const modal = document.getElementById('viewBeerModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// === 2. ITAL TELJES ADATAI ===
window.openViewDrinkModal = function(index) {
    const drink = currentUserDrinks[index];
    if (!drink) return;

    // Modal megnyitása
    const modal = document.getElementById('viewDrinkModal');
    
    // Adatok beállítása
    document.getElementById('viewDrinkName').textContent = drink.drinkName;
    document.getElementById('viewDrinkCategory').textContent = drink.category || 'N/A';
    document.getElementById('viewDrinkType').textContent = drink.type || 'N/A';
    document.getElementById('viewDrinkLocation').textContent = drink.location || '-';
    document.getElementById('viewDrinkPercentage').textContent = drink.drinkPercentage ? `${drink.drinkPercentage}%` : '-';
    
    // Dátum formázása
    const formattedDate = drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : '-';
    document.getElementById('viewDrinkDate').textContent = formattedDate;
    
    // Pontszámok
    document.getElementById('viewDrinkLook').textContent = drink.look || 0;
    document.getElementById('viewDrinkSmell').textContent = drink.smell || 0;
    document.getElementById('viewDrinkTaste').textContent = drink.taste || 0;
    document.getElementById('viewDrinkTotal').textContent = drink.totalScore || 0;
    
    // Átlag formázása
    const avgValue = parseFloat(drink.avg.toString().replace(',', '.')) || 0;
    document.getElementById('viewDrinkAvg').textContent = avgValue.toFixed(2);
    
    // Jegyzetek kezelése
    const notesSection = document.getElementById('viewDrinkNotesSection');
    const notesBox = document.getElementById('viewDrinkNotes');
    
    if (drink.notes && drink.notes.trim() !== '') {
        notesBox.textContent = drink.notes;
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
    
    // Modal megjelenítése
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeViewDrinkModal = function() {
    const modal = document.getElementById('viewDrinkModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// === 3. TÁBLÁZAT FRISSÍTÉSEK (renderUserBeers és renderUserDrinks módosítása) ===

// CSERÉLD LE A RÉGI renderUserBeers FÜGGVÉNYT EZZEL:
function renderUserBeers(beers) {
    userBeerTableBody.innerHTML = '';
    if (!beers || beers.length === 0) {
        userBeerTableBody.innerHTML = `<tr><td colspan="10" class="no-results">Még nem értékeltél egy sört sem.</td></tr>`;
        return;
    }
    
    // FONTOS: Itt a 'beer' objektumból vesszük ki az 'originalIndex'-et!
    beers.forEach((beer) => {  // Itt már nem is feltétlenül kell a második 'index' paraméter
        
        // Ha véletlenül nincs originalIndex (pl. régi cache miatt), akkor fallback megoldásként keressük meg
        // De az 1. lépés miatt lennie kell.
        const safeIndex = (beer.originalIndex !== undefined) ? beer.originalIndex : currentUserBeers.indexOf(beer);

        const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : 'N/A';
        const formattedAvg = beer.avg ? parseFloat(beer.avg.toString().replace(',', '.')).toFixed(2) : '0.00';
        
        const row = `
            <tr>
                <td data-label="Dátum">${formattedDate}</td>
                <td data-label="Sör neve" class="mobile-card-title">${beer.beerName}</td>
                <td data-label="Főzési hely">${beer.location}</td>
                <td data-label="Alkohol %">${beer.beerPercentage || 0}%</td>
                <td data-label="Külalak">${beer.look || 0}</td>
                <td data-label="Illat">${beer.smell || 0}</td>
                <td data-label="Íz">${beer.taste || 0}</td>
                <td data-label="Összpontszám">${beer.totalScore || 0}</td>
                <td data-label="Átlag" class="average-cell">${formattedAvg}</td>
                <td data-label="Művelet" style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="view-btn" onclick="openViewBeerModal(${safeIndex})" title="Teljes adat">👁️</button>
                    <button class="edit-btn" onclick="openEditBeerModal(${safeIndex})">✏️ Szerkesztés</button>
                    <button class="delete-btn-mini" onclick="deleteUserBeer(${safeIndex})">🗑️ Törlés</button>
                </td>
            </tr>
        `;
        userBeerTableBody.insertAdjacentHTML('beforeend', row);
    });
}

// CSERÉLD LE A RÉGI renderUserDrinks FÜGGVÉNYT EZZEL:
function renderUserDrinks(drinks) {
    userDrinkTableBody.innerHTML = '';
    if (!drinks || drinks.length === 0) {
        userDrinkTableBody.innerHTML = `<tr><td colspan="12" class="no-results">Még nem értékeltél egy italt sem.</td></tr>`;
        return;
    }
    
    drinks.forEach((drink) => {
        // ITT IS: safeIndex használata az eredeti pozícióhoz
        const safeIndex = (drink.originalIndex !== undefined) ? drink.originalIndex : currentUserDrinks.indexOf(drink);

        const formattedDate = drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : 'N/A';
        const scoreSum = (parseFloat(drink.look) || 0) + (parseFloat(drink.smell) || 0) + (parseFloat(drink.taste) || 0);
        const calculatedAvg = scoreSum / 3;
        const formattedAvg = calculatedAvg.toFixed(2);
        
        const row = `
            <tr>
                <td data-label="Dátum">${formattedDate}</td>
                <td data-label="Ital neve" class="mobile-card-title">${drink.drinkName}</td>
                <td data-label="Kategória">${drink.category}</td>
                <td data-label="Típus">${drink.type}</td>
                <td data-label="Hely">${drink.location}</td>
                <td data-label="Alkohol %">${drink.drinkPercentage || '-'}${drink.drinkPercentage ? '%' : ''}</td>
                <td data-label="Külalak">${drink.look || 0}</td>
                <td data-label="Illat">${drink.smell || 0}</td>
                <td data-label="Íz">${drink.taste || 0}</td>
                <td data-label="Összpontszám">${drink.totalScore || 0}</td>
                <td data-label="Átlag" class="average-cell">${formattedAvg}</td>
                <td data-label="Művelet" style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="view-btn" onclick="openViewDrinkModal(${safeIndex})" title="Teljes adat">👁️</button>
                    <button class="edit-btn" onclick="openEditDrinkModal(${safeIndex})">✏️ Szerkesztés</button>
                    <button class="delete-btn-mini" onclick="deleteUserDrink(${safeIndex})">🗑️ Törlés</button>
                </td>
            </tr>
        `;
        userDrinkTableBody.insertAdjacentHTML('beforeend', row);
    });
}
    // === TÁBLÁZAT RENDEZÉS (SORTING) FUNKCIÓ ===

let currentSort = {
    beer: { column: null, direction: null, dataType: null },
    drink: { column: null, direction: null, dataType: null }
};

// Rendezés inicializálása
function initTableSorting() {
    // Sörös táblázat fejlécek
    const beerHeaders = document.querySelectorAll('#user-beers-content .sortable');
    beerHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            const type = header.dataset.type;
            sortTable('beer', column, type, header);
        });
    });

    // Italos táblázat fejlécek
    const drinkHeaders = document.querySelectorAll('#user-drinks-content .sortable');
    drinkHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            const type = header.dataset.type;
            sortTable('drink', column, type, header);
        });
    });
}

// Rendezési logika
function sortTable(tableType, column, dataType, headerElement) {
    const currentState = currentSort[tableType];
    
    // Irány meghatározása: null -> asc -> desc -> null
    let newDirection;
    if (currentState.column !== column) {
        newDirection = 'asc'; // Új oszlop, növekvő
    } else if (currentState.direction === null || currentState.direction === 'desc') {
        newDirection = 'asc';
    } else {
        newDirection = 'desc';
    }
    
    // ÚJ RÉSZ: Elmentjük a dataType-ot is, hogy újratöltésnél tudjuk használni!
    currentSort[tableType] = { column, direction: newDirection, dataType: dataType };

    // Vizuális frissítés (nyilak)
    updateSortArrows(tableType, headerElement, newDirection);

    // Adatok rendezése
    if (tableType === 'beer') {
        sortAndRenderBeers(column, dataType, newDirection);
    } else {
        sortAndRenderDrinks(column, dataType, newDirection);
    }
}

// Vizuális nyilak frissítése
function updateSortArrows(tableType, activeHeader, direction) {
    // Összes nyíl törlése az adott táblázatból
    const container = tableType === 'beer' 
        ? document.querySelector('#user-beers-content') 
        : document.querySelector('#user-drinks-content');
    
    if (!container) return;
    
    container.querySelectorAll('.sortable').forEach(header => {
        header.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Aktív oszlop jelölése
    if (direction === 'asc') {
        activeHeader.classList.add('sort-asc');
    } else {
        activeHeader.classList.add('sort-desc');
    }
}

// SÖRÖK rendezése és kirajzolása
function sortAndRenderBeers(column, dataType, direction) {
    if (!currentUserBeers || currentUserBeers.length === 0) return;
    
    const sorted = [...currentUserBeers].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Típus szerinti összehasonlítás
        if (dataType === 'number') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        } else if (dataType === 'date') {
            valA = new Date(valA || '1970-01-01').getTime();
            valB = new Date(valB || '1970-01-01').getTime();
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderUserBeers(sorted);
}

// ITALOK rendezése és kirajzolása
function sortAndRenderDrinks(column, dataType, direction) {
    if (!currentUserDrinks || currentUserDrinks.length === 0) return;
    
    const sorted = [...currentUserDrinks].sort((a, b) => {
        let valA = a[column];
        let valB = b[column];
        
        // Típus szerinti összehasonlítás
        if (dataType === 'number') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
        } else if (dataType === 'date') {
            valA = new Date(valA || '1970-01-01').getTime();
            valB = new Date(valB || '1970-01-01').getTime();
        } else {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
        }
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
    
    renderUserDrinks(sorted);
}

// Inicializálás a switchToUserView frissítéséhez
// Keress rá a meglévő switchToUserView függvényre és add hozzá a végéhez:
const originalSwitchToUserViewSorting = switchToUserView;
switchToUserView = function() {
    originalSwitchToUserViewSorting();
    
    // Rendezés inicializálása kis késleltetéssel
    setTimeout(() => {
        initTableSorting();
    }, 500);
};
});


















































































