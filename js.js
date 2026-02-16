document.addEventListener('DOMContentLoaded', function() {

    // Service Worker regisztrálása a PWA-hoz
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('Service Worker sikeresen regisztrálva! Scope:', registration.scope);
            })
            .catch((error) => {
                console.error('Service Worker regisztráció sikertelen:', error);
            });
    });
}


    function escapeHtml(text) {
    if (!text) return text;
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

    // Illeszd be a js.js fájl elejére, az escapeHtml függvény után:

/**
 * Biztonságosan beállít szöveget egy elembe XSS védelem mellett
 * @param {string} elementId - A cél elem ID-ja
 * @param {string} text - A beállítandó szöveg
 * @param {boolean} allowLineBreaks - Engedélyezi-e a sortöréseket (<br> tag-ekkel)
 */
function setSafeText(elementId, text, allowLineBreaks = false) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Element not found: ${elementId}`);
        return;
    }
    
    if (!text) {
        element.textContent = '';
        return;
    }
    
    if (allowLineBreaks) {
        // Sortörések megengedése, de minden más escape-elve
        const escapedText = escapeHtml(text);
        const withBreaks = escapedText.replace(/\n/g, '<br>');
        element.innerHTML = withBreaks;
    } else {
        // Tiszta szöveg, teljes védelem
        element.textContent = text;
    }
}

    // === 18+ KORHATÁR ELLENŐRZÉS ===
    function checkAgeVerification() {
        // Megnézzük, hogy a felhasználó igazolta-e már korábban
        const isVerified = localStorage.getItem('ageVerified') === 'true';
        
        if (!isVerified) {
            const ageModal = document.getElementById('ageVerificationModal');
            if (ageModal) {
                // Megjelenítjük a modalt
                ageModal.classList.add('active');
                // Letiltjuk a görgetést, hogy ne lásson semmit mögötte
                document.body.style.overflow = 'hidden';
            }
        }
    }

    // Globális függvény, hogy a HTML gombok elérjék
    window.verifyAge = function(isOver18) {
        if (isOver18) {
            // Ha elmúlt 18 -> Elmentjük és bezárjuk
            localStorage.setItem('ageVerified', 'true');
            syncSettingsToCloud();
            const ageModal = document.getElementById('ageVerificationModal');
            
            // Animációval tüntetjük el
            ageModal.style.opacity = '0';
            setTimeout(() => {
                ageModal.classList.remove('active');
                ageModal.style.opacity = ''; // Reset
                document.body.style.overflow = 'auto'; // Görgetés visszaállítása
            }, 500);
            
            showSuccess("Jó szórakozást! Fogyassz felelősséggel! 🍺");
        } else {
            // Ha nem múlt el 18 -> Átirányítás
            window.location.href = "https://www.google.com";
        }
    }

    // Azonnali ellenőrzés indítása
    checkAgeVerification();

    if (!localStorage.getItem('cookieConsentSeen')) {
        const toast = document.getElementById('cookieToast');
        if (toast) {
            setTimeout(() => {
                toast.style.display = 'block';
            }, 1000);
        }
    }

    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#e0e0e0';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }

    // === JELSZÓ MEGJELENÍTŐ FUNKCIÓ (Globális) ===
    window.togglePasswordVisibility = function(iconElement) {
        // Megkeressük az adott input csoportban lévő inputot
        // Az 'iconElement' itt maga a szem ikon (this)
        const group = iconElement.closest('.input-group');
        const input = group.querySelector('input');
        
        if (input.type === 'password') {
            input.type = 'text';
            input.classList.add('password-visible');
            iconElement.textContent = '🙈'; // Csukott szem
        } else {
            input.type = 'password';
            input.classList.remove('password-visible');
            iconElement.textContent = '👁️'; // Nyitott szem
        }
    };
    
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
    const userView = document.getElementById('userView')
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
    
    
    // STATISZTIKA ELEMEK
    const statsView = document.getElementById('statsView');
    const statTabButtons = document.getElementById('statTabButtons');
    const statPanes = document.querySelectorAll('.stat-pane');
    
    const loginCard = document.getElementById('loginCard'), registerCard = document.getElementById('registerCard'), switchAuthLinks = document.querySelectorAll('.switch-auth'), adminBtn = document.getElementById('adminBtn'), adminModal = document.getElementById('adminModal'), modalClose = document.getElementById('modalClose'), logoutBtn = document.getElementById('logoutBtn'), refreshBtn = document.getElementById('refreshBtn');

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

    // ======================================================
    // === FŐ FUNKCIÓK (SZERVER KOMMUNIKÁCIÓ) ===
    // ======================================================

    async function handleAdminLogin(e) {
        e.preventDefault();
        
        // A jelszó mező értékét használjuk PIN kódként
        const pinInput = document.getElementById('adminPassword').value;
        const submitBtn = adminForm.querySelector('.auth-btn');

        // Opcionális: kliens oldali ellenőrzés, hogy 6 számjegy-e
        if (pinInput.length < 4) {
            showError('A PIN kód túl rövid!');
            return;
        }

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Itt küldjük el a PIN-t a backendnek
                body: JSON.stringify({ action: 'GET_DATA', pin: pinInput })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Hiba: ${response.status}`);
            
            // Adatok mentése
            beersData = result.beers || [];
            usersData = result.users || [];
            filteredBeers = [...beersData]; 
            
            if (result.adminToken) {
                console.log("Admin token sikeresen mentve!");
                localStorage.setItem('userToken', result.adminToken);
                syncSettingsToCloud();
                localStorage.setItem('userData', JSON.stringify({ 
                    name: 'Adminisztrátor', 
                    email: 'admin@sortablazat.hu', 
                    isAdmin: true 
                }));
            } 
            
            showSuccess('Sikeres Admin belépés! 🔓');
            
            // Töröljük a mezőt biztonsági okból
            document.getElementById('adminPassword').value = '';

            setTimeout(() => {
                closeAdminModal();
                switchToAdminView();
            }, 1000);

        } catch (error) {
            console.error("Bejelentkezési hiba:", error);
            showError(error.message || 'Hibás PIN kód!');
            // Hibánál rezegjen a mező (opcionális vizuális effekt)
            const input = document.getElementById('adminPassword');
            input.style.borderColor = '#ff4444';
            setTimeout(() => input.style.borderColor = '', 500);
        } finally {
            setLoading(submitBtn, false);
        }
    }
    
    // ======================================================
    // === VENDÉG FELHASZNÁLÓ FUNKCIÓK ===
    // ======================================================

    async function handleAddBeer(e) {
        if (!navigator.onLine) {
    showError("Nincs internetkapcsolat! Kérlek csatlakozz a hálózatra a mentéshez.");
    return;
}
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
    const btnTextSpan = submitBtn.querySelector('.btn-text');
    const originalText = btnTextSpan.innerText;
    
    btnTextSpan.innerText = "Mentés folyamatban";
    btnTextSpan.classList.add('loading-dots');

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
        refreshUserData();
    } catch (error) {
        console.error("Hiba sör hozzáadásakor:", error);
        showError(error.message || "Nem sikerült a sört hozzáadni.");
    } finally {
        setLoading(submitBtn, false);
        if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
        }
    }
}

    async function handleAddDrink(e) {
        if (!navigator.onLine) {
    showError("Nincs internetkapcsolat! Kérlek csatlakozz a hálózatra a mentéshez.");
    return;
}
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
    const btnTextSpan = submitBtn.querySelector('.btn-text');
    const originalText = btnTextSpan.innerText;
    
    btnTextSpan.innerText = "Mentés folyamatban";
    btnTextSpan.classList.add('loading-dots');

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
        refreshUserData();
    } catch (error) {
        console.error("Hiba ital hozzáadásakor:", error);
        showError(error.message || "Nem sikerült az italt hozzáadni.");
    } finally {
        setLoading(submitBtn, false);
        if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
        }
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

        if (typeof updateMyStatistics === 'function') {
        updateMyStatistics();
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
    const btnTextSpan = btn.querySelector('.btn-text');
    const originalText = btnTextSpan ? btnTextSpan.innerText : "Küldés";
    
    if(btnTextSpan) {
        btnTextSpan.innerText = "Küldés folyamatban";
        btnTextSpan.classList.add('loading-dots');
    }
    
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
        if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
        }
    }
}

// 3. ÖTLETEK BETÖLTÉSE (BADGE TÁMOGATÁSSAL + TÖRLÉS)
async function loadUserIdeas() {
    const hallContainer = document.getElementById('hallOfFameList');
    const pendingContainer = document.getElementById('pendingIdeasList');
    
    // Spinner csak a pending részre, a Hall of Fame maradhat statikusabb
    if(pendingContainer) pendingContainer.innerHTML = '<div class="recap-spinner"></div>';
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_ALL_IDEAS' })
        });
        const ideas = await response.json();
        
        if (!response.ok) throw new Error("Nem sikerült betölteni az ötleteket.");
        
        if(hallContainer) hallContainer.innerHTML = '';
        if(pendingContainer) pendingContainer.innerHTML = '';

        if(ideas.length === 0) {
            if(pendingContainer) pendingContainer.innerHTML = '<p style="text-align:center; color:#aaa;">Még nincsenek ötletek. Légy te az első!</p>';
            return;
        }

        // Aktuális felhasználó email-je az összehasonlításhoz
        const userData = JSON.parse(localStorage.getItem('userData'));
        const currentUserEmail = userData ? userData.email : null;

        let hasFame = false;
        let pendingIndex = 0; // Számláló a törölhető ötletekhez (indexelés miatt)

        ideas.forEach(item => {
            const isDone = (item.status === 'Megcsinálva');
            const isOwner = (item.email === currentUserEmail);
            
            const badgeHtml = item.badge 
                    ? `<span class="fame-badge">${escapeHtml(item.badge)}</span>` 
                    : '';

            if (isDone) {
                // --- DICSŐSÉGFAL (Itt nem szokás jelenteni, de ha akarod, ide is rakhatsz gombot) ---
                hasFame = true;
                const card = `
                <div class="fame-card">
                    <div class="fame-user">
                        <span class="fame-avatar">👑</span>
                        <span class="fame-name">
                            ${escapeHtml(item.submitter)}
                            ${badgeHtml}
                        </span>
                    </div>
                    <div class="fame-idea">"${escapeHtml(item.idea)}"</div>
                    <div class="fame-footer">
                        Köszönjük az ötletet! • ${item.date}
                    </div>
                </div>`;
                if(hallContainer) hallContainer.insertAdjacentHTML('beforeend', card);
            } else {
                // --- VÁRAKOZÓ LISTA ---
                
                // Törlés gomb (ha saját)
                const deleteBtn = isOwner 
                    ? `<button class="delete-idea-btn" onclick="deleteUserIdea(${pendingIndex})" title="Törlés">🗑️</button>`
                    : '';

                // Jelentés gomb (ha NEM saját)
                const reportBtn = (!isOwner && currentUserEmail)
                ? `<button class="report-idea-btn" onclick="openReportModal('Ötlet', ${item.index}, '${escapeHtml(item.idea)}')" title="Jelentés" style="background:none; border:none; cursor:pointer; font-size:1.2rem; margin-left:10px;">🚩</button>`
                : '';

                const voteActiveClass = item.hasVoted ? 'active' : '';
                const card = `
                <div class="pending-idea-card">
                    <div class="vote-container">
                        <button class="vote-btn ${voteActiveClass}" onclick="handleVote('idea', ${item.index}, this)">
                            ▲
                        </button>
                        <span class="vote-count">${item.voteCount}</span>
                    </div>

                    <div class="pending-content">
                        <h4>${escapeHtml(item.idea)}</h4>
                        <p>
                            Beküldte: ${escapeHtml(item.submitter)} ${badgeHtml} • ${item.date}
                        </p>
                    </div>
                    <div class="pending-actions">
                        <div class="pending-status">⏳ ${item.status}</div>
                        ${reportBtn}
                        ${deleteBtn}
                    </div>
                </div>`;
                if(pendingContainer) pendingContainer.insertAdjacentHTML('beforeend', card);
                
                // Csak a nem kész ötleteket számláljuk az indexeléshez
                pendingIndex++;
            }
        });
        
        if(!hasFame && hallContainer) {
            hallContainer.innerHTML = '<p style="color:#aaa; font-style:italic;">Még üres a dicsőségfal. Küldj be egy jó ötletet!</p>';
        }

    } catch (error) {
        console.error(error);
        if(pendingContainer) pendingContainer.innerHTML = '<p class="error">Hiba a betöltéskor.</p>';
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
                <td>${escapeHtml(item.submitter)} <br><small style="color:#aaa;">${item.email}</small></td>
                <td>${escapeHtml(item.idea)}</td>
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

        // --- ÚJ RÉSZ: Animáció beállítása ---
        const btnTextSpan = submitBtn.querySelector('.btn-text');
        const originalText = btnTextSpan.innerText; // "Regisztráció" elmentése
        
        // --- VALIDÁCIÓK  ---
        if (password.length < 8) {
            showError("A jelszónak legalább 8 karakter hosszúnak kell lennie!");
            return;
        }
        if (!/\d/.test(password)) {
            showError("A jelszónak tartalmaznia kell legalább egy számot!");
            return;
        }
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
        
        // Animáció indítása
        btnTextSpan.innerText = "Regisztráció folyamatban"; 
        btnTextSpan.classList.add('loading-dots');

        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REGISTER_USER', name, email, password })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');

            if (result.recoveryCode) {
                registerCard.classList.remove('active');
                document.getElementById('newRecoveryCodeDisplay').textContent = result.recoveryCode;
                document.getElementById('recoveryCodeModal').classList.add('active');
            } else {
                showSuccess('Sikeres regisztráció!');
                registerCard.classList.remove('active');
                setTimeout(() => loginCard.classList.add('active'), 300);
            }

        } catch (error) {
            console.error("Regisztrációs hiba:", error);
            showError(error.message || 'A regisztráció sikertelen.');
        } finally {
            setLoading(submitBtn, false);
            // Animáció leállítása és szöveg visszaállítása
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
        }
    }

    async function handleGuestLogin(e) {
        if (!navigator.onLine) {
    showError("Nincs internetkapcsolat! Kérlek csatlakozz a hálózatra a mentéshez.");
    return;
}
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('.auth-btn');
        
        // --- ÚJ RÉSZ: Szöveg mentése és módosítása ---
        const btnTextSpan = submitBtn.querySelector('.btn-text');
        const originalText = btnTextSpan.innerText; // "Bejelentkezés" elmentése
        
        btnTextSpan.innerText = "Bejelentkezés folyamatban"; // Szöveg átírása
        btnTextSpan.classList.add('loading-dots'); // Animáció bekapcsolása
        // ----------------------------------------------

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'LOGIN_USER', email, password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');
            
            // Ha a szerver azt mondja, hogy 2FA kell:
            if (result.require2fa) {
                tempLoginEmail = result.tempEmail; 
                login2FAModal.classList.add('active'); 
                
                setTimeout(() => {
                    const input = document.getElementById('login2FACode');
                    if(input) input.focus();
                }, 100);
                
                // Itt NEM állítjuk vissza a gombot, mert a folyamat még tart (a 2FA ablakban)
                setLoading(submitBtn, false);
                
                // De a szöveget visszaírhatjuk, hogy a háttérben szép legyen
                btnTextSpan.innerText = originalText;
                btnTextSpan.classList.remove('loading-dots');
                
                return; 
            }

            // Normál belépés
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            syncSettingsToCloud();

            if (result.user.settings) {
            applyCloudSettings(result.user.settings, result.user.email);
            }

            showSuccess(`Sikeres bejelentkezés, ${result.user.name}!`);
            setTimeout(() => {
                switchToUserView();

                const userEmail = result.user.email;
                const storageKey = `seen_newyear_2026_${userEmail}`;

                if (!localStorage.getItem(storageKey)) {
                    setTimeout(() => {
                        localStorage.setItem(storageKey, 'true');
                    }, 300);
                }

            }, 1000);
            
        } catch (error) {
            console.error("Bejelentkezési hiba:", error);
            showError(error.message || 'Hibás e-mail cím vagy jelszó!');
        } finally {
            // Csak akkor kapcsoljuk ki a töltést és állítjuk vissza a szöveget, 
            // ha nem nyílt meg a 2FA ablak
            if (!login2FAModal.classList.contains('active')) {
                 setLoading(submitBtn, false);
                 
                 // --- ÚJ RÉSZ: Szöveg visszaállítása ---
                 btnTextSpan.innerText = originalText;
                 btnTextSpan.classList.remove('loading-dots');
                 // --------------------------------------
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
        const btnTextSpan = submitBtn.querySelector('.btn-text');
        const originalText = btnTextSpan ? btnTextSpan.innerText : "Mentés";
        
        if(btnTextSpan) {
            btnTextSpan.innerText = "Mentés folyamatban";
            btnTextSpan.classList.add('loading-dots');
        }

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
            if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
            }
        }
    }


    // === GOOGLE AUTH KONFIGURÁCIÓ ===
    // Ide írd be a Google Cloud Console-ból kapott ID-t (ugyanaz, ami a Vercelben van)
    const GOOGLE_CLIENT_ID = "264393562577-n5788hjp5siglcs5ctl0onh35h5uv7jg.apps.googleusercontent.com";

    function initGoogleAuth() {
        if (typeof google === 'undefined') return;

        google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse
        });

        // Login gomb renderelése
        const loginContainer = document.getElementById('googleLoginBtn');
        if (loginContainer) {
            google.accounts.id.renderButton(
                loginContainer,
                { theme: "filled_black", size: "large", width: "250", text: "signin_with" }
            );
        }
    }

    // A válasz kezelése (ez fut le, ha a felhasználó kiválasztotta a Google fiókját)
    async function handleGoogleResponse(response) {
        // Megnézzük, hogy a felhasználó be van-e jelentkezve az oldaladra
        const isUserLoggedIn = document.getElementById('userView').style.display !== 'none';

        if (isUserLoggedIn) {
            // Ha bent van -> Összekötés
            await linkGoogleAccount(response.credential);
        } else {
            // Ha kint van -> Belépés/Regisztráció
            await loginWithGoogle(response.credential);
        }
    }

    async function loginWithGoogle(token) {
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GOOGLE_LOGIN', token: token })
            });
            const result = await response.json();
            
            if (!response.ok) throw new Error(result.error || "Sikertelen Google belépés");

            // Sikeres belépés mentése
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            syncSettingsToCloud();

            if (result.user.settings) {
            applyCloudSettings(result.user.settings, result.user.email);
            }

            showSuccess(`Sikeres belépés Google-lel! Szia ${result.user.name}!`);
            
            // Login ablak eltüntetése, User nézet megjelenítése
            // (Itt a meglévő függvényedet hívjuk)
            switchToUserView(); 

        } catch (error) {
            showError(error.message);
        }
    }

    async function linkGoogleAccount(token) {
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({ action: 'LINK_GOOGLE_ACCOUNT', token: token })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Hiba az összekötéskor");

            showSuccess(result.message);
            
            // --- EZT A RÉSZT FRISSÍTSD: ---
            // Lokális adat frissítése
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.isGoogleLinked = true;
            localStorage.setItem('userData', JSON.stringify(userData));
            syncSettingsToCloud();
            
            // UI újrarajzolása
            updateSettingsUI();

        } catch (error) {
            showError(error.message);
        }
    }

    // Google gomb betöltése az oldal betöltésekor
    window.onload = function() {
        initGoogleAuth();
    };

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
            
            if(targetPaneId === 'user-ideas-content') loadUserIdeas();
            if(targetPaneId === 'admin-ideas-content') loadAllIdeasForAdmin();
            
            // 2. Hibajegyek betöltése
            if(targetPaneId === 'admin-tickets-content') loadAdminTickets();
            
            // 3. JELENTÉSEK (MODERÁCIÓ) BETÖLTÉSE - EZ HIÁNYZOTT!
            if(targetPaneId === 'admin-moderation-content') loadModerationTasks();
            
            // 4. Sörök listájának frissítése (hogy mindig friss legyen)
            if(targetPaneId === 'admin-beers-content') loadAdminData();
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
        
        // Alapértelmezett háttér
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        
        // --- JAVÍTÁS: Téma visszatöltése ---
        // Ez biztosítja, hogy ha van mentett téma, az felülírja a fenti lilát
        if (typeof loadThemeFromStorage === 'function') {
            loadThemeFromStorage();
        }
        
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

        if (typeof updateMyStatistics === 'function') {
        updateMyStatistics();
    }


    } catch (error) {
        console.error("Hiba a felhasználói adatok betöltésekor:", error);
        showError(error.message || "Nem sikerült betölteni a söreidet.");
    }
}

    // Illeszd be ezt a js.js fájlba, mondjuk a updateUserStats függvény környékére

function updateStreakDisplay() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const streakEl = document.getElementById('headerStreakCount');
    const container = document.querySelector('.streak-container');
    const icon = document.querySelector('.fire-anim');

    if (userData && userData.streak && streakEl) {
        const streak = userData.streak.current;
        streakEl.textContent = streak;

        // Ha van streak, animáljon, ha nincs (0), legyen szürke
        if (streak > 0) {
            if(container) container.classList.remove('streak-inactive');
        } else {
            if(container) container.classList.add('streak-inactive');
        }
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
        <div class="suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}" data-text="${escapeHtml(suggestion.text)}">
            <span class="suggestion-icon">${suggestion.icon}</span>
            <span class="suggestion-text">${highlightSearchTerm(suggestion.text, searchTerm)}</span>
            <span class="suggestion-type">${escapeHtml(getSuggestionTypeLabel(suggestion.type))}</span>
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

    function highlightSearchTerm(text, searchTerm) {
    // 1. Ha nincs szöveg, üreset adunk vissza
    if (!text) return "";
    
    // Ha nincs keresett szó, csak simán biztonságossá tesszük az egészet
    if (!searchTerm) return escapeHtml(text);

    try {
        // 2. Regex escape: A keresett szó speciális karaktereit hatástalanítjuk
        const safeSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Létrehozzuk a regexet. A zárójelek () miatt a split megtartja a keresett szót is a tömbben!
        const regex = new RegExp(`(${safeSearchTerm})`, 'gi');

        // 3. Feldaraboljuk az EREDETI szöveget. 
        // Pl. "Alma és Körte", keresés: "és" -> ["Alma ", "és", " Körte"]
        const parts = text.split(regex);

        // 4. Összefűzzük az eredményt
        return parts.map(part => {
            // Megnézzük, hogy ez a darab a keresett szó-e (kis/nagybetű függetlenül)
            if (part.toLowerCase() === searchTerm.toLowerCase()) {
                // Ha ez a találat: biztonságossá tesszük + kiemeljük
                return `<mark>${escapeHtml(part)}</mark>`;
            } else {
                // Ha ez nem találat: csak biztonságossá tesszük
                return escapeHtml(part);
            }
        }).join('');

    } catch (e) {
        console.error("Hiba a kiemelésnél:", e);
        return escapeHtml(text);
    }
}
    
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
                    <td>${escapeHtml(beer.beerName)}</td>
                    <td>${escapeHtml(beer.location)}</td>
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
        if (typeof loadThemeFromStorage === 'function') {
            loadThemeFromStorage();
        }

        // Fő fülek inicializálása az admin nézeten
        initializeMainTabs(adminView);

        loadAdminData();
        initializeLiveSearch();
        setupStatistics(); // Statisztika fül inicializálása
        setupAdminRecap();
    }

    // --- Eseménykezelők ---
    adminForm.addEventListener('submit', handleAdminLogin);
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


    // === TITKOS ADMIN BELÉPÉS (5 KATTINTÁS A SÖRRE) ===
    let secretClickCount = 0;
    let secretClickTimer;

    const secretTrigger = document.getElementById('secretAdminTrigger');
    
    if (secretTrigger) {
        secretTrigger.addEventListener('click', (e) => {
            // Buborék effekt, hogy látszódjon a kattintás (opcionális, de jól néz ki)
            createBeerBubbles(e.clientX, e.clientY);

            secretClickCount++;
            
            // Töröljük az előző időzítőt, hogy ne nullázódjon le, ha gyorsan kattintasz
            clearTimeout(secretClickTimer);

            if (secretClickCount >= 5) {
                // Ha megvan az 5 kattintás:
                adminModal.classList.add('active'); 
                document.body.style.overflow = 'hidden';
                
                // Reseteljük a számlálót
                secretClickCount = 0;
            } else {
                // Ha 1 másodpercig nem kattint újra, nullázódik a számláló
                secretClickTimer = setTimeout(() => {
                    secretClickCount = 0;
                }, 1000);
            }
        });
    }

    //adminBtn.addEventListener('click', () => { adminModal.classList.add('active'); document.body.style.overflow = 'hidden'; });
    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() { adminModal.classList.remove('active'); document.body.style.overflow = 'auto'; }
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

// ======================================================
// === ÚJ: BŐVÍTETT RECAP STATISZTIKA (10 SLIDE LOGIKA) ===
// ======================================================

function calculateRecapStats(beers) {
    if (!beers || beers.length === 0) return null;
    
    // 1. Adattisztítás
    const validItems = beers.map(b => ({
        ...b,
        totalScore: parseFloat(b.totalScore) || 0,
        avg: parseFloat(b.avg.toString().replace(',', '.')) || 0,
        abv: parseFloat(b.beerPercentage || b.drinkPercentage) || 0,
        look: parseFloat(b.look) || 0,
        smell: parseFloat(b.smell) || 0,
        taste: parseFloat(b.taste) || 0,
        dateObj: parseBeerDate(b.date)
    }));

    const count = validItems.length;
    const totalScoreSum = validItems.reduce((acc, b) => acc + b.totalScore, 0);
    const avgScore = (totalScoreSum / count).toFixed(2);

    // 2. Legjobb és Legrosszabb
    const sortedByScore = [...validItems].sort((a, b) => b.totalScore - a.totalScore);
    const bestItem = sortedByScore[0];
    const worstItem = sortedByScore[sortedByScore.length - 1]; // Utolsó elem

    // 3. Kategória / Típus elemzés
    const typeCounts = validItems.reduce((acc, item) => {
        const t = item.type || item.category || 'Egyéb';
        acc[t] = (acc[t] || 0) + 1;
        return acc;
    }, {});
    const favType = Object.keys(typeCounts).sort((a,b) => typeCounts[b] - typeCounts[a])[0];

    // 4. Helyszín
    const locCounts = validItems.reduce((acc, item) => {
        const l = item.location || 'Ismeretlen';
        acc[l] = (acc[l] || 0) + 1;
        return acc;
    }, {});
    const favPlace = Object.keys(locCounts).sort((a,b) => locCounts[b] - locCounts[a])[0];

    // 5. Időbeli elemzések (Hétvége vs Hétköznap + Napszak)
    let weekendCount = 0;
    let weekdayCount = 0;
    let hourSum = 0;
    let hourCount = 0;

    validItems.forEach(item => {
        if (item.dateObj) {
            const day = item.dateObj.getDay(); // 0 = Vasárnap, 6 = Szombat
            const hour = item.dateObj.getHours();
            
            if (day === 0 || day === 6 || day === 5) { // Péntek, Szombat, Vasárnap = Hétvége mód
                weekendCount++;
            } else {
                weekdayCount++;
            }
            
            hourSum += hour;
            hourCount++;
        }
    });
    
    const avgHour = hourCount > 0 ? Math.floor(hourSum / hourCount) : 18;
    
    // Napszak szövegesen
    let timeOfDay = "Délutáni lazító 🌇";
    if (avgHour < 12) timeOfDay = "Reggeli korhely 🍳";
    else if (avgHour >= 22 || avgHour < 4) timeOfDay = "Éjszakai bagoly 🦉";
    else if (avgHour >= 18) timeOfDay = "Esti ínyenc 🌙";

    // 6. Legerősebb tétel
    const strongest = [...validItems].sort((a, b) => b.abv - a.abv)[0];

    // 7. Érzékszervek átlaga
    const sumLook = validItems.reduce((a,b) => a + b.look, 0);
    const sumSmell = validItems.reduce((a,b) => a + b.smell, 0);
    const sumTaste = validItems.reduce((a,b) => a + b.taste, 0);

    return {
        count,
        avg: avgScore,
        estLiters: (count * 0.5).toFixed(1), // Becslés: 0.5L / sör
        best: { name: bestItem.beerName || bestItem.drinkName, score: bestItem.totalScore },
        worst: { name: worstItem.beerName || worstItem.drinkName, score: worstItem.totalScore },
        favType,
        favPlace,
        timing: {
            weekend: weekendCount,
            weekday: weekdayCount,
            avgHour,
            label: timeOfDay
        },
        strongest: { name: strongest.beerName || strongest.drinkName, abv: strongest.abv },
        senses: {
            look: (sumLook / count).toFixed(1),
            smell: (sumSmell / count).toFixed(1),
            taste: (sumTaste / count).toFixed(1)
        }
    };
}

// === ÚJ RENDERER: 10 SLIDE ===
function renderStoryMode(data, container) {
    // slide-anim-pop osztályokat használunk az animációkhoz
    
    // Számítjuk a százalékokat a VS slide-hoz
    const totalDays = data.timing.weekend + data.timing.weekday;
    const weekendPct = totalDays > 0 ? (data.timing.weekend / totalDays) * 100 : 50;
    const weekdayPct = totalDays > 0 ? (data.timing.weekday / totalDays) * 100 : 50;

    // Számítjuk a szélességeket a Senses slide-hoz (0-10 skála -> %)
    const lookPct = data.senses.look * 10;
    const smellPct = data.senses.smell * 10;
    const tastePct = data.senses.taste * 10;

    const html = `
<div class="recap-story-container" id="storyContainer">
    <button class="story-fullscreen-btn" onclick="toggleFullscreen()">⛶</button>

    <div class="story-progress-container">
        ${Array(10).fill(0).map((_, i) => `<div class="story-progress-bar" id="bar-${i}"><div class="story-progress-fill"></div></div>`).join('')}
    </div>

    <div class="story-nav-left" onclick="prevSlide()"></div>
    <div class="story-nav-right" onclick="nextSlide()"></div>

    <div class="story-slide active bg-gradient-1" id="slide-0">
        <div class="slide-anim-pop">
            <h3 class="story-title">Itt a ${escapeHtml(data.periodName)}!</h3>
            <p class="story-text">Nézzük meg, mit műveltél...</p>
            <div style="font-size: 5rem; margin: 30px;">🎬</div>
        </div>
    </div>

    <div class="story-slide bg-gradient-2" id="slide-1">
        <div class="slide-anim-up">
            <h3 class="story-title">Nem voltál szomjas!</h3>
            <div class="story-big-number">${data.count}</div>
            <p class="story-text">tételt kóstoltál meg.</p>
            <br>
            <p class="story-highlight" style="font-size: 1rem; color: #aaa;">Ez kb. <b>${data.estLiters} liter</b> folyadék! 🌊</p>
        </div>
    </div>

    <div class="story-slide bg-gradient-3" id="slide-2">
        <div class="slide-anim-pop">
            <h3 class="story-title">A "Fejbevágó" 🥊</h3>
            <p class="story-text">A legerősebb tétel amit ittál:</p>
            <div style="font-size: 4rem; font-weight: 800; color: #e74c3c; margin: 20px 0;">
                ${data.strongest.abv}%
            </div>
            <p class="story-highlight">${escapeHtml(data.strongest.name)}</p>
        </div>
    </div>

    <div class="story-slide bg-gradient-4" id="slide-3">
        <div class="slide-anim-up">
            <h3 class="story-title">A Törzshelyed 📍</h3>
            <p class="story-text">Legtöbbször itt jártál:</p>
            <div class="fame-card" style="margin-top: 30px; transform: scale(1.2);">
                <div class="fame-user"><span class="fame-avatar">🏠</span></div>
                <div class="fame-name" style="font-size: 1.5rem;">${escapeHtml(data.favPlace)}</div>
            </div>
        </div>
    </div>

    <div class="story-slide bg-gradient-1" id="slide-4">
        <h3 class="story-title">Mikor ittál?</h3>
        <div class="story-vs-container">
            <div class="story-vs-side">
                <div class="vs-value">${data.timing.weekday}</div>
                <div class="vs-bar" style="height: ${weekdayPct}%; background: #3498db;"></div>
                <div class="vs-label">Hétköznap</div>
            </div>
            <div class="story-vs-side">
                <div class="vs-value">${data.timing.weekend}</div>
                <div class="vs-bar" style="height: ${weekendPct}%; background: #e74c3c;"></div>
                <div class="vs-label">Hétvége</div>
            </div>
        </div>
        <p class="story-text slide-anim-up" style="margin-top: 20px;">
            ${data.timing.weekend > data.timing.weekday ? "Igazi hétvégi harcos vagy! 🎉" : "A munkanapok sem akadályoztak! 👔"}
        </p>
    </div>

    <div class="story-slide bg-gradient-2" id="slide-5">
        <div class="slide-anim-pop">
            <h3 class="story-title">Az órád szerint...</h3>
            <div class="time-display">
                ${data.timing.avgHour}:00
            </div>
            <p class="story-text">Ez az átlagos kóstolási időd.</p>
            <div class="story-highlight" style="font-size: 1.5rem; margin-top: 20px;">
                ${data.timing.label}
            </div>
        </div>
    </div>

    <div class="story-slide bg-gradient-4" id="slide-6">
        <h3 class="story-title">Ízvilág Elemzés 🧬</h3>
        <div class="sense-bar-container slide-anim-up">
            <div class="sense-row">
                <span class="sense-icon">👀</span>
                <div class="sense-track"><div class="sense-fill" style="width: ${lookPct}%"></div></div>
                <span class="sense-val">${data.senses.look}</span>
            </div>
            <div class="sense-row">
                <span class="sense-icon">👃</span>
                <div class="sense-track"><div class="sense-fill" style="width: ${smellPct}%"></div></div>
                <span class="sense-val">${data.senses.smell}</span>
            </div>
            <div class="sense-row">
                <span class="sense-icon">👅</span>
                <div class="sense-track"><div class="sense-fill" style="width: ${tastePct}%"></div></div>
                <span class="sense-val">${data.senses.taste}</span>
            </div>
        </div>
        <p class="story-text" style="font-size: 0.9rem; color: #aaa;">(Átlagos pontszámok 0-10)</p>
    </div>

    <div class="story-slide bg-gradient-3" id="slide-7">
        <div class="slide-anim-pop">
            <h3 class="story-title">Ezt nem szeretted... 🤢</h3>
            <div class="shame-card">
                <div class="shame-title">${escapeHtml(data.worst.name)}</div>
                <div class="shame-score">${data.worst.score}</div>
                <div style="color: #555; font-style: italic;">Pontszám</div>
            </div>
            <p class="story-text">Reméljük, azóta ittál jobbat!</p>
        </div>
    </div>

    <div class="story-slide bg-gradient-1" id="slide-8">
        <div class="slide-anim-pop">
            <h3 class="story-title" style="color: #ffd700;">👑 A Király 👑</h3>
            <p class="story-text">Ez vitte a prímet:</p>
            <div style="font-size: 5rem; margin: 10px 0;">🍺</div>
            <span class="story-highlight" style="font-size: 2rem; line-height: 1.2;">
                ${escapeHtml(data.best.name)}
            </span>
            <div class="recap-stat-value" style="color: #ffd700; margin-top: 15px;">
                ${data.best.score} ⭐
            </div>
        </div>
    </div>

    <div class="story-slide active bg-gradient-2" id="slide-9" style="z-index: 30;"> 
        <h3 class="story-title">Összegzés</h3>
        
        <div class="story-summary-grid" id="captureTarget" style="padding: 15px; border: 1px solid rgba(255,255,255,0.2); border-radius: 15px;">
            <div class="summary-item">
                <span class="summary-label">Mennyiség</span>
                <span class="summary-value">${data.count} db</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Átlag</span>
                <span class="summary-value" style="color: #ffd700;">${data.avg}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Top Hely</span>
                <span class="summary-value" style="font-size: 0.9rem;">${escapeHtml(data.favPlace)}</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Top Típus</span>
                <span class="summary-value" style="font-size: 0.9rem;">${escapeHtml(data.favType)}</span>
            </div>
            <div class="summary-item" style="grid-column: 1/-1; background: rgba(255,215,0,0.1); border: 1px solid #ffd700;">
                <span class="summary-label" style="color: #ffd700;">🏆 A Kedvenc</span>
                <span class="summary-value">${escapeHtml(data.best.name)}</span>
            </div>
        </div>
        
        <div class="story-actions">
            <button class="story-btn btn-restart" onclick="startStory(0)">Újra ⟳</button>
            <button class="story-btn btn-download" onclick="downloadRecap()">Kép Mentése 📥</button>
        </div>
    </div>
</div>
`;
    
    container.innerHTML = html;
    
    // Globális változók a léptetéshez
    window.currentSlide = 0;
    window.totalSlides = 10; // Most már 10 slide van!
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
    
// === DINAMIKUS FEJLÉC SCROLL KEZELÉS (JAVÍTOTT) ===

window.addEventListener('scroll', function() {
    const headers = document.querySelectorAll('.admin-header'); 
    if (headers.length === 0) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.min(scrollTop / 300, 1);
    
    headers.forEach(header => {
        header.style.setProperty('--fill-percent', scrollPercent);
        
        if (scrollPercent >= 1) {
            header.classList.add('filled');
        } else {
            header.classList.remove('filled');
        }
    });
    
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
            syncSettingsToCloud();
            toggleCustomCursor(isActive);
            syncSettingsToCloud();
            
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
            // Kikapcsolás - ÚJ MODAL MEGNYITÁSA
            e.target.checked = true; // Egyelőre ne kapcsoljuk ki vizuálisan
            openDisable2FAModal();
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
            syncSettingsToCloud();
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
            syncSettingsToCloud();
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
        syncSettingsToCloud();
        
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
    
    // --- 1. 2FA Kapcsoló ---
    const toggle2FA = document.getElementById('user2FAToggle');
    if (userData && toggle2FA) {
        toggle2FA.checked = (userData.has2FA === true);
    }

    // --- 2. Google Fiók Állapot (ÚJ RÉSZ) ---
    const googleBtnContainer = document.getElementById('googleLinkBtn');
    if (userData && googleBtnContainer) {
        if (userData.isGoogleLinked) {
            // Ha össze van kötve, akkor státusz + leválasztás gomb
            googleBtnContainer.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(46, 204, 113, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(46, 204, 113, 0.3);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size: 1.5rem;">✅</span>
                        <span style="color: #2ecc71; font-weight: 600; font-size: 0.9rem;">Összekötve</span>
                    </div>
                    <button onclick="unlinkGoogleAccount()" style="background: rgba(231, 76, 60, 0.2); border: 1px solid rgba(231, 76, 60, 0.4); color: #e74c3c; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 0.8rem; transition: all 0.3s;">
                        Leválasztás ❌
                    </button>
                </div>
            `;
        } else {
            // Ha nincs összekötve, töröljük a tartalmát, és újrarendereljük a Google gombot
            googleBtnContainer.innerHTML = '';
            if (typeof google !== 'undefined') {
                google.accounts.id.renderButton(
                    googleBtnContainer,
                    { theme: "filled_black", size: "medium", text: "continue_with", width: "250" }
                );
            }
        }
    }

    // --- 3. Kurzor beállítása ---
    let emailKey = null;
    const userViewElem = document.getElementById('userView');
    const adminViewElem = document.getElementById('adminView');

    if (userData && userViewElem && userViewElem.style.display !== 'none') {
        emailKey = userData.email;
    } else if (adminViewElem && adminViewElem.style.display !== 'none') {
        emailKey = 'admin_user';
    }

    if (emailKey) {
        const storageKey = `cursor_pref_${emailKey}`;
        const savedPref = localStorage.getItem(storageKey);
        const isCursorActive = savedPref === null ? true : (savedPref === 'true');
        
        if (isCursorActive) {
            document.body.classList.add('custom-cursor-active');
        } else {
            document.body.classList.remove('custom-cursor-active');
        }

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
    if (typeof loadThemeFromStorage === 'function') {
        loadThemeFromStorage();
    }
    
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

    setTimeout(() => {
        if (document.getElementById('user-stats-content')) {
            updateMyStatistics();
        }
    }, 1500);

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

    // === ADATVÉDELMI FRISSÍTÉS KEZELÉSE ===

// 1. Ellenőrzés: Látta-e már a user?
function checkPolicyUpdate() {
    // Egyedi kulcs, pl. dátummal, hogy ha később megint frissítesz, csak átírod a dátumot
    const POLICY_VERSION = 'policy_accepted_2025_google_login';
    
    // Ha még NINCS elmentve a böngészőben, hogy elfogadta
    if (!localStorage.getItem(POLICY_VERSION)) {
        const modal = document.getElementById('policyUpdateModal');
        if (modal) {
            modal.classList.add('active');
            // Letiltjuk a görgetést, hogy ne tudja megkerülni
            document.body.style.overflow = 'hidden'; 
        }
    }
}

// 2. Elfogadás gomb funkciója
window.acceptPolicyUpdate = function() {
    const POLICY_VERSION = 'policy_accepted_2025_google_login';
    
    // Elmentjük a böngészőbe, hogy elfogadta
    localStorage.setItem(POLICY_VERSION, 'true');
    syncSettingsToCloud();
    
    // Bezárjuk az ablakot
    const modal = document.getElementById('policyUpdateModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }
    
    showSuccess("Köszönjük! Tesztelést! 🍺");
}
    
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
    initViewModeSelector();
    initListLimitSelector();
    
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
    const btnTextSpan = btn.querySelector('.btn-text');
    const originalText = btnTextSpan ? btnTextSpan.innerText : "Beküldés";
    
    if(btnTextSpan) {
        btnTextSpan.innerText = "Küldés folyamatban";
        btnTextSpan.classList.add('loading-dots');
    }
    
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
        if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
        }
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
        syncSettingsToCloud();
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
        let progressHtml = '';

        if (isUnlocked) {
            const data = userData.achievements.unlocked.find(u => u.id === achi.id);
            if (data && data.date) {
                // ✅ JAVÍTVA
                dateStr = `<div style="font-size:0.6rem; margin-top:5px; color:#ffd700;">Megszerezve: ${escapeHtml(data.date)}</div>`;
            }
        } else {
            if (achi.getProgress) {
                const allBeers = currentUserBeers || [];
                const allDrinks = currentUserDrinks || [];
                const p = achi.getProgress(allBeers, allDrinks);
                
                let percent = 0;
                if (p.inverse) {
                    percent = 0;
                } else {
                    percent = (p.current / p.target) * 100;
                }
                percent = Math.min(100, Math.max(0, percent));
                
                // ✅ JAVÍTVA - escapeHtml a unit-ra is
                const unit = escapeHtml(p.suffix || '');

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

        // ✅ JAVÍTVA - minden mező escape-elve
        const html = `
        <div class="${cardClass}" title="${escapeHtml(achi.title)}">
            <span class="achi-icon" style="${iconStyle}">${achi.icon}</span>
            <div class="achi-title">${escapeHtml(achi.title)}</div>
            <div class="achi-desc">${escapeHtml(achi.desc)}</div>
            ${dateStr}
            ${progressHtml}
            <div style="position: absolute; top: 5px; right: 5px; font-size: 0.8rem;">${statusIcon}</div>
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
        syncSettingsToCloud();
        
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
        const oldBadge = welcomeMsg.querySelector('.user-badge-display');
        if (oldBadge) oldBadge.remove();

        if (userData.badge) {
            const badgeSpan = document.createElement('span');
            badgeSpan.className = 'user-badge-display';
            // ✅ ÚJ: textContent használata innerHTML helyett
            badgeSpan.textContent = userData.badge; // Biztonságos!
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

    // 3. Adatok és BEÁLLÍTÁSOK szinkronizálása a felhőből
    // Ezt mindenképp lefuttatjuk induláskor!
    setTimeout(() => {
        refreshUserData(); // <--- EZT HÍVJUK MEG, ez húzza le a settingset
    }, 500);

    // 4. Várakozunk kicsit, hogy az API válaszok (sörök + italok) megérkezzenek
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
        updateSettingsUI();
        updateStreakDisplay();
        
    }, 1500); // 1.5 mp késleltetés, hogy biztosan meglegyen minden adat a szerverről
};
    setTimeout(() => {
        const linkContainer = document.getElementById('googleLinkBtn');
        if (linkContainer && typeof google !== 'undefined') {
            google.accounts.id.renderButton(
               linkContainer,
                { theme: "filled_black", size: "medium", text: "continue_with" }
            );
       }
     }, 1000);

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
        const btnTextSpan = btn.querySelector('.btn-text');
        const originalText = btnTextSpan ? btnTextSpan.innerText : "Küldés";
        
        if(btnTextSpan) {
            btnTextSpan.innerText = "Mentés folyamatban";
            btnTextSpan.classList.add('loading-dots');
        }

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
            if(btnTextSpan) {
                btnTextSpan.innerText = originalText;
                btnTextSpan.classList.remove('loading-dots');
            }
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
            syncSettingsToCloud();
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
        const btnTextSpan = btn.querySelector('.btn-text');
        const originalText = btnTextSpan.innerText;
        
        btnTextSpan.innerText = "Küldés folyamatban";
        btnTextSpan.classList.add('loading-dots');

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
            if(btnTextSpan) {
            btnTextSpan.innerText = originalText;
            btnTextSpan.classList.remove('loading-dots');
            }
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
            ? `<span class="user-badge-display tiny">${escapeHtml(item.badge)}</span>` : '';

        // --- GOMBOK LOGIKA ---
        
        // 1. Jelentés gomb (Csak ha NEM a sajátom)
        // Átadjuk: Típus, Tartalom neve, Beküldő emailje
        const reportBtn = !item.isMine 
        ? `<button class="report-btn" onclick="openReportModal('Ajánlás', ${item.originalIndex}, '${escapeHtml(item.itemName)}')" title="Jelentés">🚩</button>` 
        : '';

        // 2. Szerkesztés és Törlés gombok (Csak ha a SAJÁTOM)
        const ownerBtns = item.isMine 
            ? `
                <button class="edit-rec-btn" onclick="openRecModal(${item.originalIndex})" title="Szerkesztés">✏️</button>
                <button class="delete-rec-btn" onclick="deleteUserRecommendation(${item.originalIndex})" title="Törlés">🗑️</button>
              ` 
            : '';
            
        // Gombok összefűzése
        const actionBtns = reportBtn + ownerBtns;

        const editedHtml = item.isEdited 
            ? `<span class="rec-edited-tag">(módosítva)</span>` 
            : '';

        const voteActiveClass = item.hasVoted ? 'active' : '';

        const html = `
        <div class="rec-card ${typeClass}">
            <div class="rec-action-btns">
                ${actionBtns}
            </div>
            
            <div style="display: flex; gap: 15px;">
                <div class="vote-container">
                    <button class="vote-btn ${voteActiveClass}" onclick="handleVote('recommendation', ${item.originalIndex}, this)">
                        ▲
                    </button>
                    <span class="vote-count">${item.voteCount}</span>
                </div>

                <div class="rec-main-content" style="flex: 1;">
                    <div class="rec-header">
                        <div>
                            <div class="rec-item-name">${escapeHtml(item.itemName)}</div>
                            <div class="rec-sub-info">${escapeHtml(item.category)}</div>
                        </div>
                        <div class="rec-type-badge">${typeIcon} ${item.type}</div>
                    </div>
                    
                    <div class="rec-desc">
                        "${escapeHtml(item.description)}"
                    </div>
                </div>
            </div>
            
            <div class="rec-footer">
                <div class="${userClass}">
                    <span>${item.isAnon ? '🕵️' : '👤'}</span>
                    <span>${escapeHtml(item.submitter)}</span>
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

    const modal = document.getElementById('viewBeerModal');
    
    // Biztonságos szöveg beállítás
    setSafeText('viewBeerName', beer.beerName);
    setSafeText('viewBeerType', beer.type || 'N/A');
    setSafeText('viewBeerLocation', beer.location || '-');
    setSafeText('viewBeerPercentage', beer.beerPercentage ? `${beer.beerPercentage}%` : '-');
    
    const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : '-';
    setSafeText('viewBeerDate', formattedDate);
    
    setSafeText('viewBeerLook', beer.look || 0);
    setSafeText('viewBeerSmell', beer.smell || 0);
    setSafeText('viewBeerTaste', beer.taste || 0);
    setSafeText('viewBeerTotal', beer.totalScore || 0);
    
    const avgValue = parseFloat(beer.avg.toString().replace(',', '.')) || 0;
    setSafeText('viewBeerAvg', avgValue.toFixed(2));
    
    // Jegyzetek - sortörések megengedése
    const notesSection = document.getElementById('viewBeerNotesSection');
    const notesBox = document.getElementById('viewBeerNotes');
    
    if (beer.notes && beer.notes.trim() !== '') {
        setSafeText('viewBeerNotes', beer.notes, true); // ✅ allowLineBreaks = true
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
    
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

    const modal = document.getElementById('viewDrinkModal');
    
    setSafeText('viewDrinkName', drink.drinkName);
    setSafeText('viewDrinkCategory', drink.category || 'N/A');
    setSafeText('viewDrinkType', drink.type || 'N/A');
    setSafeText('viewDrinkLocation', drink.location || '-');
    setSafeText('viewDrinkPercentage', drink.drinkPercentage ? `${drink.drinkPercentage}%` : '-');
    
    const formattedDate = drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : '-';
    setSafeText('viewDrinkDate', formattedDate);
    
    setSafeText('viewDrinkLook', drink.look || 0);
    setSafeText('viewDrinkSmell', drink.smell || 0);
    setSafeText('viewDrinkTaste', drink.taste || 0);
    setSafeText('viewDrinkTotal', drink.totalScore || 0);
    
    const avgValue = parseFloat(drink.avg.toString().replace(',', '.')) || 0;
    setSafeText('viewDrinkAvg', avgValue.toFixed(2));
    
    const notesSection = document.getElementById('viewDrinkNotesSection');
    const notesBox = document.getElementById('viewDrinkNotes');
    
    if (drink.notes && drink.notes.trim() !== '') {
        setSafeText('viewDrinkNotes', drink.notes, true);
        notesSection.style.display = 'block';
    } else {
        notesSection.style.display = 'none';
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeViewDrinkModal = function() {
    const modal = document.getElementById('viewDrinkModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function renderUserBeers(beers) {
    userBeerTableBody.innerHTML = '';
    if (!beers || beers.length === 0) {
        userBeerTableBody.innerHTML = `<tr><td colspan="10" class="no-results">Még nem értékeltél egy sört sem (vagy nincs találat).</td></tr>`;
        return;
    }

    // --- LIMIT ALKALMAZÁSA ---
    const limitSetting = localStorage.getItem('preferredListLimit') || '50';
    let beersToRender = beers;

    if (limitSetting !== 'all') {
        const limit = parseInt(limitSetting);
        beersToRender = beers.slice(0, limit);
    }
    // -------------------------
    
    beersToRender.forEach((beer) => {
        const safeIndex = (beer.originalIndex !== undefined) ? beer.originalIndex : currentUserBeers.indexOf(beer);
        const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : 'N/A';
        const formattedAvg = beer.avg ? parseFloat(beer.avg.toString().replace(',', '.')).toFixed(2) : '0.00';
        
        const row = `
            <tr>
                <td data-label="Dátum">${formattedDate}</td>
                <td data-label="Sör neve" class="mobile-card-title">${escapeHtml(beer.beerName)}</td>
                <td data-label="Főzési hely">${escapeHtml(beer.location)}</td>
                <td data-label="Alkohol %">${beer.beerPercentage || 0}%</td>
                <td data-label="Külalak">${beer.look || 0}</td>
                <td data-label="Illat">${beer.smell || 0}</td>
                <td data-label="Íz">${beer.taste || 0}</td>
                <td data-label="Összpontszám">${beer.totalScore || 0}</td>
                <td data-label="Átlag" class="average-cell">${formattedAvg}</td>
                <td data-label="Művelet" class="action-buttons-cell">
                    <button class="view-btn" onclick="openViewBeerModal(${safeIndex})" title="Teljes adat">👁️</button>
                    <button class="edit-btn" onclick="openEditBeerModal(${safeIndex})">✏️</button>
                    <button class="delete-btn-mini" onclick="deleteUserBeer(${safeIndex})">🗑️</button>
                </td>
            </tr>
        `;
        userBeerTableBody.insertAdjacentHTML('beforeend', row);
    });

    // Jelzés, ha több adat van, mint a limit
    if (limitSetting !== 'all' && beers.length > parseInt(limitSetting)) {
        const remaining = beers.length - parseInt(limitSetting);
        const infoRow = `<tr><td colspan="10" style="text-align:center; color:#aaa; padding:15px; font-style:italic;">...és még ${remaining} db sör. (Növeld a limitet a beállításokban az összes megtekintéséhez)</td></tr>`;
        userBeerTableBody.insertAdjacentHTML('beforeend', infoRow);
    }
}

function renderUserDrinks(drinks) {
    userDrinkTableBody.innerHTML = '';
    if (!drinks || drinks.length === 0) {
        userDrinkTableBody.innerHTML = `<tr><td colspan="12" class="no-results">Még nem értékeltél egy italt sem.</td></tr>`;
        return;
    }
    
    // --- LIMIT ALKALMAZÁSA ---
    const limitSetting = localStorage.getItem('preferredListLimit') || '50';
    let drinksToRender = drinks;

    if (limitSetting !== 'all') {
        const limit = parseInt(limitSetting);
        drinksToRender = drinks.slice(0, limit);
    }
    // -------------------------

    drinksToRender.forEach((drink) => {
        const safeIndex = (drink.originalIndex !== undefined) ? drink.originalIndex : currentUserDrinks.indexOf(drink);
        const formattedDate = drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : 'N/A';
        const scoreSum = (parseFloat(drink.look) || 0) + (parseFloat(drink.smell) || 0) + (parseFloat(drink.taste) || 0);
        const calculatedAvg = scoreSum / 3;
        const formattedAvg = calculatedAvg.toFixed(2);
        
        const row = `
            <tr>
                <td data-label="Dátum">${formattedDate}</td>
                <td data-label="Ital neve" class="mobile-card-title">${escapeHtml(drink.drinkName)}</td>
                <td data-label="Kategória">${escapeHtml(drink.category)}</td>
                <td data-label="Típus">${escapeHtml(drink.type)}</td>
                <td data-label="Hely">${escapeHtml(drink.location)}</td>
                <td data-label="Alkohol %">${drink.drinkPercentage || '-'}${drink.drinkPercentage ? '%' : ''}</td>
                <td data-label="Külalak">${drink.look || 0}</td>
                <td data-label="Illat">${drink.smell || 0}</td>
                <td data-label="Íz">${drink.taste || 0}</td>
                <td data-label="Összpontszám">${drink.totalScore || 0}</td>
                <td data-label="Átlag" class="average-cell">${formattedAvg}</td>
                <td data-label="Művelet" class="action-buttons-cell">
                    <button class="view-btn" onclick="openViewDrinkModal(${safeIndex})" title="Teljes adat">👁️</button>
                    <button class="edit-btn" onclick="openEditDrinkModal(${safeIndex})">✏️</button>
                    <button class="delete-btn-mini" onclick="deleteUserDrink(${safeIndex})">🗑️</button>
                </td>
            </tr>
        `;
        userDrinkTableBody.insertAdjacentHTML('beforeend', row);
    });

    // Jelzés, ha több adat van, mint a limit
    if (limitSetting !== 'all' && drinks.length > parseInt(limitSetting)) {
        const remaining = drinks.length - parseInt(limitSetting);
        const infoRow = `<tr><td colspan="12" style="text-align:center; color:#aaa; padding:15px; font-style:italic;">...és még ${remaining} db ital. (Növeld a limitet a beállításokban)</td></tr>`;
        userDrinkTableBody.insertAdjacentHTML('beforeend', infoRow);
    }
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
    setTimeout(initAllUserSearches, 500);
    
    // Rendezés inicializálása kis késleltetéssel
    setTimeout(() => {
        initTableSorting();
        initUserSearch();
    }, 500);
};
    window.acceptCookies = function() {
    localStorage.setItem('cookieConsentSeen', 'true');
    syncSettingsToCloud();
    const toast = document.getElementById('cookieToast');
    if (toast) {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 500); // Ha van transition, várjuk meg
    }
}
    // === FELHASZNÁLÓI ÉLŐKERESÉS FUNKCIÓK ===

function initUserSearch() {
    // 1. SÖRÖK KERESÉSE
    const beerInput = document.getElementById('userBeerSearchInput');
    
    if (beerInput) {
        beerInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            
            // Ha üres a kereső, mindent mutatunk
            if (!term) {
                renderUserBeers(currentUserBeers);
                return;
            }

            // Szűrés (Név, Típus, Hely, Jegyzet alapján)
            const filtered = currentUserBeers.filter(beer => 
                (beer.beerName && beer.beerName.toLowerCase().includes(term)) ||
                (beer.type && beer.type.toLowerCase().includes(term)) ||
                (beer.location && beer.location.toLowerCase().includes(term)) ||
                (beer.notes && beer.notes.toLowerCase().includes(term))
            );

            renderUserBeers(filtered);
        });
    }

    // 2. ITALOK KERESÉSE
    const drinkInput = document.getElementById('userDrinkSearchInput');
    
    if (drinkInput) {
        drinkInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            
            if (!term) {
                renderUserDrinks(currentUserDrinks);
                return;
            }

            const filtered = currentUserDrinks.filter(drink => 
                (drink.drinkName && drink.drinkName.toLowerCase().includes(term)) ||
                (drink.category && drink.category.toLowerCase().includes(term)) ||
                (drink.location && drink.location.toLowerCase().includes(term)) ||
                (drink.notes && drink.notes.toLowerCase().includes(term))
            );

            renderUserDrinks(filtered);
        });
    }
}
    // ======================================================
// === ÚJ: FELHASZNÁLÓI ÉLŐ KERESÉS (GENERIC) ===
// ======================================================

function setupUserLiveSearch(config) {
    const input = document.getElementById(config.inputId);
    const clearBtn = document.getElementById(config.clearId);
    const suggestionsBox = document.getElementById(config.suggestionsId);
    const infoBox = document.getElementById(config.infoId);
    
    // Ha valamelyik elem nem létezik (pl. admin nézetben), kilépünk
    if (!input || !clearBtn || !suggestionsBox || !infoBox) return;

    let selectedIndex = -1;

    // 1. INPUT ESEMÉNY (Gépelés)
    input.addEventListener('input', () => {
        const searchTerm = input.value.trim().toLowerCase();
        
        // Törlés gomb kezelése
        clearBtn.style.display = searchTerm ? 'flex' : 'none';

        // Adatok lekérése (dinamikusan, hogy mindig a frisset lássa)
        const allData = config.getData(); 
        
        if (!searchTerm) {
            suggestionsBox.style.display = 'none';
            infoBox.textContent = `${allData.length} tétel összesen`;
            infoBox.style.color = '';
            // Resetelés az eredeti listára
            config.renderFunction(allData);
            return;
        }

        // Szűrés
        const filtered = allData.filter(item => {
            const name = (item[config.nameField] || '').toLowerCase();
            const type = (item[config.typeField] || '').toLowerCase();
            const loc = (item.location || '').toLowerCase();
            const notes = (item.notes || '').toLowerCase();
            
            return name.includes(searchTerm) || 
                   type.includes(searchTerm) || 
                   loc.includes(searchTerm) || 
                   notes.includes(searchTerm);
        });

        // Eredmény info
        if (filtered.length === 0) {
            infoBox.textContent = `Nincs találat: "${searchTerm}"`;
            infoBox.style.color = '#e74c3c';
        } else {
            infoBox.textContent = `${filtered.length} találat ${allData.length} tételből`;
            infoBox.style.color = '#3498db';
        }

        // Javaslatok generálása (max 5)
        const suggestions = filtered.slice(0, 5).map(item => ({
            text: item[config.nameField],
            type: item[config.typeField]
        }));
        
        renderUserSuggestions(suggestions, suggestionsBox, searchTerm, input, () => {
             // Ha rákattint egy javaslatra, újra lefuttatjuk a keresést pontosan arra
             input.dispatchEvent(new Event('input'));
        });

        // Táblázat frissítése
        config.renderFunction(filtered);
    });

    // 2. TÖRLÉS GOMB
    clearBtn.addEventListener('click', () => {
        input.value = '';
        input.focus();
        input.dispatchEvent(new Event('input')); // Triggereljük a resetet
    });

    // 3. FÓKUSZ KEZELÉS (Javaslatok elrejtése/megjelenítése)
    input.addEventListener('focus', () => {
        if (input.value.trim()) suggestionsBox.style.display = 'block';
    });
    
    // Késleltetett blur, hogy a kattintás érzékelhető legyen
    input.addEventListener('blur', () => {
        setTimeout(() => suggestionsBox.style.display = 'none', 200);
    });
}

// Segédfüggvény: Javaslatok kirajzolása (User verzió)
function renderUserSuggestions(list, container, searchTerm, inputElem, onSelect) {
    if (list.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = list.map((item, index) => `
        <div class="suggestion-item" data-val="${escapeHtml(item.text)}">
            <span class="suggestion-icon">🔍</span>
            <span class="suggestion-text">${highlightSearchTerm(item.text, searchTerm)}</span>
            <span class="suggestion-type">${escapeHtml(item.type)}</span>
        </div>
    `).join('');

    container.style.display = 'block';

    // Kattintás figyelés
    container.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Ne vegye el a fókuszt azonnal
            inputElem.value = el.dataset.val;
            container.style.display = 'none';
            onSelect();
        });
    });
}

// Inicializáló függvény (Ezt hívjuk meg a User nézet betöltésekor)
function initAllUserSearches() {
    // SÖR KERESŐ KONFIGURÁCIÓ
    setupUserLiveSearch({
        inputId: 'userBeerSearchInput',
        clearId: 'userBeerClearSearch',
        suggestionsId: 'userBeerSuggestions',
        infoId: 'userBeerResultsInfo',
        getData: () => currentUserBeers, // A globális sör tömb
        renderFunction: renderUserBeers, // A globális render függvény
        nameField: 'beerName',
        typeField: 'type'
    });

    // ITAL KERESŐ KONFIGURÁCIÓ
    setupUserLiveSearch({
        inputId: 'userDrinkSearchInput',
        clearId: 'userDrinkClearSearch',
        suggestionsId: 'userDrinkSuggestions',
        infoId: 'userDrinkResultsInfo',
        getData: () => currentUserDrinks, // A globális ital tömb
        renderFunction: renderUserDrinks, // A globális render függvény
        nameField: 'drinkName',
        typeField: 'category' // Itt a kategória a fő típus
    });
}
    // === SIDEBAR MAGASSÁG JAVÍTÁS (Windows tálca problémára) ===
function fixSidebarHeight() {
    const sidebar = document.querySelector('.dashboard-sidebar');
    if (!sidebar) return;
    
    // --- JAVÍTÁS: Mobilon (768px alatt) NE állítson fix magasságot ---
    if (window.innerWidth <= 768) {
        sidebar.style.height = '';      // Töröljük a fix magasságot
        sidebar.style.maxHeight = '';   // Töröljük a maximumot
        return;                         // Kilépünk, hogy a CSS érvényesüljön
    }
    // ---------------------------------------------------------------

    // Asztali nézetben marad a teljes magasság (Windows tálca fix)
    const realHeight = window.innerHeight;
    sidebar.style.height = `${realHeight}px`;
    sidebar.style.maxHeight = `${realHeight}px`;
}

// Futtatás betöltéskor és átméretezéskor
window.addEventListener('load', fixSidebarHeight);
window.addEventListener('resize', fixSidebarHeight);

// Futtatás akkor is, ha a user view-ra váltunk
const originalSwitchToUserViewFix = switchToUserView;
if (typeof switchToUserView === 'function') {
    switchToUserView = function() {
        originalSwitchToUserViewFix();
        setTimeout(fixSidebarHeight, 100);
    };
}
    // === NYEREMÉNYJÁTÉK LOGIKA ===

window.openPrizeModal = function() {
        const modal = document.getElementById('prizeModal');
        if (modal) {
            modal.classList.add('active');
        } else {
            console.error("Nem található a 'prizeModal' elem!");
        }
    }

    // 2. Modal bezárása - GLOBÁLISAN elérhetővé téve
    window.closePrizeModal = function() {
        const modal = document.getElementById('prizeModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // 3. Nyeremény igénylése beküldés - GLOBÁLISAN elérhetővé téve
    window.submitPrizeClaim = async function() {
        // Megkeressük a kiválasztott rádiógombot
        const selectedOption = document.querySelector('input[name="prizeSelect"]:checked');
        
        if (!selectedOption) {
            showError("Kérlek válassz egy nyereményt! 🍺🥤⚡");
            return;
        }

        const prize = selectedOption.value;
        
        // Megkeressük a gombot a modalon belül a töltés animációhoz
        const btn = document.querySelector('#prizeModal .auth-btn'); 

        // Loading állapot bekapcsolása
        const originalText = btn ? btn.innerText : "KÉREM A NYEREMÉNYT!";
        if(btn) {
            btn.innerText = "Ellenőrzés...";
            btn.disabled = true;
        }

        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({ 
                    action: 'CLAIM_REWARD', 
                    selectedPrize: prize 
                })
            });
            
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Hiba történt.");
            }

            // Siker esetén
            showSuccess(result.message);
            window.closePrizeModal();
            
            // Eltüntetjük a lebegő ajándék gombot, mert már nyert
            const floatBtn = document.getElementById('prizeFloatingBtn');
            if(floatBtn) floatBtn.style.display = 'none';

        } catch (error) {
            showError(error.message);
        } finally {
            // Loading állapot visszaállítása
            if(btn) {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        }
    }

    // Gomb láthatóságának kezelése nézetváltáskor
    // (Ez biztosítja, hogy a gomb csak akkor látszódjon, ha be vagy lépve)
    const originalSwitchToUserViewPrize = typeof switchToUserView === 'function' ? switchToUserView : function(){};
    
    switchToUserView = function() {
        originalSwitchToUserViewPrize(); // Lefuttatjuk az eredeti nézetváltót
        
        // Jelezzük a CSS-nek, hogy user nézetben vagyunk, így megjelenik a gomb
        document.body.classList.add('user-view-active');
        setTimeout(checkPolicyUpdate, 1000);
    };

    // Kilépéskor eltüntetjük a gombot
    const originalSwitchToGuestViewPrize = typeof switchToGuestView === 'function' ? switchToGuestView : function(){};
    
    switchToGuestView = function() {
        originalSwitchToGuestViewPrize(); // Lefuttatjuk az eredeti kilépőt
        document.body.classList.remove('user-view-active');
    };
    // ======================================================
// === SZEMÉLYES STATISZTIKA MODUL (JAVÍTOTT) ===
// ======================================================

    // Globális változó a chartok tárolására
    let myStatsCharts = {};
    
    // 1. Al-fül váltó logika
    window.switchStatsSubTab = function(tabName) {
        // Gombok aktív állapota
        document.querySelectorAll('.stats-sub-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.textContent.toLowerCase().includes(tabName === 'overview' ? 'áttekintés' : 
               tabName === 'trends' ? 'idővonal' : 
               tabName === 'radar' ? 'ízvilág' : 'fun')) {
                btn.classList.add('active');
            }
        });
    
        // Panelek váltása
        document.querySelectorAll('.stats-sub-pane').forEach(pane => pane.classList.remove('active'));
        document.getElementById(`stats-sub-${tabName}`).classList.add('active');
    };
    
    // 2. Fő logika: Adatok feldolgozása és kirajzolása
    function updateMyStatistics() {
        const scope = document.getElementById('statsScopeFilter')?.value || 'all';
        
        // Adatok összefűzése a szűrő alapján
        let dataset = [];
        if (scope === 'all') {
            dataset = [...(currentUserBeers || []), ...(currentUserDrinks || [])];
        } else if (scope === 'beer') {
            dataset = [...(currentUserBeers || [])];
        } else if (scope === 'drink') {
            dataset = [...(currentUserDrinks || [])];
        }
    
        if (dataset.length === 0) {
            // Ha nincs adat, nullázzuk a kijelzőket
            document.getElementById('statTotalCount').textContent = "0";
            document.getElementById('statTotalAvg').textContent = "0.00";
            document.getElementById('statAvgAbv').textContent = "0.0%";
            return;
        }
    
        // --- KPI Számítások ---
        
        // 1. Összes db
        document.getElementById('statTotalCount').textContent = dataset.length;
    
        // 2. Átlag pontszám
        const totalScoreSum = dataset.reduce((sum, item) => sum + (parseFloat(item.avg.toString().replace(',','.')) || 0), 0);
        const avgScore = (totalScoreSum / dataset.length).toFixed(2);
        document.getElementById('statTotalAvg').textContent = avgScore;
    
        // 3. Átlag Alkohol (szám formátumban is eltároljuk!)
        const abvList = dataset.map(d => parseFloat(d.beerPercentage || d.drinkPercentage) || 0).filter(p => p > 0);
        const avgAbvNum = abvList.length ? (abvList.reduce((a,b)=>a+b,0) / abvList.length) : 0;
        document.getElementById('statAvgAbv').textContent = avgAbvNum.toFixed(1) + "%";
    
        // 4. Legerősebb / Leggyengébb
        const sortedByAbv = [...dataset].sort((a,b) => (parseFloat(b.beerPercentage||b.drinkPercentage)||0) - (parseFloat(a.beerPercentage||a.drinkPercentage)||0));
        const strongest = sortedByAbv[0];
        
        if(strongest) {
            document.getElementById('statStrongest').textContent = strongest.beerName || strongest.drinkName;
            document.getElementById('statStrongestVal').textContent = (strongest.beerPercentage || strongest.drinkPercentage) + "%";
        }
    
        // 5. Kedvenc Hely
        const locations = {};
        dataset.forEach(d => { if(d.location) locations[d.location] = (locations[d.location]||0)+1; });
        const topLoc = Object.keys(locations).sort((a,b) => locations[b] - locations[a])[0];
        document.getElementById('statTopLocation').textContent = topLoc || "-";
        document.getElementById('statTopLocationCount').textContent = topLoc ? `${locations[topLoc]} db` : "";
    
        // 6. Legjobb pontszám
        const sortedByScore = [...dataset].sort((a,b) => (parseFloat(b.avg.toString().replace(',','.'))||0) - (parseFloat(a.avg.toString().replace(',','.'))||0));
        if(sortedByScore[0]) {
            document.getElementById('statHighScoreName').textContent = sortedByScore[0].beerName || sortedByScore[0].drinkName;
            document.getElementById('statHighScoreVal').textContent = sortedByScore[0].avg;
        }
    
        // 7. Legjobb Külalak/Íz (Radar fülhöz)
        const bestLook = [...dataset].sort((a,b) => (b.look||0) - (a.look||0))[0];
        const bestTaste = [...dataset].sort((a,b) => (b.taste||0) - (a.taste||0))[0];
        if(bestLook) document.getElementById('statBestLook').textContent = `${bestLook.beerName || bestLook.drinkName} (${bestLook.look})`;
        if(bestTaste) document.getElementById('statBestTaste').textContent = `${bestTaste.beerName || bestTaste.drinkName} (${bestTaste.taste})`;
    
        // --- GRAFIKONOK RAJZOLÁSA ---
        renderMyStatsCharts(dataset, avgAbvNum);
    }
    
    function renderMyStatsCharts(data, avgAbvNum) {
        // Előző chartok törlése
        ['statCategoryChart', 'statActivityChart', 'statDayChart', 'statRadarChart'].forEach(id => {
            if (myStatsCharts[id]) {
                myStatsCharts[id].destroy();
            }
        });
    
        // 1. KATEGÓRIA MEGOSZLÁS (Doughnut)
        const catCounts = {};
        data.forEach(item => {
            const label = item.category || item.type || "Egyéb";
            catCounts[label] = (catCounts[label] || 0) + 1;
        });
    
        // Rendezzük és csak a top 6 + Egyéb
        const sortedCats = Object.entries(catCounts).sort((a,b) => b[1] - a[1]);
        const topCats = sortedCats.slice(0, 6);
        const otherCount = sortedCats.slice(6).reduce((sum, item) => sum + item[1], 0);
        
        const catLabels = topCats.map(x => x[0]);
        const catValues = topCats.map(x => x[1]);
        if (otherCount > 0) { catLabels.push('Egyéb'); catValues.push(otherCount); }
    
        const ctxCat = document.getElementById('statCategoryChart')?.getContext('2d');
        if (ctxCat) {
            myStatsCharts['statCategoryChart'] = new Chart(ctxCat, {
                type: 'doughnut',
                data: {
                    labels: catLabels,
                    datasets: [{
                        data: catValues,
                        backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40', '#c9cbcf'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'right', labels: { color: '#ccc' } }
                    }
                }
            });
        }
    
        // 2. HAVI AKTIVITÁS (Line Chart)
        const months = {};
        data.forEach(item => {
            if(!item.date) return;
            const d = new Date(item.date.replace(' ', 'T'));
            if(isNaN(d.getTime())) return;
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}`;
            months[key] = (months[key] || 0) + 1;
        });
        
        const sortedMonths = Object.keys(months).sort();
        const ctxAct = document.getElementById('statActivityChart')?.getContext('2d');
        
        if (ctxAct) {
            const gradient = ctxAct.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.5)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0)');
    
            myStatsCharts['statActivityChart'] = new Chart(ctxAct, {
                type: 'line',
                data: {
                    labels: sortedMonths,
                    datasets: [{
                        label: 'Kóstolások száma',
                        data: sortedMonths.map(m => months[m]),
                        borderColor: '#667eea',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#ccc' } },
                        x: { grid: { display: false }, ticks: { color: '#ccc' } }
                    },
                    plugins: {
                        legend: { labels: { color: '#ccc' } }
                    }
                }
            });
        }
    
        // 3. MILYEN NAPOKON? (Bar Chart)
        const days = ['Vas', 'Hét', 'Kedd', 'Szer', 'Csüt', 'Pén', 'Szom'];
        const dayCounts = [0,0,0,0,0,0,0];
        data.forEach(item => {
            if(!item.date) return;
            const d = new Date(item.date.replace(' ', 'T'));
            if(!isNaN(d.getTime())) dayCounts[d.getDay()]++;
        });
    
        // Hétfőtől kezdjük a megjelenítést
        const displayDays = [...days.slice(1), days[0]];
        const displayCounts = [...dayCounts.slice(1), dayCounts[0]];
    
        const ctxDay = document.getElementById('statDayChart')?.getContext('2d');
        if (ctxDay) {
            myStatsCharts['statDayChart'] = new Chart(ctxDay, {
                type: 'bar',
                data: {
                    labels: displayDays,
                    datasets: [{
                        label: 'Napok eloszlása',
                        data: displayCounts,
                        backgroundColor: 'rgba(255, 215, 0, 0.6)',
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { display: false },
                        x: { grid: { display: false }, ticks: { color: '#ccc' } }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    
        // 4. RADAR (Ízvilág átlagok)
        let sumLook = 0, sumSmell = 0, sumTaste = 0;
        data.forEach(item => {
            sumLook += (parseFloat(item.look) || 0);
            sumSmell += (parseFloat(item.smell) || 0);
            sumTaste += (parseFloat(item.taste) || 0);
        });
        const count = data.length || 1;
    
        const totalAvgNum = parseFloat(document.getElementById('statTotalAvg')?.textContent) || 0;
    
        const ctxRadar = document.getElementById('statRadarChart')?.getContext('2d');
        if (ctxRadar) {
            myStatsCharts['statRadarChart'] = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['Külalak 👀', 'Illat 👃', 'Íz 👅', 'Alkohol 😵', 'Összhatás ⭐'],
                    datasets: [{
                        label: 'Átlagos Értékeléseid',
                        data: [
                            parseFloat((sumLook/count).toFixed(2)), 
                            parseFloat((sumSmell/count).toFixed(2)), 
                            parseFloat((sumTaste/count).toFixed(2)), 
                            (avgAbvNum > 10 ? 10 : parseFloat(avgAbvNum.toFixed(2))),
                            totalAvgNum
                        ],
                        backgroundColor: 'rgba(217, 70, 239, 0.2)',
                        borderColor: '#d946ef',
                        pointBackgroundColor: '#fff',
                        pointRadius: 5,
                        pointHoverRadius: 7
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: { color: '#fff', font: { size: 14 } },
                            ticks: { 
                                color: '#ccc',
                                backdropColor: 'transparent'
                            },
                            min: 0,
                            max: 10
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#fff' }
                        }
                    }
                }
            });
        }
    }
    
    // 3. Figyeljük a változásokat (Szűrő váltás)
    document.getElementById('statsScopeFilter')?.addEventListener('change', updateMyStatistics);
    
        // 4. Tab váltás figyelése
        document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (btn.dataset.tabContent === 'user-stats-content') {
                setTimeout(() => {
                    updateMyStatistics();
                }, 100);
            }
        });
    });
    // === NÉZET VÁLASZTÓ LOGIKA (TABLE VS CARDS) ===

function initViewModeSelector() {
    const selector = document.getElementById('viewModeSelector');
    if (!selector) return;

    // 1. Mentett beállítás betöltése
    const userData = JSON.parse(localStorage.getItem('userData'));
    let savedMode = 'auto';
    
    // Először megnézzük a localStorage-ban (ha csak eszközszintű beállítás)
    if (localStorage.getItem('preferredViewMode')) {
        savedMode = localStorage.getItem('preferredViewMode');
    }
    // Opcionális: Ha mentenéd a felhőbe is a userData-ba, akkor onnan is kiolvashatod
    
    // UI beállítása
    selector.value = savedMode;
    applyViewMode(savedMode);

    // 2. Változás figyelése
    selector.addEventListener('change', (e) => {
        const newMode = e.target.value;
        localStorage.setItem('preferredViewMode', newMode);
        syncSettingsToCloud();
        applyViewMode(newMode);
        showSuccess(`Nézet átállítva: ${e.target.options[e.target.selectedIndex].text}`);
    });
}

    // === LISTA LIMIT LOGIKA ===

function initListLimitSelector() {
    const selector = document.getElementById('listLimitSelector');
    if (!selector) return;

    // 1. Mentett beállítás betöltése (alapértelmezett: 50)
    const savedLimit = localStorage.getItem('preferredListLimit') || '50';
    selector.value = savedLimit;

    // 2. Változás figyelése
    selector.addEventListener('change', (e) => {
        const newLimit = e.target.value;
        localStorage.setItem('preferredListLimit', newLimit);
        syncSettingsToCloud();
        
        // Listák azonnali újrarajzolása az új limittel
        // (A globális tömbökből dolgozunk: currentUserBeers, currentUserDrinks)
        if (typeof renderUserBeers === 'function') renderUserBeers(currentUserBeers);
        if (typeof renderUserDrinks === 'function') renderUserDrinks(currentUserDrinks);
        
        showSuccess(`Limit frissítve: ${e.target.options[e.target.selectedIndex].text}`);
    });
}

function applyViewMode(mode) {
    // Töröljük az összes force osztályt
    document.body.classList.remove('force-card-view', 'force-table-view');

    if (mode === 'cards') {
        // Mindig kártya
        document.body.classList.add('force-card-view');
    } else if (mode === 'table') {
        // Mindig táblázat (mobilon is)
        document.body.classList.add('force-table-view');
    }
}
    // ======================================================
// === IMPORT / EXPORT FUNKCIÓK ===
// ======================================================

// 1. ADATOK EXPORTÁLÁSA (LETÖLTÉS) - JAVÍTOTT VERZIÓ
function exportUserData(format = 'json') {
    // Ellenőrizzük, hogy vannak-e betöltve adatok
    if ((!currentUserBeers || currentUserBeers.length === 0) && (!currentUserDrinks || currentUserDrinks.length === 0)) {
        showError("Nincs mit exportálni! Először tölts fel adatokat.");
        return;
    }

    const dateStr = new Date().toISOString().slice(0,10);
    const userName = JSON.parse(localStorage.getItem('userData'))?.name || "Ismeretlen";

    if (format === 'json') {
        // === JSON EXPORT (EREDETI LOGIKA) ===
        const exportData = {
            version: "1.0",
            timestamp: new Date().toISOString(),
            user: userName,
            beers: currentUserBeers,
            drinks: currentUserDrinks
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `sor_tabla_backup_${dateStr}.json`);
        
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        showSuccess("JSON biztonsági mentés letöltve! 📥");
        
    } else if (format === 'xlsx') {
        // === EXCEL EXPORT (ÚJ FUNKCIÓ) ===
        
        // Munkafüzet létrehozása
        const wb = XLSX.utils.book_new();
        
        // 1. SÖRÖK SHEET
        if (currentUserBeers && currentUserBeers.length > 0) {
            const beerHeaders = ["Dátum", "Sör neve", "Főzési hely", "Típus", "Külalak", "Illat", "Íz", "Alkohol %", "Összpontszám", "Átlag", "Jegyzet"];
            
            const beerRows = currentUserBeers.map(beer => [
                beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : '',
                beer.beerName || '',
                beer.location || '',
                beer.type || '',
                beer.look || 0,
                beer.smell || 0,
                beer.taste || 0,
                beer.beerPercentage || 0,
                beer.totalScore || 0,
                beer.avg || 0,
                beer.notes || ''
            ]);
            
            const beerData = [beerHeaders, ...beerRows];
            const wsBeer = XLSX.utils.aoa_to_sheet(beerData);
            XLSX.utils.book_append_sheet(wb, wsBeer, "Sörök");
        }
        
        // 2. ITALOK SHEET
        if (currentUserDrinks && currentUserDrinks.length > 0) {
            const drinkHeaders = ["Dátum", "Ital neve", "Kategória", "Típus", "Hely", "Külalak", "Illat", "Íz", "Alkohol %", "Összpontszám", "Átlag", "Jegyzet"];
            
            const drinkRows = currentUserDrinks.map(drink => [
                drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : '',
                drink.drinkName || '',
                drink.category || '',
                drink.type || '',
                drink.location || '',
                drink.look || 0,
                drink.smell || 0,
                drink.taste || 0,
                drink.drinkPercentage || 0,
                drink.totalScore || 0,
                drink.avg || 0,
                drink.notes || ''
            ]);
            
            const drinkData = [drinkHeaders, ...drinkRows];
            const wsDrink = XLSX.utils.aoa_to_sheet(drinkData);
            XLSX.utils.book_append_sheet(wb, wsDrink, "Italok");
        }
        
        // Letöltés indítása
        XLSX.writeFile(wb, `sor_tabla_backup_${dateStr}.xlsx`);
        showSuccess("Excel biztonsági mentés letöltve! 📊");
    }
}

    // === SEGÉDFÜGGVÉNY AZ IMPORTÁLÁSHOZ ===
// Ez fordítja le az Excel oszlopneveket a program változóira
function mapRowKeys(row, type) {
    // Segédfüggvény, ami megkeresi az értéket akkor is, ha kis/nagybetű eltérés van
    const getValue = (possibleKeys) => {
        // Végignézzük a lehetséges kulcsokat (pl. "Sör neve", "sör neve", "Beer Name")
        for (const key of possibleKeys) {
            // 1. Pontos egyezés keresése
            if (row[key] !== undefined) return row[key];
            
            // 2. Kisbetűs/Nagybetűs egyezés keresése
            const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === key.toLowerCase());
            if (foundKey && row[foundKey] !== undefined) return row[foundKey];
        }
        return ''; // Ha nincs találat, üres string
    };

    // Közös adatok (mindkét típusnál ugyanaz)
    const newItem = {
        location: getValue(['Hely', 'Főzési hely', 'Location', 'Hol']),
        type: getValue(['Típus', 'Type', 'Jelleg']),
        look: getValue(['Külalak', 'Look', 'Megjelenés']) || 0,
        smell: getValue(['Illat', 'Smell']) || 0,
        taste: getValue(['Íz', 'Taste']) || 0,
        notes: getValue(['Jegyzet', 'Notes', 'Megjegyzés']),
        date: getValue(['Dátum', 'Date', 'Időpont'])
    };

    // Típus-specifikus adatok
    if (type === 'beer') {
        newItem.beerName = getValue(['Sör neve', 'Beer Name', 'Név', 'Sör']);
        newItem.beerPercentage = getValue(['Alkohol %', 'Alkohol', 'ABV', 'Százalék']) || 0;
    } else if (type === 'drink') {
        newItem.drinkName = getValue(['Ital neve', 'Drink Name', 'Név', 'Ital']);
        newItem.category = getValue(['Kategória', 'Category', 'Fajta']);
        newItem.drinkPercentage = getValue(['Alkohol %', 'Alkohol', 'ABV', 'Százalék']) || 0;
    }

    return newItem;
}

function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    // 1. HA EXCEL FÁJL
    if (isExcel) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                let importedBeers = [];
                let importedDrinks = [];

                // Megnézzük a munkalapokat (Sheetek)
                // Ha van "Sörök" vagy "Beers" nevű sheet
                const beerSheetName = workbook.SheetNames.find(n => n.match(/sör|beer/i));
                if (beerSheetName) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[beerSheetName]);
                    importedBeers = rows.map(r => mapRowKeys(r, 'beer'));
                }

                // Ha van "Italok" vagy "Drinks" nevű sheet
                const drinkSheetName = workbook.SheetNames.find(n => n.match(/ital|drink/i));
                if (drinkSheetName) {
                    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[drinkSheetName]);
                    importedDrinks = rows.map(r => mapRowKeys(r, 'drink'));
                }

                // Ha nem találtunk specifikus sheeteket, vegyük az elsőt és próbáljuk kitalálni
                if (!beerSheetName && !drinkSheetName) {
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet);
                    
                    // Egyszerű logika: Ha van "Sör neve" oszlop -> Sör, ha "Ital neve" -> Ital
                    rows.forEach(row => {
                        const keys = Object.keys(row).map(k => k.toLowerCase());
                        if (keys.some(k => k.includes('sör'))) {
                            importedBeers.push(mapRowKeys(row, 'beer'));
                        } else if (keys.some(k => k.includes('ital'))) {
                            importedDrinks.push(mapRowKeys(row, 'drink'));
                        }
                    });
                }

                if (importedBeers.length === 0 && importedDrinks.length === 0) {
                    throw new Error("Nem találtam felismerhető adatot az Excelben. Használj 'Sör neve' vagy 'Ital neve' oszlopokat.");
                }

                if (confirm(`Találtam ${importedBeers.length} sört és ${importedDrinks.length} italt az Excelben.\nSzeretnéd importálni őket?`)) {
                    await sendImportDataToBackend(importedBeers, importedDrinks);
                }

            } catch (error) {
                console.error(error);
                showError("Hiba az Excel feldolgozásakor: " + error.message);
            } finally {
                input.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    } 
    // 2. HA JSON FÁJL (Marad a régi logika)
    else if (fileName.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const json = JSON.parse(e.target.result);
                if (!json.beers && !json.drinks) {
                    throw new Error("Hibás JSON formátum!");
                }
                const beerCount = json.beers ? json.beers.length : 0;
                const drinkCount = json.drinks ? json.drinks.length : 0;

                if (confirm(`Találtam ${beerCount} sört és ${drinkCount} italt a JSON-ben.\nSzeretnéd importálni őket?`)) {
                    await sendImportDataToBackend(json.beers || [], json.drinks || []);
                }
            } catch (error) {
                console.error(error);
                showError("Hiba a JSON beolvasásakor: " + error.message);
            } finally {
                input.value = '';
            }
        };
        reader.readAsText(file);
    } else {
        showError("Nem támogatott fájlformátum! Csak .json vagy .xlsx.");
        input.value = '';
    }
}

// 3. ADATOK KÜLDÉSE A SZERVERNEK
async function sendImportDataToBackend(beers, drinks) {
    // Gomb megkeresése a loading állapothoz (opcionális, de szép)
    const btn = document.querySelector('button[onclick*="importFileInput"]');
    if(btn) {
        btn.innerText = "Feltöltés...";
        btn.disabled = true;
    }

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'IMPORT_USER_DATA', 
                beers: beers,
                drinks: drinks
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Szerver hiba");
        }

        showSuccess(result.message);
        
        // Adatok újratöltése, hogy látszódjon az eredmény
        loadUserData(); // Sörök
        loadUserDrinks(); // Italok

    } catch (error) {
        showError(error.message || "Nem sikerült az importálás.");
    } finally {
        if(btn) {
            btn.innerHTML = '<span>📤</span> Visszatöltés (Import)';
            btn.disabled = false;
        }
    }
}
    window.exportUserData = exportUserData;
    window.handleImportFile = handleImportFile;

    // --- TUTORIAL MODAL KEZELÉS ---

function openTutorialModal() {
    const modal = document.getElementById('tutorialModal');
    if (modal) {
        modal.classList.add('active');
        // Letiltjuk a háttér görgetését
        document.body.style.overflow = 'hidden';
    }
}

function closeTutorialModal() {
    const modal = document.getElementById('tutorialModal');
    if (modal) {
        modal.classList.remove('active');
        // Visszakapcsoljuk a görgetést
        document.body.style.overflow = '';
    }
}

// Bezárás ESC gombra
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        closeTutorialModal();
    }
});

// Bezárás, ha a sötét háttérre kattintanak
document.getElementById('tutorialModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeTutorialModal();
    }
});

// --- SABLON LETÖLTÉSE (SheetJS) ---
function downloadExcelTemplate() {
    // 1. Sörök sablon adatok
    const beerHeader = ["Sör neve", "Típus", "Hely", "Külalak", "Illat", "Íz", "Alkohol %", "Dátum", "Jegyzet"];
    const beerSample = ["Minta Sör", "IPA", "Kocsma", 8, 7, 9, 6.5, "2024.01.01", "Ez csak egy példa sor, törölheted."];
    
    // 2. Italok sablon adatok
    const drinkHeader = ["Ital neve", "Kategória", "Típus", "Hely", "Külalak", "Illat", "Íz", "Alkohol %", "Dátum", "Jegyzet"];
    const drinkSample = ["Minta Whisky", "Whisky", "Rövid", "Otthon", 9, 8, 10, 40, "2024.01.01", "Példa adat."];

    // Munkafüzet létrehozása
    const wb = XLSX.utils.book_new();

    // Sör sheet létrehozása
    const wsBeers = XLSX.utils.aoa_to_sheet([beerHeader, beerSample]);
    XLSX.utils.book_append_sheet(wb, wsBeers, "Sörök");

    // Ital sheet létrehozása
    const wsDrinks = XLSX.utils.aoa_to_sheet([drinkHeader, drinkSample]);
    XLSX.utils.book_append_sheet(wb, wsDrinks, "Italok");

    // Letöltés indítása
    XLSX.writeFile(wb, "Sor_Tabla_Sablon.xlsx");
    
    // Opcionális: sikeres visszajelzés
    showSuccess("Sablon letöltve! Töltsd ki és importáld vissza.");
    closeTutorialModal();
}
    window.openTutorialModal = openTutorialModal;
    window.closeTutorialModal = closeTutorialModal;
    window.downloadExcelTemplate = downloadExcelTemplate;
    
    // === EXPORT MODAL KEZELÉS ===

// 1. Modal megnyitása
window.openExportModal = function() {
    // Ellenőrizzük, van-e egyáltalán adat, mielőtt megnyitjuk
    if ((!currentUserBeers || currentUserBeers.length === 0) && (!currentUserDrinks || currentUserDrinks.length === 0)) {
        showError("Nincs mit exportálni! Előbb tölts fel adatokat.");
        return;
    }
    
    document.getElementById('exportModal').classList.add('active');
    document.body.style.overflow = 'hidden'; // Görgetés tiltása
}

// 2. Modal bezárása
window.closeExportModal = function() {
    document.getElementById('exportModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 3. Választás megerősítése
window.confirmExport = function(format) {
    // Bezárjuk a modalt
    closeExportModal();
    
    // Kis késleltetéssel indítjuk a letöltést, hogy látszódjon a bezáródás
    setTimeout(() => {
        // Meghívjuk a korábban megírt export függvényt a választott formátummal
        if (typeof exportUserData === 'function') {
            exportUserData(format);
        } else {
            console.error("Hiba: Az exportUserData függvény nem létezik!");
        }
    }, 300);
}

// Bezárás kattintásra a háttérben (opcionális kényelmi funkció)
document.getElementById('exportModal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeExportModal();
    }
});
    // === 2FA KIKAPCSOLÁS MODAL KEZELÉSE ===

window.openDisable2FAModal = function() {
    const modal = document.getElementById('disable2FAModal');
    const input = document.getElementById('disable2FAConfirmInput');
    const btn = document.getElementById('finalDisable2FABtn');
    
    // Reset
    if(input) input.value = '';
    if(btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }
    
    if(modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Figyeljük az inputot
    if(input) {
        input.oninput = function() {
            if (this.value.toUpperCase() === 'KIKAPCSOL') {
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.style.cursor = 'pointer';
            } else {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.cursor = 'not-allowed';
            }
        }
    }
}

window.closeDisable2FAModal = function() {
    const modal = document.getElementById('disable2FAModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

window.confirmDisable2FA = async function() {
    const btn = document.getElementById('finalDisable2FABtn');
    const input = document.getElementById('disable2FAConfirmInput');
    const toggle = document.getElementById('user2FAToggle');
    
    // Biztonsági ellenőrzés
    if(input.value.toUpperCase() !== 'KIKAPCSOL') return;
    
    // Loading állapot
    const originalText = btn.innerText;
    btn.innerText = "Kikapcsolás...";
    btn.disabled = true;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'MANAGE_2FA', 
                subAction: 'DISABLE' 
            })
        });
        
        if (response.ok) {
            showSuccess("2FA sikeresen kikapcsolva! 🔓");
            closeDisable2FAModal();
            
            // Most már tényleg kikapcsoljuk
            if(toggle) toggle.checked = false;
            
            // Lokális adat frissítése
            const userData = JSON.parse(localStorage.getItem('userData'));
            if(userData) {
                userData.has2FA = false;
                localStorage.setItem('userData', JSON.stringify(userData));
                syncSettingsToCloud();
            }
        } else {
            const result = await response.json();
            throw new Error(result.error || "Hiba történt.");
        }
    } catch (error) {
        console.error("2FA kikapcsolási hiba:", error);
        showError(error.message || "Nem sikerült kikapcsolni a 2FA-t.");
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
    async function refreshUserData() {
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'REFRESH_USER_DATA' })
        });

        if(response.ok) {
            const data = await response.json();
            const userData = JSON.parse(localStorage.getItem('userData'));

            // Frissítjük a lokális adatokat
            userData.streak = data.streak;
            userData.achievements = data.achievements;
            userData.badge = data.badge;
            
            // --- ÚJ RÉSZ: Beállítások mentése és alkalmazása ---
            if (data.settings) {
                // Elmentjük a settings-et a userData-ba is, hogy konzisztens legyen
                userData.settings = data.settings;
                
                // És ami a legfontosabb: ALKALMAZZUK ŐKET!
                // Ez állítja be
                applyCloudSettings(data.settings, userData.email);
            }
            // --------------------------------------------------

            localStorage.setItem('userData', JSON.stringify(userData));
            
            // UI frissítés
            updateStreakDisplay();
            renderAchievements();
            
            // Ha változott a téma vagy beállítás, a felületet is frissítjük
            updateSettingsUI(); 
        }
    } catch (error) {
        console.error("Hiba az adatok frissítésekor:", error);
    }
}
    window.unlinkGoogleAccount = async function() {
    if (!confirm("Biztosan meg akarod szüntetni a kapcsolatot a Google fiókoddal?")) return;

    // Megkeressük a gombot vizuális visszajelzéshez
    const btn = document.querySelector('#googleLinkBtn button');
    if(btn) {
        btn.innerText = "Bontás...";
        btn.disabled = true;
    }

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ action: 'UNLINK_GOOGLE_ACCOUNT' })
        });

        const result = await response.json();

        if (!response.ok) throw new Error(result.error || "Hiba a leválasztáskor.");

        showSuccess(result.message);

        // Lokális adat frissítése
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.isGoogleLinked = false;
        localStorage.setItem('userData', JSON.stringify(userData));
        syncSettingsToCloud();

        // UI Frissítése
        updateSettingsUI();

    } catch (error) {
        showError(error.message);
        if(btn) {
            btn.innerText = "Leválasztás ❌";
            btn.disabled = false;
        }
    }
}

    // === BEÁLLÍTÁSOK SZINKRONIZÁLÁSA A FELHŐBE ===

async function syncSettingsToCloud() {
    // 1. Összegyűjtjük az aktuális beállításokat a localStorage-ból
    const userEmail = JSON.parse(localStorage.getItem('userData'))?.email;
    if (!userEmail) return; // Ha nincs bejelentkezve, nem mentünk felhőbe

    const settings = {
        cursorActive: localStorage.getItem(`cursor_pref_${userEmail}`) === 'true',
        theme: JSON.parse(localStorage.getItem('userTheme') || '{}'),
        viewMode: localStorage.getItem('preferredViewMode') || 'auto',
        listLimit: localStorage.getItem('preferredListLimit') || '50',
        headerCollapsed: localStorage.getItem('headerCollapsedPreference') === 'true'
    };

    // 2. Elküldjük a szervernek (háttérben)
    try {
        await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'SAVE_SETTINGS', 
                settings: settings 
            })
        });
        console.log("Beállítások szinkronizálva a felhőbe. ☁️");
    } catch (e) {
        console.warn("Nem sikerült menteni a beállításokat:", e);
    }
}

// === BEÁLLÍTÁSOK BETÖLTÉSE BELÉPÉSKOR ===
function applyCloudSettings(settings, userEmail) {
    if (!settings || Object.keys(settings).length === 0) return;

    console.log("Felhő beállítások alkalmazása...", settings);

    // 1. Kurzor
    if (settings.cursorActive !== undefined) {
        localStorage.setItem(`cursor_pref_${userEmail}`, settings.cursorActive);
        syncSettingsToCloud();
        // Azonnali frissítés
        if (settings.cursorActive) document.body.classList.add('custom-cursor-active');
        else document.body.classList.remove('custom-cursor-active');
    }

    // 2. Téma
    if (settings.theme && Object.keys(settings.theme).length > 0) {
        localStorage.setItem('userTheme', JSON.stringify(settings.theme));
        syncSettingsToCloud();
        if (typeof applyTheme === 'function') applyTheme(settings.theme);
    }

    // 3. Nézet mód
    if (settings.viewMode) {
        localStorage.setItem('preferredViewMode', settings.viewMode);
        syncSettingsToCloud();
        // Ha van applyViewMode függvényed
        if (typeof applyViewMode === 'function') applyViewMode(settings.viewMode);
    }

    // 4. Lista Limit
    if (settings.listLimit
) {
        localStorage.setItem('preferredListLimit', settings.listLimit);
        syncSettingsToCloud();
        const limitSelector = document.getElementById('listLimitSelector');
        if (limitSelector) limitSelector.value = settings.listLimit;
    }
    
    // 5. Header
    if (settings.headerCollapsed !== undefined) {
        localStorage.setItem('headerCollapsedPreference', settings.headerCollapsed);
        syncSettingsToCloud();
        const header = document.getElementById('userHeader');
        if(header) {
            if(settings.headerCollapsed) header.classList.add('manual-collapsed');
            else header.classList.remove('manual-collapsed');
        }
    }
}
    
   // === TÉMA TESTRESZABÁS FUNKCIÓK ===

// Előre beállított témák definíciója
const presetThemes = {
    'dark-purple': {
        name: 'Sötét Lila',
        bgColor1: '#1f005c',
        bgColor2: '#10002b',
        bgColor3: '#000000',
        textColor: '#e0e0e0',
        textSecondary: '#b0b0b0',
        accentColor: '#8a73ff'
    },
    'ocean': {
        name: 'Óceán',
        bgColor1: '#0f2027',
        bgColor2: '#203a43',
        bgColor3: '#2c5364',
        textColor: '#e8f4f8',
        textSecondary: '#b0c4de',
        accentColor: '#4fc3f7'
    },
    'sunset': {
        name: 'Naplemente',
        bgColor1: '#FF512F',
        bgColor2: '#DD2476',
        bgColor3: '#000000',
        textColor: '#fff0f0',
        textSecondary: '#ffb3b3',
        accentColor: '#ff6b9d'
    },
    'forest': {
        name: 'Erdő',
        bgColor1: '#134E5E',
        bgColor2: '#71B280',
        bgColor3: '#000000',
        textColor: '#e8f5e9',
        textSecondary: '#a5d6a7',
        accentColor: '#66bb6a'
    },
    'midnight': {
        name: 'Éjfél',
        bgColor1: '#232526',
        bgColor2: '#414345',
        bgColor3: '#000000',
        textColor: '#e0e0e0',
        textSecondary: '#9e9e9e',
        accentColor: '#78909c'
    },
    'aurora': {
 
       name: 'Aurora',
        bgColor1: '#00467F',
        bgColor2: '#A5CC82',
        bgColor3: '#000000',
        textColor: '#e8f5e9',
        textSecondary: '#b2dfdb',
        accentColor: '#4db6ac'
    },
    'fire': {
        name: 'Tűz',
        bgColor1: '#C33764',
        bgColor2: '#1D2671',
        bgColor3: '#000000',
        textColor: '#ffe0e0',
        textSecondary: '#ffb3b3',
        accentColor: '#f48fb1'
    },
    'cyber': {
        name: 'Cyber',
        bgColor1: '#0F2027',
        bgColor2: '#2C5364',
        bgColor3: '#000000',
        textColor: '#00ff9f',
        textSecondary: '#00d4aa',
        accentColor: '#00ffff'
    }
};

// Téma betöltése localStorage-ból
function loadThemeFromStorage() {
    const savedTheme = localStorage.getItem('userTheme');
    if (savedTheme) {
        try {
            const theme = JSON.parse(savedTheme);
            applyTheme(theme);
            
            // Ha előre beállított téma, jelöljük aktívnak
            if (theme.preset) {
                document.querySelectorAll('.theme-preset-btn').forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.theme === theme.preset) {
                        btn.classList.add('active');
                    }
                });
            }
        } catch (e) {
            console.error('Hiba a téma betöltésekor:', e);
        }
    }
}

// Téma alkalmazása
function applyTheme(theme) {
    document.documentElement.style.setProperty('--bg-color-1', theme.bgColor1);
    document.documentElement.style.setProperty('--bg-color-2', theme.bgColor2);
    document.documentElement.style.setProperty('--bg-color-3', theme.bgColor3);
    document.documentElement.style.setProperty('--text-primary', theme.textColor);
    document.documentElement.style.setProperty('--text-secondary', theme.textSecondary);
    document.documentElement.style.setProperty('--accent-color', theme.accentColor);
    
    document.body.classList.add('custom-theme');
    
    // Háttér frissítése
    document.body.style.background = `linear-gradient(135deg, ${theme.bgColor1} 0%, ${theme.bgColor2} 50%, ${theme.bgColor3} 100%)`;
    document.body.style.backgroundAttachment = 'fixed';
    
    // Input mezők frissítése
    updateColorInputs(theme);
    
    // Előnézet frissítése
    updateThemePreview(theme);
}

// Szín input mezők frissítése
function updateColorInputs(theme) {
    if (document.getElementById('bgColor1')) {
        document.getElementById('bgColor1').value = theme.bgColor1;
        document.getElementById('bgColor1Text').value = theme.bgColor1;
        document.getElementById('bgColor2').value = theme.bgColor2;
        document.getElementById('bgColor2Text').value = theme.bgColor2;
        document.getElementById('bgColor3').value = theme.bgColor3;
        document.getElementById('bgColor3Text').value = theme.bgColor3;
        document.getElementById('textColor').value = theme.textColor;
        document.getElementById('textColorText').value = theme.textColor;
        document.getElementById('textSecondary').value = theme.textSecondary;
        document.getElementById('textSecondaryText').value = theme.textSecondary;
        document.getElementById('accentColor').value = theme.accentColor;
        document.getElementById('accentColorText').value = theme.accentColor;
    }
}

// Előnézet frissítése
function updateThemePreview(theme) {
    const previewBg = document.getElementById('themePreviewBg');
    const previewText = document.getElementById('previewText');
    const previewSecondary = document.getElementById('previewSecondary');
    const previewAccent = document.getElementById('previewAccent');
    
    if (previewBg) {
        previewBg.style.background = `linear-gradient(135deg, ${theme.bgColor1} 0%, ${theme.bgColor2} 50%, ${theme.bgColor3} 100%)`;
        previewText.style.color = theme.textColor;
        previewSecondary.style.color = theme.textSecondary;
        previewAccent.style.color = theme.accentColor;
    }
}

// Event listener-ek inicializálása
function initThemeCustomization() {
    // 1. Előre beállított témák gombjai
    document.querySelectorAll('.theme-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.dataset.theme;
            const theme = { ...presetThemes[themeName], preset: themeName };
            
            // Aktív állapot beállítása a gombokon
            document.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Téma alkalmazása és mentése
            applyTheme(theme);
            localStorage.setItem('userTheme', JSON.stringify(theme));
            syncSettingsToCloud();
            
            showNotification('✨ Téma alkalmazva: ' + theme.name, 'success');
        });
    });
    
    // 2. Színválasztók szinkronizálása (Input és Text mezők)
    const colorInputPairs = [
        ['bgColor1', 'bgColor1Text'],
        ['bgColor2', 'bgColor2Text'],
        ['bgColor3', 'bgColor3Text'],
        ['textColor', 'textColorText'],
        ['textSecondary', 'textSecondaryText'],
        ['accentColor', 'accentColorText']
    ];
    
    colorInputPairs.forEach(([colorId, textId]) => {
        const colorInput = document.getElementById(colorId);
        const textInput = document.getElementById(textId);
        
        if (colorInput && textInput) {
            // Ha a színválasztót tekergeted
            colorInput.addEventListener('input', (e) => {
                textInput.value = e.target.value;
                updateLivePreview();
            });
            
            // Ha a szöveges mezőbe írsz
            textInput.addEventListener('input', (e) => {
                let value = e.target.value;
                // Hex szín validáció
                if (value.match(/^#[0-9A-Fa-f]{6}$/)) {
                    colorInput.value = value;
                    updateLivePreview();
                }
            });
        }
    });
    
    // 3. Egyéni téma alkalmazása gomb
    const applyBtn = document.getElementById('applyCustomTheme');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            const theme = {
                bgColor1: document.getElementById('bgColor1').value,
                bgColor2: document.getElementById('bgColor2').value,
                bgColor3: document.getElementById('bgColor3').value,
                textColor: document.getElementById('textColor').value,
                textSecondary: document.getElementById('textSecondary').value,
                accentColor: document.getElementById('accentColor').value,
                preset: null // Ez egyéni téma, nincs preset neve
            };
            
            // Előre beállított témák kijelölésének megszüntetése
            document.querySelectorAll('.theme-preset-btn').forEach(b => b.classList.remove('active'));
            
            applyTheme(theme);
            localStorage.setItem('userTheme', JSON.stringify(theme));
            syncSettingsToCloud();
            
            showNotification('✨ Egyéni téma alkalmazva!', 'success');
        });
    }
    
    // 4. Téma visszaállítása (TELJES ALAPHELYZET)
    const resetBtn = document.getElementById('resetTheme');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // Töröljük a mentett beállítást
            localStorage.removeItem('userTheme');
            
            // Levesszük a 'custom-theme' osztályt, így visszatér a CSS-ben lévő eredeti
            document.body.classList.remove('custom-theme');
            
            // Töröljük a JS által beállított inline stílusokat
            document.body.style.background = '';
            document.body.style.backgroundAttachment = '';
            document.documentElement.style = ''; // CSS változók törlése

            // Szinkronizálás (törlés a felhőből is)
            syncSettingsToCloud();
            
            // Gombok kijelölésének törlése
            document.querySelectorAll('.theme-preset-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Opcionális: Inputok visszaállítása egy alapértelmezett értékre, hogy ne nézzenek ki furán
            if (typeof presetThemes !== 'undefined' && presetThemes['dark-purple']) {
                 updateColorInputs(presetThemes['dark-purple']);
            }
            
            showNotification('🔄 Eredeti kinézet visszaállítva', 'success');
        });
    }
}

// Élő előnézet frissítése
function updateLivePreview() {
    const theme = {
        bgColor1: document.getElementById('bgColor1').value,
        bgColor2: document.getElementById('bgColor2').value,
        bgColor3: document.getElementById('bgColor3').value,
        textColor: document.getElementById('textColor').value,
        textSecondary: document.getElementById('textSecondary').value,
        accentColor: document.getElementById('accentColor').value
    };
    
    updateThemePreview(theme);
}

    window.toggleThemeSection = function() {
    const content = document.getElementById('themeContent');
    const arrow = document.getElementById('themeArrow');
    const header = arrow.closest('.theme-accordion-header');

    if (content.classList.contains('active')) {
        // Bezárás
        content.classList.remove('active');
        header.classList.remove('active');
    } else {
        // Kinyitás
        content.classList.add('active');
        header.classList.add('active');
    }
}

// Értesítés megjelenítése (ha nincs még ilyen függvény)
    function showNotification(message, type = 'info') {
        // Ha van meglévő értesítési rendszer, használjuk azt
        // Különben egyszerű alert
        if (typeof showToast !== 'undefined') {
            showToast(message, type);
        } else {
            // Egyszerű toast létrehozása
            const toast = document.createElement('div');
            toast.className = 'theme-toast';
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#27ae60' : '#667eea'};
                color: white;
                padding: 15px 25px;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 99999;
                animation: slideInRight 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }

    // --- INICIALIZÁLÁS (JAVÍTOTT RÉSZ) ---
    // Mivel a kód egésze már egy DOMContentLoaded eseményen belül van,
    // itt már nem kell újra várni az eseményre, közvetlenül hívjuk meg a függvényeket.

    // Téma betöltése
    loadThemeFromStorage();
    
    // Event listener-ek inicializálása
    initThemeCustomization();

    // Toast animációk CSS-ben (ha nincs már)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(400px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(400px); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

// Globális változó a jegyek tárolására
let allTickets = [];

// 1. Hibajegyek betöltése
async function loadAdminTickets() {
    const container = document.getElementById('ticketsGrid');
    if(!container) return;
    
    container.innerHTML = '<div class="recap-spinner"></div>';

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ action: 'GET_SUPPORT_TICKETS' })
        });
        const tickets = await response.json();
        
        if (!response.ok) throw new Error(tickets.error || "Hiba a betöltéskor");

        allTickets = tickets;
        renderTickets(allTickets); // Megjelenítés

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p class="no-results">Hiba történt a jegyek betöltésekor.</p>';
    }
}

// 2. Megjelenítés (Render)
function renderTickets(ticketsToRender) {
    const container = document.getElementById('ticketsGrid');
    container.innerHTML = '';

    if (ticketsToRender.length === 0) {
        container.innerHTML = '<p class="no-results">Nincs megjeleníthető hibajegy. 🎉</p>';
        return;
    }

    ticketsToRender.forEach(ticket => {
        // Státusz szerinti színek és ikonok
        let statusColor = '#3498db'; // Default kék
        let statusIcon = '🆕';
        
        if (ticket.status === 'Új') { statusColor = '#e74c3c'; statusIcon = '🔴'; }
        if (ticket.status === 'Folyamatban') { statusColor = '#f39c12'; statusIcon = '⏳'; }
        if (ticket.status === 'Megoldva') { statusColor = '#27ae60'; statusIcon = '✅'; }

        // Biztonságos szöveg
        const safeSubject = ticket.subject.replace(/</g, "&lt;");
        const safeMsg = ticket.message.replace(/</g, "&lt;").replace(/\n/g, '<br>');

        const card = `
        <div class="ticket-card" style="border-left: 4px solid ${statusColor};">
            <div class="ticket-header">
                <span class="ticket-id">#${ticket.originalIndex}</span>
                <span class="ticket-date">${ticket.date}</span>
                <div class="ticket-status-badge" style="background: ${statusColor}20; color: ${statusColor}; border: 1px solid ${statusColor};">
                    ${statusIcon} ${ticket.status}
                </div>
            </div>
            
            <div class="ticket-body">
                <h4 class="ticket-subject">${safeSubject}</h4>
                <div class="ticket-sender">
                    👤 <strong>${ticket.name}</strong> &lt;<a href="mailto:${ticket.email}" style="color:#aaa;">${ticket.email}</a>&gt;
                </div>
                <div class="ticket-message">${safeMsg}</div>
            </div>

            <div class="ticket-actions">
                <select class="ticket-status-select" onchange="updateTicketStatus(${ticket.originalIndex}, this.value)">
                    <option value="" disabled selected>Státusz módosítása...</option>
                    <option value="Új">🔴 Vissza: Új</option>
                    <option value="Folyamatban">⏳ Folyamatban</option>
                    <option value="Megoldva">✅ Kész (Megoldva)</option>
                </select>
                <a href="mailto:${ticket.email}?subject=Válasz: ${encodeURIComponent(ticket.subject)}" class="ticket-reply-btn">
                    ✉️ Válasz
                </a>
            </div>
        </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

// 3. Státusz Frissítése
window.updateTicketStatus = async function(index, newStatus) {
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'UPDATE_TICKET_STATUS', 
                originalIndex: index,
                newStatus: newStatus
            })
        });

        if (response.ok) {
            showSuccess(`Státusz frissítve: ${newStatus}`);
            // Helyi adat frissítése újratöltés nélkül
            const ticket = allTickets.find(t => t.originalIndex === index);
            if(ticket) ticket.status = newStatus;
            
            // Újrarenderelés az aktuális szűrővel
            const activeFilter = document.querySelector('.filter-chip.active')?.innerText.replace(/🔴|🟡|🟢/g, '').trim() || 'all';
            filterTickets(activeFilter);
        } else {
            showError("Hiba a mentéskor.");
        }
    } catch (e) {
        console.error(e);
        showError("Hálózati hiba.");
    }
}

// 4. Szűrés (Kliens oldali)
window.filterTickets = function(status) {
    // Gombok aktív állapota
    document.querySelectorAll('.filter-chip').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText.includes(status) || (status==='all' && btn.innerText==='Összes')) {
            btn.classList.add('active');
        }
    });

    if (status === 'all') {
        renderTickets(allTickets);
    } else {
        const filtered = allTickets.filter(t => t.status === status);
        renderTickets(filtered);
    }
}
    // === JELENTÉS RENDSZER (USER SIDE) ===

window.openReportModal = function(type, contentId, contentName) {
    document.getElementById('reportType').value = type;
    document.getElementById('reportContentId').value = contentId;
    
    // A 'reportTargetUser' hidden input már nem kell, vagy üresen hagyjuk
    if(document.getElementById('reportTargetUser')) {
        document.getElementById('reportTargetUser').value = ''; 
    }

    // A modalban a "Kit jelentesz?" helyett azt írjuk ki, hogy "Mit jelentesz?"
    // Így nem az email jelenik meg, hanem pl. a Sör neve vagy az Ötlet szövege
    const targetDisplay = document.getElementById('reportTargetName');
    if (targetDisplay) {
        targetDisplay.textContent = contentName ? `"${contentName}"` : `#${contentId}`;
        targetDisplay.style.fontStyle = 'italic';
    }
    
    document.getElementById('reportModal').classList.add('active');
}

window.closeReportModal = function() {
    document.getElementById('reportModal').classList.remove('active');
    document.getElementById('reportForm').reset();
}

document.getElementById('reportForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    setLoading(btn, true);

    const data = {
        action: 'REPORT_CONTENT',
        type: document.getElementById('reportType').value,
        contentId: document.getElementById('reportContentId').value,
        // reportedUserEmail: TÖRÖLVE! A backend keresi ki ID alapján.
        reason: document.getElementById('reportReason').value + ' ' + document.getElementById('reportDetails').value
    };

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            showSuccess("Jelentés sikeresen elküldve! 🛡️");
            closeReportModal();
        } else {
            showError("Hiba a küldéskor.");
        }
    } catch(err) { showError(err.message); }
    finally { setLoading(btn, false); }
});
    // === MODERÁCIÓ (ADMIN SIDE) ===

// 1. Jelentések betöltése (ID hozzáadása a kártyákhoz a könnyebb törlésért)
async function loadModerationTasks() {
    const container = document.getElementById('moderationList');
    if (!container) return;

    container.innerHTML = '<div class="recap-spinner"></div>';
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_MODERATION_TASKS' })
        });
        const reports = await response.json();
        
        container.innerHTML = ''; // Spinner törlése
        
        if (!response.ok) throw new Error("Hiba.");
        if (reports.length === 0) {
            container.innerHTML = '<p class="no-results">Nincs nyitott jelentés. 🕊️</p>';
            return;
        }

        reports.forEach(rep => {
            // Egyedi ID-t adunk a kártyának: ticket-card-INDEX
            const html = `
            <div class="ticket-card" id="ticket-card-${rep.index}" style="border-left: 4px solid #e74c3c;">
                <div class="ticket-header">
                    <span>${rep.date}</span>
                    <span style="color: #e74c3c; font-weight:bold;">${escapeHtml(rep.type)}</span>
                </div>
                <div class="ticket-body">
                    <h4 style="color:white;">${escapeHtml(rep.reportedUser)}</h4>
                    <p style="color:#aaa; font-style:italic;">"${escapeHtml(rep.content)}"</p>
                    <p style="color:#f39c12; margin-top:5px;">Ok: <strong>${escapeHtml(rep.reason)}</strong></p>
                </div>
                <div class="ticket-actions" style="margin-top:10px; border-top:1px solid #444; padding-top:10px;">
                    <button class="delete-btn-mini" style="background:#555;" onclick="dismissReport(${rep.index})">Elvetés</button>
                    <button class="delete-btn-mini" style="background:#e74c3c;" onclick="warnUser('${rep.reportedUser}', ${rep.index})">⚠️ Figyelmeztetés</button>
                </div>
            </div>`;
            container.insertAdjacentHTML('beforeend', html);
        });
    } catch (e) { 
        console.error(e); 
        container.innerHTML = '<p class="error">Hiba a betöltéskor.</p>';
    }
}

// 2. Elvetés javítása (Azonnali eltüntetés)
window.dismissReport = async function(reportIndex) {
    if(!confirm("Biztosan elveted a jelentést?")) return;
    
    // Azonnal elrejtjük a kártyát, hogy gyorsnak tűnjön
    const card = document.getElementById(`ticket-card-${reportIndex}`);
    if(card) card.style.opacity = '0.3'; // Vizuális visszajelzés, hogy dolgozunk

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'UPDATE_TICKET_STATUS', 
                originalIndex: reportIndex, 
                newStatus: 'Lezárva (Elvetve)'
            })
        });
        
        if (response.ok) {
            // Ha sikeres, végleg töröljük a DOM-ból
            if(card) card.remove();
            showSuccess("Jelentés elvetve.");
            
            // Ha üres lett a lista, írjuk ki, hogy nincs több
            if(document.getElementById('moderationList').children.length === 0) {
                 document.getElementById('moderationList').innerHTML = '<p class="no-results">Nincs több jelentés. 🕊️</p>';
            }
        } else {
            if(card) card.style.opacity = '1'; // Ha hiba, visszaállítjuk
            showError("Hiba történt.");
        }
    } catch (e) {
        if(card) card.style.opacity = '1';
        console.error(e);
    }
}

// 3. Figyelmeztetés javítása (Azonnali eltüntetés)
window.warnUser = async function(email, reportIndex) {
    if(!confirm(`Biztosan figyelmeztetést adsz neki: ${email}?`)) return;

    const card = document.getElementById(`ticket-card-${reportIndex}`);
    if(card) card.style.opacity = '0.3';

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'WARN_USER', 
                targetEmail: email,
                reportIndex: reportIndex
            })
        });
        
        const res = await response.json();
        if (response.ok) {
            if(card) card.remove(); // Töröljük a kártyát
            alert(res.message); // Kiírjuk az infót (pl. "Felhasználó kitiltva")
            
            if(document.getElementById('moderationList').children.length === 0) {
                 document.getElementById('moderationList').innerHTML = '<p class="no-results">Nincs több jelentés. 🕊️</p>';
            }
        } else {
            if(card) card.style.opacity = '1';
            showError("Hiba történt.");
        }
    } catch (e) { 
        if(card) card.style.opacity = '1';
        showError(e.message); 
    }
}
    // js.js - Fájl vége

// === DOKUMENTUM MEGJELENÍTŐ (ÁSZF / ADATVÉDELEM) ===

function openDocumentModal(url, title) {
    const modal = document.getElementById('documentModal');
    const frame = document.getElementById('documentFrame');
    const titleEl = document.getElementById('documentTitle');
    const loader = document.getElementById('docLoader');

    if (!modal || !frame) return;

    // Cím beállítása
    titleEl.textContent = title;
    
    // Loader megjelenítése, iframe elrejtése amíg tölt
    if(loader) loader.style.display = 'block';
    
    // Iframe betöltése
    frame.src = url;
    
    // Ha betöltött, eltüntetjük a loadert
    frame.onload = function() {
        if(loader) loader.style.display = 'none';
    };

    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Háttér görgetés tiltása
}

function closeDocumentModal() {
    const modal = document.getElementById('documentModal');
    const frame = document.getElementById('documentFrame');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Kis késleltetéssel ürítjük az iframe-et, hogy ne villanjon
        setTimeout(() => {
            if(frame) frame.src = 'about:blank';
        }, 300);
    }
}

// Globális elérés biztosítása (hogy a HTML gombok lássák)
window.openDocumentModal = openDocumentModal;
window.closeDocumentModal = closeDocumentModal;

    // === SZAVAZÁS KEZELÉSE (UPVOTE) ===
window.handleVote = async function(type, index, buttonElement) {
    // UI Frissítése azonnal (Optimistic UI)
    const countEl = buttonElement.nextElementSibling;
    let currentCount = parseInt(countEl.textContent);
    const isActive = buttonElement.classList.contains('active');

    if (isActive) {
        // Visszavonás
        currentCount = Math.max(0, currentCount - 1);
        buttonElement.classList.remove('active');
    } else {
        // Hozzáadás
        currentCount++;
        buttonElement.classList.add('active');
        
        // Konfetti effekt (ha be van töltve a könyvtár)
        if (typeof confetti === 'function') {
            const rect = buttonElement.getBoundingClientRect();
            // Pozícionáljuk a gombhoz
            const x = (rect.left + rect.width / 2) / window.innerWidth;
            const y = (rect.top + rect.height / 2) / window.innerHeight;
            
            confetti({
                particleCount: 20,
                spread: 40,
                origin: { x: x, y: y },
                colors: ['#ff4500', '#ffd700'],
                disableForReducedMotion: true,
                scalar: 0.6 // Kisebb konfettik
            });
        }
    }
    countEl.textContent = currentCount;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('userToken')}`
            },
            body: JSON.stringify({ 
                action: 'VOTE_CONTENT', 
                type: type, // 'idea' vagy 'recommendation'
                index: index,
                isUpvote: !isActive
            })
        });

        if (!response.ok) {
            throw new Error("Hiba a szavazáskor");
        }
        
    } catch (error) {
        console.error(error);
        showError("Nem sikerült elmenteni a szavazatot.");
        // Visszaállítás hiba esetén
        countEl.textContent = isActive ? currentCount + 1 : currentCount - 1;
        buttonElement.classList.toggle('active');
    }
}
    // ======================================================
// === MIT IGYAK MA (ROULETTE) PRO LOGIKA ===
// ======================================================

let rouletteInterval;
let isSpinning = false;
let currentPool = []; // Itt tároljuk az aktuálisan szűrt listát

// 1. Modal megnyitása és inicializálás
window.openRandomPickerModal = function() {
    const fabContainer = document.getElementById('fabContainer');
    if(fabContainer) fabContainer.classList.remove('active');

    // UI Reset
    document.getElementById('rouletteText').textContent = "❓";
    document.getElementById('rouletteText').className = "roulette-text";
    document.getElementById('winnerDetails').style.opacity = '0';
    document.getElementById('winnerDetails').style.height = '0';
    
    // Alaphelyzetbe állítás
    document.getElementById('pickerTypeFilter').value = 'all';
    document.getElementById('pickerScoreFilter').value = '0';
    
    // Szűrők feltöltése és Statisztika frissítése
    populatePickerFilters(); // Helyszínek és kategóriák betöltése
    updateRouletteStats();   // Pool kiszámolása

    document.getElementById('randomPickerModal').classList.add('active');
}

// 2. Modal bezárása
window.closeRandomPickerModal = function() {
    if (isSpinning) return;
    document.getElementById('randomPickerModal').classList.remove('active');
}

// 3. Dinamikus listák feltöltése (Helyszínek, Kategóriák)
function populatePickerFilters() {
    const type = document.getElementById('pickerTypeFilter').value;
    const catSelect = document.getElementById('pickerCategoryFilter');
    const locSelect = document.getElementById('pickerLocationFilter');
    
    // Jelenlegi kiválasztás mentése (ha van)
    const savedCat = catSelect.value;
    const savedLoc = locSelect.value;

    // Reset
    catSelect.innerHTML = '<option value="all">Bármilyen fajta</option>';
    locSelect.innerHTML = '<option value="all">Bárhol</option>';

    // Adatok gyűjtése
    let tempPool = [];
    if (type === 'all' || type === 'beer') tempPool = tempPool.concat(currentUserBeers || []);
    if (type === 'all' || type === 'drink') tempPool = tempPool.concat(currentUserDrinks || []);

    // Egyedi értékek kigyűjtése
    const categories = new Set();
    const locations = new Set();

    tempPool.forEach(item => {
        // Kategória logika: Sörnél 'type', Italnál 'category' a fő jellemző
        if (item.beerName) categories.add(item.type); // Sör típus
        if (item.drinkName) categories.add(item.category); // Ital kategória
        
        if (item.location) locations.add(item.location);
    });

    // Feltöltés ABC sorrendben
    Array.from(categories).sort().forEach(cat => {
        catSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`);
    });
    
    Array.from(locations).sort().forEach(loc => {
        locSelect.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`);
    });

    // Visszaállítás, ha még létezik az opció
    if (Array.from(catSelect.options).some(o => o.value === savedCat)) catSelect.value = savedCat;
    if (Array.from(locSelect.options).some(o => o.value === savedLoc)) locSelect.value = savedLoc;
}

// 4. Ha változik a Típus (Sör/Ital), újra kell tölteni a kategóriákat
window.handlePickerTypeChange = function() {
    // Reseteljük a kategóriát "all"-ra, mert a sör kategóriák nem érvényesek italnál
    document.getElementById('pickerCategoryFilter').value = 'all';
    populatePickerFilters();
    updateRouletteStats();
}

// 5. Statisztika Frissítése és Pool Kiszámolása (Ez fut minden változáskor)
window.updateRouletteStats = function() {
    const typeFilter = document.getElementById('pickerTypeFilter').value;
    const scoreFilter = parseFloat(document.getElementById('pickerScoreFilter').value);
    const catFilter = document.getElementById('pickerCategoryFilter').value;
    const locFilter = document.getElementById('pickerLocationFilter').value;

    let pool = [];

    // 1. Alaphalmaz
    if (typeFilter === 'all' || typeFilter === 'beer') {
        pool = pool.concat(currentUserBeers.map(b => ({...b, _source: 'Sör', _cat: b.type})));
    }
    if (typeFilter === 'all' || typeFilter === 'drink') {
        pool = pool.concat(currentUserDrinks.map(d => ({...d, _source: 'Ital', _cat: d.category})));
    }

    // 2. Szűrés
    currentPool = pool.filter(item => {
        // Pontszám
        const score = parseFloat(item.avg.toString().replace(',', '.')) || 0;
        if (score < scoreFilter) return false;

        // Kategória
        if (catFilter !== 'all' && item._cat !== catFilter) return false;

        // Helyszín
        if (locFilter !== 'all' && item.location !== locFilter) return false;

        return true;
    });

    // 3. UI Frissítése
    const countEl = document.getElementById('poolCountDisplay');
    const avgEl = document.getElementById('poolAvgDisplay');
    const spinBtn = document.getElementById('spinBtn');

    countEl.textContent = `${currentPool.length} db`;
    
    if (currentPool.length > 0) {
        const totalAvg = currentPool.reduce((sum, item) => sum + (parseFloat(item.avg.toString().replace(',', '.')) || 0), 0);
        avgEl.textContent = (totalAvg / currentPool.length).toFixed(2);
        
        spinBtn.disabled = false;
        spinBtn.style.opacity = '1';
        spinBtn.innerHTML = 'PÖRGETÉS! 🎰';
    } else {
        avgEl.textContent = '0.0';
        spinBtn.disabled = true;
        spinBtn.style.opacity = '0.5';
        spinBtn.innerHTML = 'NINCS TALÁLAT 🚫';
    }
}

// 6. PÖRGETÉS INDÍTÁSA
window.startRoulette = function() {
    if (isSpinning) return;
    if (currentPool.length === 0) return;

    // --- ANIMÁCIÓ KEZDÉSE ---
    isSpinning = true;
    const textEl = document.getElementById('rouletteText');
    const spinBtn = document.getElementById('spinBtn');
    const detailsDiv = document.getElementById('winnerDetails');
    
    // UI letiltása
    spinBtn.disabled = true;
    spinBtn.textContent = "PÖRGÉS... 🎰";
    document.querySelectorAll('.picker-filter-grid select').forEach(s => s.disabled = true);
    
    textEl.className = "roulette-text blur";
    detailsDiv.style.opacity = '0';
    detailsDiv.style.height = '0';

    let counter = 0;
    const totalSpins = 30 + Math.floor(Math.random() * 10); // Véletlenszerű hossz
    let speed = 50;

    function spinLoop() {
        // Véletlenszerű elem a SZŰRT poolból
        const randomItem = currentPool[Math.floor(Math.random() * currentPool.length)];
        const name = randomItem.beerName || randomItem.drinkName;
        textEl.textContent = name;

        counter++;

        if (counter < totalSpins) {
            // Exponenciális lassulás
            if (counter > totalSpins - 5) speed += 100;
            else if (counter > totalSpins - 10) speed += 40;
            else if (counter > totalSpins - 20) speed += 10;
            
            setTimeout(spinLoop, speed);
        } else {
            finalizeWinner(randomItem);
        }
    }

    spinLoop();
}

function finalizeWinner(item) {
    const textEl = document.getElementById('rouletteText');
    const spinBtn = document.getElementById('spinBtn');
    const detailsDiv = document.getElementById('winnerDetails');
    const typeEl = document.getElementById('winnerType');
    const scoreEl = document.getElementById('winnerScore');
    const locEl = document.getElementById('winnerLoc');

    // Név beállítása
    const name = item.beerName || item.drinkName;
    const score = item.avg;
    const source = item._source || 'Tétel';
    const subType = item.type || item.category || '';
    const location = item.location || 'Ismeretlen hely';

    textEl.textContent = name;
    textEl.className = "roulette-text winner"; 

    // Részletek megjelenítése
    typeEl.textContent = `${source} • ${subType}`;
    scoreEl.textContent = `${score} pont ⭐`;
    locEl.textContent = `📍 ${location}`;
    
    detailsDiv.style.height = 'auto';
    detailsDiv.style.opacity = '1';

    // Konfetti
    if (typeof confetti === 'function') {
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#8a73ff', '#ffd700', '#ffffff']
        });
    }

    // Reset UI
    isSpinning = false;
    spinBtn.disabled = false;
    spinBtn.textContent = "ÚJRA PÖRGETÉS 🔄";
    document.querySelectorAll('.picker-filter-grid select').forEach(s => s.disabled = false);
}
    window.addEventListener('offline', () => {
    showError('Már nem vagy az internetre csatlakoztatva! (Offline mód)');
    document.body.style.filter = 'grayscale(0.5)'; // Kicsit szürkítjük az oldalt
});

window.addEventListener('online', () => {
    showSuccess('Újra online vagy! 🌐');
    document.body.style.filter = 'grayscale(0)';
    loadUserData();
    
});
    let deferredPrompt;
const installAppBtn = document.getElementById('installAppBtn');

// Elkapjuk a telepítési eseményt
window.addEventListener('beforeinstallprompt', (e) => {
    // Megakadályozzuk, hogy a böngésző magától feldobja a saját csúnya bannerét
    e.preventDefault();
    // Elmentjük az eseményt, hogy később meghívhassuk
    deferredPrompt = e;
    // Megjelenítjük a mi szép gombunkat
    if (installAppBtn) {
        installAppBtn.style.display = 'block';
    }
});

// Mi történik, ha a user rákattint a gombra?
if (installAppBtn) {
    installAppBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Megjelenítjük a rendszer telepítő ablakát
            deferredPrompt.prompt();
            
            // Megvárjuk, mit választ a felhasználó (Telepít vagy Mégse)
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Telepítés eredménye: ${outcome}`);
            
            // Ha egyszer reagált, a promptot nem lehet újra használni
            deferredPrompt = null;
            // Eltüntetjük a gombot
            installAppBtn.style.display = 'none';
        }
    });
}

// Ha sikeresen feltelepült az app, eltüntetjük a gombot
window.addEventListener('appinstalled', () => {
    if (installAppBtn) {
        installAppBtn.style.display = 'none';
    }
    deferredPrompt = null;
    console.log('PWA sikeresen telepítve!');
});
});





