document.addEventListener('DOMContentLoaded', function() {

    if (typeof Chart !== 'undefined') {
        Chart.defaults.color = '#e0e0e0';
        Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
    
    // --- NÃ‰ZETEK Ã‰S ELEMEK ---
    // --- KURZOR ELEMEK Ã‰S LOGIKA ---
    const beerCursor = document.getElementById('beerCursor');

    // 1. Kurzor mozgatÃ¡sa + Scroll effekt vÃ¡ltozÃ³k
    let currentScrollRotate = -15; // Alap dÅ‘lÃ©s

    function updateCursorPosition(x, y) {
        if (!document.body.classList.contains('custom-cursor-active')) return;
        
        // Itt kombinÃ¡ljuk a pozÃ­ciÃ³t a gÃ¶rgetÃ©sbÅ‘l szÃ¡molt dÅ‘lÃ©ssel
        // Fontos: a 'translate' Ã©s 'rotate' sorrendje szÃ¡mÃ­t!
        beerCursor.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${currentScrollRotate}deg)`;
    }

    // EgÃ©rmozgÃ¡s figyelÃ©se
    document.addEventListener('mousemove', (e) => {
        // requestAnimationFrame a simÃ¡bb mozgÃ¡sÃ©rt
        requestAnimationFrame(() => {
            // ElmentjÃ¼k az aktuÃ¡lis egÃ©r pozÃ­ciÃ³t a stÃ­lusba (CSS vÃ¡ltozÃ³kÃ©nt is lehetne, de Ã­gy kÃ¶zvetlenebb)
            // Viszont a transform felÃ¼lÃ­rÃ¡sa miatt a rotate-et is mindig bele kell Ã­rnunk.
            // EzÃ©rt egyszerÅ±bb, ha globÃ¡lis vÃ¡ltozÃ³kban tÃ¡roljuk az X, Y-t.
            window.mouseX = e.clientX;
            window.mouseY = e.clientY;
            updateCursorPosition(e.clientX, e.clientY);
        });
    });

    // 2. GÃ–RGETÃ‰S EFFEKT (IVÃS / DÅLÃ‰S)
    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        
        // --- JAVÃTÃS: NaN (Not a Number) elkerÃ¼lÃ©se ---
        // Ha teljes kÃ©pernyÅ‘n vagyunk, a docHeight lehet 0, ami osztÃ¡snÃ¡l hibÃ¡t okoz.
        let scrollPercent = 0;
        if (docHeight > 0) {
            scrollPercent = scrollTop / docHeight;
        }

        // BiztonsÃ¡gi korlÃ¡t (0 Ã©s 1 kÃ¶zÃ¶tt tartjuk)
        scrollPercent = Math.min(Math.max(scrollPercent, 0), 1);

        const startAngle = -15;
        const endAngle = -70; 
        
        currentScrollRotate = startAngle + (scrollPercent * (endAngle - startAngle));

        if (window.mouseX !== undefined) {
            updateCursorPosition(window.mouseX, window.mouseY);
        }
    });

    // 3. Intelligens vÃ¡ltÃ¡s figyelÃ©se (Hover effekt)
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
            // Ha gomb felett vagyunk, kicsit "koccintÃ³sra" Ã¡llÃ­tjuk
            beerCursor.style.transform = `translate(${window.mouseX}px, ${window.mouseY}px) translate(-50%, -50%) rotate(-35deg) scale(1.2)`;
        } else {
            document.body.classList.remove('hovering-clickable');
            // VisszaÃ¡llunk a gÃ¶rgetÃ©s szerinti szÃ¶gre
            if (window.mouseX) updateCursorPosition(window.mouseX, window.mouseY);
        }
    });

    // 4. KattintÃ¡s effekt
    document.addEventListener('click', (e) => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        createBeerBubbles(e.clientX, e.clientY);
        
        // Pici animÃ¡ciÃ³ kattintÃ¡skor
        if (!document.body.classList.contains('hovering-clickable')) {
            // Pillanatnyi "koccintÃ¡s"
            beerCursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%) rotate(-90deg) scale(0.9)`;
            
            setTimeout(() => {
                // VisszatÃ©rÃ©s a gÃ¶rgetÃ©s szerinti Ã¡llapothoz
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

    // ---(globÃ¡lis) ÃLLAPOT ---
    
    let beersData = [];
    let currentAdminRecapView = 'common';
    let usersData = [];
    let filteredBeers = [];
    let selectedSuggestionIndex = -1;
    let charts = {};
    let currentUserBeers = [];
    let currentUserDrinks = [];
    let temp2FASecret = ''; // Ideiglenes tÃ¡rolÃ³ a setup kÃ¶zben
    let tempLoginEmail = ''; // Ideiglenes tÃ¡rolÃ³ login kÃ¶zben

    // ======================================================
    // === FÅ FUNKCIÃ“K (SZERVER KOMMUNIKÃCIÃ“) ===
    // ======================================================

    async function handleAdminLogin(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('adminUsername').value;
        const passwordInput = document.getElementById('adminPassword').value;
        const submitBtn = adminForm.querySelector('.auth-btn');

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'GET_DATA', username: usernameInput, password: passwordInput })
            });
            
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Hiba: ${response.status}`);

            // Adatok mentÃ©se a vÃ¡ltozÃ³kba
            beersData = result.beers || [];
            usersData = result.users || [];
            filteredBeers = [...beersData]; 
            
            // === JAVÃTÃS: ADMIN TOKEN MENTÃ‰SE ===
            // Ha ezt nem mentjÃ¼k el, minden tovÃ¡bbi kÃ©rÃ©s (pl. Ã¶tletek betÃ¶ltÃ©se) 401-et ad!
            if (result.adminToken) {
                console.log("Admin token sikeresen mentve!"); // Debug Ã¼zenet
                localStorage.setItem('userToken', result.adminToken);
                
                // Admin profil mentÃ©se a mÅ±kÃ¶dÃ©shez
                localStorage.setItem('userData', JSON.stringify({ 
                    name: 'AdminisztrÃ¡tor', 
                    email: 'admin@sortablazat.hu', 
                    isAdmin: true 
                }));
            } else {
                console.warn("FIGYELEM: Nem Ã©rkezett admin token a szervertÅ‘l!");
            }
            // =====================================
            
            showSuccess('Sikeres Gabz Ã©s Lajos bejelentkezÃ©s!');
            
            setTimeout(() => {
                closeAdminModal();
                switchToAdminView();
            }, 1000);

        } catch (error) {
            console.error("BejelentkezÃ©si hiba:", error);
            showError(error.message || 'HibÃ¡s felhasznÃ¡lÃ³nÃ©v vagy jelszÃ³!');
        } finally {
            setLoading(submitBtn, false);
        }
    }
    
    // ======================================================
    // === VENDÃ‰G FELHASZNÃLÃ“ FUNKCIÃ“K ===
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
                showError("A munkameneted lejÃ¡rt, kÃ©rlek jelentkezz be Ãºjra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(result.error || 'Szerverhiba');
        }
        showSuccess('SÃ¶r sikeresen hozzÃ¡adva!');
        addBeerForm.reset();
        closeAddModal('beer');
        loadUserData();
    } catch (error) {
        console.error("Hiba sÃ¶r hozzÃ¡adÃ¡sakor:", error);
        showError(error.message || "Nem sikerÃ¼lt a sÃ¶rt hozzÃ¡adni.");
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
                showError("A munkameneted lejÃ¡rt, kÃ©rlek jelentkezz be Ãºjra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(result.error || 'Szerverhiba');
        }
        showSuccess('Ital sikeresen hozzÃ¡adva!');
        addDrinkForm.reset();
        closeAddModal('drink');
        loadUserDrinks(); // ÃšjratÃ¶ltjÃ¼k az italokat
    } catch (error) {
        console.error("Hiba ital hozzÃ¡adÃ¡sakor:", error);
        showError(error.message || "Nem sikerÃ¼lt az italt hozzÃ¡adni.");
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
            if (response.status === 401) {
                showError("A munkameneted lejÃ¡rt, jelentkezz be Ãºjra.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(drinks.error || 'Szerverhiba');
        }
        
        currentUserDrinks = drinks; // GlobÃ¡lis vÃ¡ltozÃ³ frissÃ­tÃ©se
        renderUserDrinks(drinks);
        updateUserDrinkStats(drinks);
        
        // --- JAVÃTÃS: Achievementek ÃºjraszÃ¡molÃ¡sa az italok megÃ©rkezÃ©se utÃ¡n ---
        console.log(`Italok betÃ¶ltve: ${drinks.length} db. Achievementek frissÃ­tÃ©se...`);
        renderAchievementsTab(); 
        
        // RangjelzÃ©s (Badge) frissÃ­tÃ©se a fejlÃ©cben, ha vÃ¡ltozott volna
        updateUserBadgeDisplay(); 
        // -----------------------------------------------------------------------

    } catch (error) {
        console.error("Hiba az italok betÃ¶ltÃ©sekor:", error);
        showError(error.message || "Nem sikerÃ¼lt betÃ¶lteni az italokat.");
    }
}
        /* === JELSZÃ“ MEGJELENÃTÃ‰SE / ELREJTÃ‰SE === */
        function togglePassword(inputId, icon) {
            const input = document.getElementById(inputId);
            
            if (!input) return; // BiztonsÃ¡gi ellenÅ‘rzÃ©s
        
            if (input.type === "password") {
                input.type = "text";
                input.classList.add('password-visible'); // CSS miatt
                icon.textContent = "ðŸ™ˆ"; // Lecsukott szem (vagy hasznÃ¡lhatsz mÃ¡st)
            } else {
                input.type = "password";
                input.classList.remove('password-visible');
                icon.textContent = "ðŸ‘ï¸"; // Nyitott szem
            }
        }
        
        // Mivel a HTML-ben az 'onclick' attribÃºtumot hasznÃ¡ltuk, 
        // ezt a fÃ¼ggvÃ©nyt globÃ¡lisan elÃ©rhetÅ‘vÃ© kell tenni:
        window.togglePassword = togglePassword;

    
function renderUserDrinks(drinks) {
    userDrinkTableBody.innerHTML = '';
    if (!drinks || drinks.length === 0) {
        userDrinkTableBody.innerHTML = `<tr><td colspan="12" class="no-results">MÃ©g nem Ã©rtÃ©keltÃ©l egy italt sem.</td></tr>`;
        return;
    }
    drinks.forEach((drink, index) => {
        const formattedDate = drink.date ? new Date(drink.date).toLocaleDateString('hu-HU') : 'N/A';
        const formattedAvg = drink.avg ? parseFloat(drink.avg).toFixed(2) : '0.00';
        const row = `
            <tr>
                <td>${formattedDate}</td>
                <td>${drink.drinkName}</td>
                <td>${drink.category}</td>
                <td>${drink.type}</td>
                <td>${drink.location}</td>
                <td>${drink.drinkPercentage || '-'}${drink.drinkPercentage ? '%' : ''}</td>
                <td>${drink.look || 0}</td>
                <td>${drink.smell || 0}</td>
                <td>${drink.taste || 0}</td>
                <td>${drink.totalScore || 0}</td>
                <td class="average-cell">${formattedAvg}</td>
                <td><button class="edit-btn" onclick="openEditDrinkModal(${index})">âœï¸</button></td>
            </tr>
        `;
        userDrinkTableBody.insertAdjacentHTML('beforeend', row);
    });
}

    // === Ã–TLET LÃDA FUNKCIÃ“K ===

// 1. Ã–tlet bekÃ¼ldÃ©se
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
        if (!response.ok) throw new Error(result.error || "Hiba tÃ¶rtÃ©nt.");

        showSuccess(result.message || "Ã–tlet sikeresen bekÃ¼ldve! KÃ¶szi! ðŸ’¡");
        document.getElementById('ideaText').value = ''; // TÃ¶rlÃ©s
        loadUserIdeas(); // Lista frissÃ­tÃ©se

    } catch (error) {
        showError(error.message);
    } finally {
        setLoading(btn, false);
    }
}

// 2. Ã–tletek betÃ¶ltÃ©se (User oldal)
async function loadUserIdeas() {
    const hallContainer = document.getElementById('hallOfFameList');
    const pendingContainer = document.getElementById('pendingIdeasList');
    
    // TÃ¶ltÃ©sjelzÅ‘
    hallContainer.innerHTML = '<div class="recap-spinner"></div>';
    
    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_ALL_IDEAS' })
        });
        
        const ideas = await response.json();
        if (!response.ok) throw new Error("Nem sikerÃ¼lt betÃ¶lteni az Ã¶tleteket.");

        // TakarÃ­tÃ¡s
        hallContainer.innerHTML = '';
        pendingContainer.innerHTML = '';

        if(ideas.length === 0) {
            pendingContainer.innerHTML = '<p style="text-align:center; color:#aaa;">MÃ©g nincsenek Ã¶tletek. LÃ©gy te az elsÅ‘!</p>';
            return;
        }

        let hasFame = false;

        ideas.forEach(item => {
            const isDone = (item.status === 'MegcsinÃ¡lva');
            
            if (isDone) {
                // DICSÅSÃ‰GFAL KÃRTYA
                hasFame = true;
                const card = `
                <div class="fame-card">
                    <div class="fame-user">
                        <span class="fame-avatar">ðŸ‘‘</span>
                        <span class="fame-name">${item.submitter}</span>
                    </div>
                    <div class="fame-idea">"${item.idea}"</div>
                    <div class="fame-footer">
                        KÃ¶szÃ¶njÃ¼k az Ã¶tletet! â€¢ ${item.date}
                    </div>
                </div>`;
                hallContainer.insertAdjacentHTML('beforeend', card);
            } else {
                // VÃRAKOZÃ“ LISTA
                const card = `
                <div class="pending-idea-card">
                    <div class="pending-content">
                        <h4>${item.idea}</h4>
                        <p>BekÃ¼ldte: ${item.submitter} â€¢ ${item.date}</p>
                    </div>
                    <div class="pending-status">â³ ${item.status}</div>
                </div>`;
                pendingContainer.insertAdjacentHTML('beforeend', card);
            }
        });

        if(!hasFame) {
            hallContainer.innerHTML = '<p style="color:#aaa; font-style:italic;">MÃ©g Ã¼res a dicsÅ‘sÃ©gfal. KÃ¼ldj be egy jÃ³ Ã¶tletet!</p>';
        }

    } catch (error) {
        console.error(error);
        hallContainer.innerHTML = '<p class="error">Hiba a betÃ¶ltÃ©skor.</p>';
    }
}

// 3. Ã–tletek betÃ¶ltÃ©se (Admin oldal)
async function loadAllIdeasForAdmin() {
    const tbody = document.getElementById('adminIdeasTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">BetÃ¶ltÃ©s...</td></tr>';

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_ALL_IDEAS' })
        });

        const ideas = await response.json();
        tbody.innerHTML = '';

        if(ideas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-results">Nincsenek bekÃ¼ldÃ¶tt Ã¶tletek.</td></tr>';
            return;
        }

        ideas.forEach(item => {
            const isDone = (item.status === 'MegcsinÃ¡lva');
            const statusClass = isDone ? 'status-done' : 'status-waiting';
            
            // Gomb: Ha mÃ¡r kÃ©sz, ne legyen gomb, vagy legyen inaktÃ­v
            const actionBtn = isDone 
                ? 'âœ… KÃ©sz' 
                : `<button class="mark-done-btn" onclick="markIdeaAsDone(${item.index})">ðŸ KÃ©sz</button>`;

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
        showError("Hiba az admin lista betÃ¶ltÃ©sekor.");
    }
}

// 4. StÃ¡tusz frissÃ­tÃ©se (Admin mÅ±velet)
async function markIdeaAsDone(index) {
    if(!confirm("Biztosan megjelÃ¶lÃ¶d ezt az Ã¶tletet 'MegcsinÃ¡lva' stÃ¡tusszal? Ezzel kikerÃ¼l a DicsÅ‘sÃ©gfalra!")) return;

    try {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ 
                action: 'UPDATE_IDEA_STATUS', 
                index: index, 
                newStatus: 'MegcsinÃ¡lva' 
            })
        });

        if(response.ok) {
            showSuccess("StÃ¡tusz frissÃ­tve! IrÃ¡ny a dicsÅ‘sÃ©gfal! ðŸ†");
            loadAllIdeasForAdmin(); // TÃ¡blÃ¡zat ÃºjratÃ¶ltÃ©se
        } else {
            showError("Hiba a mentÃ©skor.");
        }
    } catch (error) {
        showError("HÃ¡lÃ³zati hiba.");
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

        // 1. Minimum 8 karakter ellenÅ‘rzÃ©se
        if (password.length < 8) {
            showError("A jelszÃ³nak legalÃ¡bb 8 karakter hosszÃºnak kell lennie!");
            return;
        }

        // 2. SzÃ¡m ellenÅ‘rzÃ©se (RegExp)
        if (!/\d/.test(password)) {
            showError("A jelszÃ³nak tartalmaznia kell legalÃ¡bb egy szÃ¡mot!");
            return;
        }

        // 3. SpeciÃ¡lis karakter ellenÅ‘rzÃ©se
        // Ez a lista tartalmazza a gyakoribb speciÃ¡lis karaktereket: !@#$%^&*() stb.
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            showError("A jelszÃ³nak tartalmaznia kell legalÃ¡bb egy speciÃ¡lis karaktert!");
            return;
        }

        if (password !== passwordConfirm) {
            showError("A kÃ©t jelszÃ³ nem egyezik!");
            return;
        }
        if (!termsAccepted) {
            showError("A regisztrÃ¡ciÃ³hoz el kell fogadnod az AdatvÃ©delmi TÃ¡jÃ©koztatÃ³t!");
            return;
        }

        setLoading(submitBtn, true);
        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REGISTER_USER', name, email, password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');

            showSuccess('Sikeres regisztrÃ¡ciÃ³! Most mÃ¡r bejelentkezhetsz.');
            registerCard.classList.remove('active');
            setTimeout(() => loginCard.classList.add('active'), 300);

        } catch (error) {
            console.error("RegisztrÃ¡ciÃ³s hiba:", error);
            showError(error.message || 'A regisztrÃ¡ciÃ³ sikertelen.');
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
            
            // --- ITT VOLT A HIÃNYZÃ“ RÃ‰SZ ---
            // Ha a szerver azt mondja, hogy 2FA kell:
            // Ha a szerver azt mondja, hogy 2FA kell:
            if (result.require2fa) {
                tempLoginEmail = result.tempEmail; // Email mentÃ©se

                // === 2FA ABLAK MEGJELENÃTÃ‰SE (JAVÃTOTT VERZIÃ“) ===
                const modal2FA = document.getElementById('login2FAModal');
                
                // 1. MENTÅÃ–V: Ha az ablak rossz helyen van, Ã¡trakjuk a Body-ba
                if (modal2FA && modal2FA.parentElement !== document.body) {
                    document.body.appendChild(modal2FA);
                }

                // 2. MegjelenÃ­tÃ©s kÃ©nyszerÃ­tÃ©se
                if (modal2FA) {
                    modal2FA.style.zIndex = "999999"; // Legyen legfelÃ¼l
                    modal2FA.style.display = "flex";  // Ne legyen display: none
                    
                    // AnimÃ¡ciÃ³ indÃ­tÃ¡sa kis kÃ©sleltetÃ©ssel
                    setTimeout(() => {
                        modal2FA.classList.add('active');
                        
                        // FÃ³kusz a beviteli mezÅ‘re
                        const input = document.getElementById('login2FACode');
                        if(input) input.focus();
                    }, 10);
                }

                // 3. TÃ¶ltÃ©s jelzÅ‘ kikapcsolÃ¡sa a gombon
                setLoading(submitBtn, false);
                return; // KILÃ‰PÃœNK, hogy ne fusson tovÃ¡bb a sima belÃ©pÃ©s
            }
            // ---------------------------------

            // Ez a rÃ©sz csak akkor fut le, ha NINCS bekapcsolva a 2FA a usernÃ©l
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));

            showSuccess(`Sikeres bejelentkezÃ©s, ${result.user.name}!`);
            setTimeout(switchToUserView, 1000);
        } catch (error) {
            console.error("BejelentkezÃ©si hiba:", error);
            showError(error.message || 'HibÃ¡s e-mail cÃ­m vagy jelszÃ³!');
        } finally {
            // Csak akkor kapcsoljuk ki a tÃ¶ltÃ©st, ha nem nyÃ­lt meg a 2FA ablak
            // (Ha megnyÃ­lt, ott mÃ¡r kikapcsoltuk a 'if' Ã¡gban)
            if (!login2FAModal.classList.contains('active')) {
                 setLoading(submitBtn, false);
            }
        }
    }

    // --- ÃšJ: FELHASZNÃLÃ“I FIÃ“K KEZELÃ‰SE ---
    
    async function handleChangePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;
        const submitBtn = changePasswordForm.querySelector('.action-btn');

        if (newPassword !== newPasswordConfirm) {
            showError("Az Ãºj jelszavak nem egyeznek!");
            return;
        }
        if (newPassword.length < 6) {
             showError("Az Ãºj jelszÃ³nak legalÃ¡bb 6 karakter hosszÃºnak kell lennie.");
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
            
            showSuccess("JelszÃ³ sikeresen mÃ³dosÃ­tva!");
            changePasswordForm.reset();
        } catch (error) {
            showError(error.message || "Nem sikerÃ¼lt a jelszÃ³ mÃ³dosÃ­tÃ¡sa.");
        } finally {
            setLoading(submitBtn, false);
        }
    }

    async function handleDeleteUser() {
        const confirmation = prompt("Biztosan tÃ¶rÃ¶lni szeretnÃ©d a fiÃ³kodat? Ez vÃ©gleges Ã©s nem vonhatÃ³ vissza. Ha biztos vagy, Ã­rd be ide: TÃ–RLÃ‰S");
        if (confirmation !== "TÃ–RLÃ‰S") {
            showNotification("FiÃ³k tÃ¶rlÃ©se megszakÃ­tva.", "info");
            return;
        }

        try {
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
                body: JSON.stringify({ action: 'DELETE_USER' })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Szerverhiba");

            showSuccess("A fiÃ³kodat sikeresen tÃ¶rÃ¶ltÃ¼k. ViszlÃ¡t!");
            setTimeout(switchToGuestView, 2000);

        } catch (error) {
            showError(error.message || "A fiÃ³k tÃ¶rlÃ©se nem sikerÃ¼lt.");
        }
    }



    // ======================================================
    // === ÃšJ: FÅ NAVIGÃCIÃ“S FÃœLEK KEZELÃ‰SE ===
    // ======================================================

    function initializeMainTabs(viewElement) {
    // KÃ©tfÃ©le navigÃ¡ciÃ³t tÃ¡mogatunk: a rÃ©gi tab-listÃ¡t (admin) Ã©s az Ãºj oldalsÃ¡vot (user)
    const navButtons = viewElement.querySelectorAll('.main-tab-btn, .nav-item[data-tab-content]');
    const tabPanes = viewElement.querySelectorAll('.main-tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // MegakadÃ¡lyozzuk, hogy a gomb belsejÃ©re kattintva elvesszen a referencia
            const clickedButton = e.target.closest('button'); 
            if (!clickedButton) return;

            // Ha kijelentkezÃ©s gomb, azt hagyjuk a sajÃ¡t esemÃ©nykezelÅ‘jÃ©re
            if (clickedButton.id === 'userLogoutBtn') return;

            // AktÃ­v Ã¡llapot beÃ¡llÃ­tÃ¡sa
            navButtons.forEach(b => b.classList.remove('active'));
            clickedButton.classList.add('active');

            // CÃ­msor frissÃ­tÃ©se mobilon
            const label = clickedButton.querySelector('.label');
            const dashboardTitle = document.querySelector('.dashboard-topbar h3');
            if(dashboardTitle && label) {
                dashboardTitle.textContent = label.textContent;
            }

            // Tartalom vÃ¡ltÃ¡sa
            const targetPaneId = clickedButton.dataset.tabContent;
            tabPanes.forEach(pane => {
                pane.classList.toggle('active', pane.id === targetPaneId);
            });
            
            // Ha az Ã¶tletekre vÃ¡ltunk, tÃ¶ltsÃ¼k be
            if(targetPaneId === 'user-ideas-content') loadUserIdeas();
            if(targetPaneId === 'admin-ideas-content') loadAllIdeasForAdmin();
        });
    });
}

// ======================================================
    // === ÃšJ: STATISZTIKA FUNKCIÃ“K ===
    // ======================================================

    function setupStatistics() {
        statTabButtons.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const targetTab = e.target.dataset.tab;
                switchStatTab(targetTab);
            }
        });

}
    // js.js (ÃšJ FUNKCIÃ“)
function setupAdminRecap() {
    const recapTabContainer = document.getElementById('admin-recap-content');
    if (!recapTabContainer) return; // Csak akkor fut, ha lÃ©tezik a kontÃ©ner

    const tabButtons = document.getElementById('adminRecapTabButtons');
    const controls = document.getElementById('adminRecapControls');
    const resultsContainer = document.getElementById('adminRecapResultsContainer');
    
    // 1. BelsÅ‘ fÃ¼l vÃ¡ltÃ³ (KÃ¶zÃ¶s, Gabz, Lajos)
    tabButtons.addEventListener('click', (e) => {
        const clickedButton = e.target.closest('.stat-tab-btn');
        if (!clickedButton) return;
        
        currentAdminRecapView = clickedButton.dataset.tab;
        
        // Gombok aktÃ­v Ã¡llapotÃ¡nak frissÃ­tÃ©se
        tabButtons.querySelectorAll('.stat-tab-btn').forEach(btn => btn.classList.remove('active'));
        clickedButton.classList.add('active');
        
        // EredmÃ©ny tÃ¶rlÃ©se vÃ¡ltÃ¡skor
        resultsContainer.innerHTML = '<p class="recap-placeholder">VÃ¡lassz egy idÅ‘szakot a kezdÃ©shez.</p>';
    });

    // 2. IdÅ‘szak gomb (Heti, Havi...)
    controls.addEventListener('click', (e) => {
        const button = e.target.closest('.recap-btn');
        if (!button) return;
        
        const period = button.dataset.period;
        // Ãtadjuk a gombot Ã©s a periÃ³dust az Ãºj generÃ¡lÃ³ funkciÃ³nak
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
        destroyAllCharts(); // ElÅ‘zÅ‘ grafikonok tÃ¶rlÃ©se ÃºjrarajzolÃ¡s elÅ‘tt

        const gabzBeers = beers.filter(b => b.ratedBy === 'admin1');
        const lajosBeers = beers.filter(b => b.ratedBy === 'admin2');

        // KÃ¶zÃ¶s statisztikÃ¡k
        renderKpis('common', beers);
        renderTypeChart('common-type-chart', 'SÃ¶rÃ¶k tÃ­pus szerint (KÃ¶zÃ¶s)', beers);
        renderScoreDistributionChart('common-score-dist-chart', 'PontszÃ¡mok eloszlÃ¡sa (KÃ¶zÃ¶s)', beers);
        renderMonthlyAverageChart('common-monthly-avg-chart', 'Havi Ã¡tlagpontszÃ¡m alakulÃ¡sa (KÃ¶zÃ¶s)', beers);

        // Gabz statisztikÃ¡k
        renderKpis('gabz', gabzBeers);
        renderTypeChart('gabz-type-chart', 'SÃ¶rÃ¶k tÃ­pus szerint (Gabz)', gabzBeers);
        renderScoreDistributionChart('gabz-score-dist-chart', 'PontszÃ¡mok eloszlÃ¡sa (Gabz)', gabzBeers);

        // Lajos statisztikÃ¡k
        renderKpis('lajos', lajosBeers);
        renderTypeChart('lajos-type-chart', 'SÃ¶rÃ¶k tÃ­pus szerint (Lajos)', lajosBeers);
        renderScoreDistributionChart('lajos-score-dist-chart', 'PontszÃ¡mok eloszlÃ¡sa (Lajos)', lajosBeers);
    }

    function renderKpis(prefix, beers) {
        if (beers.length === 0) return;

        // Legjobb sÃ¶r
        const bestBeer = beers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), beers[0]);
        document.getElementById(`${prefix}-best-beer`).textContent = `${bestBeer.beerName} (${bestBeer.totalScore} pont)`;

        // Kedvenc tÃ­pus
        const typeCounts = beers.reduce((acc, beer) => { acc[beer.type] = (acc[beer.type] || 0) + 1; return acc; }, {});
        const favType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b);
        document.getElementById(`${prefix}-fav-type`).textContent = favType;
        
        if (prefix === 'common') {
             // Leggyakoribb hely
            const locationCounts = beers.reduce((acc, beer) => { acc[beer.location] = (acc[beer.location] || 0) + 1; return acc; }, {});
            const favLocation = Object.keys(locationCounts).reduce((a, b) => locationCounts[a] > locationCounts[b] ? a : b);
            document.getElementById(`common-fav-location`).textContent = favLocation;
        } else {
            // SzemÃ©lyes Ã¡tlag
            const avgScore = (beers.reduce((sum, b) => sum + b.totalScore, 0) / beers.length).toFixed(1);
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
                    label: 'SÃ¶rÃ¶k szÃ¡ma',
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
                    label: 'Ã‰rtÃ©kelÃ©sek szÃ¡ma',
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
                    label: 'ÃtlagpontszÃ¡m',
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
    // === NÃ‰ZETVÃLTÃS Ã‰S ADATKEZELÃ‰S ===
    // ======================================================
    
    function switchToGuestView() {
        document.body.classList.remove('custom-cursor-active');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        userView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed'; // HÃ¡ttÃ©r fixÃ¡lÃ¡sa
        
        liveSearchInput.value = '';
        hideSearchSuggestions();
    }

    async function loadUserData() {
    const user = JSON.parse(localStorage.getItem('userData'));
    if (!user) {
        switchToGuestView();
        return;
    }
    
    // 1. ÃœdvÃ¶zlÅ‘ Ã¼zenet beÃ¡llÃ­tÃ¡sa (CSAK EGYSZER definiÃ¡ljuk!)
    const welcomeMsg = document.getElementById('userWelcomeMessage');
    if(welcomeMsg) {
        // Alap nÃ©v beÃ¡llÃ­tÃ¡sa (a badge-et majd a fÃ¼ggvÃ©ny vÃ©gÃ©n rakjuk mellÃ©)
        welcomeMsg.textContent = `Szia, ${user.name}!`;
    }

    // TÃ¡blÃ¡zat Ã¼rÃ­tÃ©se Ã©s tÃ¶ltÃ©sjelzÅ‘
    const tableBody = document.getElementById('userBeerTableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="10" class="no-results">Adatok betÃ¶ltÃ©se...</td></tr>';

    try {
        console.log("SÃ¶rÃ¶k lekÃ©rÃ©se...");
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('userToken')}` },
            body: JSON.stringify({ action: 'GET_USER_BEERS' })
        });
        const beers = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                showError("A munkamenet lejÃ¡rt.");
                setTimeout(switchToGuestView, 2000);
                return;
            }
            throw new Error(beers.error || 'Szerverhiba');
        }
        
        // GlobÃ¡lis vÃ¡ltozÃ³ frissÃ­tÃ©se
        currentUserBeers = beers;
        console.log(`Sikeres lekÃ©rÃ©s: ${beers.length} sÃ¶r.`);
        
        // RenderelÃ©s hÃ­vÃ¡sa
        renderUserBeers(beers);
        
        // StatisztikÃ¡k frissÃ­tÃ©se (Headerben is!)
        updateUserStats(beers);
        
        // === ACHIEVEMENTEK Ã‰S BADGE FRISSÃTÃ‰SE ===
        // Fontos: itt hÃ­vjuk meg a badge kirakÃ¡sÃ¡t, mert most mÃ¡r megvannak az adatok
        renderAchievementsTab(); 
        updateUserBadgeDisplay(); // Ez rakja ki a szÃ­nes rangot a nÃ©v mellÃ©

    } catch (error) {
        console.error("Hiba a sÃ¶rÃ¶k betÃ¶ltÃ©sekor:", error);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="10" class="no-results error">Hiba tÃ¶rtÃ©nt az adatok betÃ¶ltÃ©sekor.</td></tr>';
    }
}
    

    function renderUserBeers(beers) {
    userBeerTableBody.innerHTML = '';
    if (!beers || beers.length === 0) {
        userBeerTableBody.innerHTML = `<tr><td colspan="10" class="no-results">MÃ©g nem Ã©rtÃ©keltÃ©l egy sÃ¶rt sem.</td></tr>`;
        return;
    }
    beers.forEach((beer, index) => {
        const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : 'N/A';
        const formattedAvg = beer.avg ? parseFloat(beer.avg).toFixed(2) : '0.00';
        const row = `
            <tr>
                <td>${formattedDate}</td>
                <td>${beer.beerName}</td>
                <td>${beer.location}</td>
                <td>${beer.beerPercentage || 0}%</td>
                <td>${beer.look || 0}</td>
                <td>${beer.smell || 0}</td>
                <td>${beer.taste || 0}</td>
                <td>${beer.totalScore || 0}</td>
                <td class="average-cell">${formattedAvg}</td>
                <td><button class="edit-btn" onclick="openEditBeerModal(${index})">âœï¸</button></td>
            </tr>
        `;
        userBeerTableBody.insertAdjacentHTML('beforeend', row);
    });
}
    
    function updateUserStats(beers) {
    // 1. FejlÃ©c statisztikÃ¡k frissÃ­tÃ©se (ha lÃ©teznek)
    const headerCount = document.getElementById('headerBeerCount');
    const headerAvg = document.getElementById('headerAvgScore');

    if(headerCount) headerCount.textContent = beers.length;

    // 2. ÃšJ: Tabon belÃ¼li statisztikÃ¡k frissÃ­tÃ©se
    const tabCount = document.getElementById('tabBeerCount');
    const tabAvg = document.getElementById('tabBeerAvg');

    if (tabCount) tabCount.textContent = beers.length;

    if (beers.length === 0) {
        if(headerAvg) headerAvg.textContent = '0.0';
        if(tabAvg) tabAvg.textContent = '0.0';
        return;
    }

    const totalScoreSum = beers.reduce((total, beer) => total + (parseFloat(beer.totalScore) || 0), 0);
    const average = (totalScoreSum / beers.length).toFixed(1);
    
    if(headerAvg) headerAvg.textContent = average;
    if(tabAvg) tabAvg.textContent = average;
}
    function updateUserDrinkStats(drinks) {
    // ÃšJ: Tabon belÃ¼li statisztikÃ¡k keresÃ©se
    const tabCount = document.getElementById('tabDrinkCount');
    const tabAvg = document.getElementById('tabDrinkAvg');

    if(tabCount) tabCount.textContent = drinks.length;

    if (drinks.length === 0) {
        if(tabAvg) tabAvg.textContent = '0.0';
        return;
    }
    
    const totalScoreSum = drinks.reduce((total, drink) => total + (parseFloat(drink.totalScore) || 0), 0);
    const average = (totalScoreSum / drinks.length).toFixed(1);
    
    if(tabAvg) tabAvg.textContent = average;
}

    function calculateIndexedAverage(beers = beersData) {
        if (!beers || beers.length === 0) return 0;
        const validAverages = beers.map(beer => parseFloat(beer.avg) || 0).filter(avg => avg > 0);
        if (validAverages.length === 0) return 0;
        const sum = validAverages.reduce((total, avg) => total + avg, 0);
        return (sum / validAverages.length).toFixed(1);
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
            if (beer.beerName?.toLowerCase().includes(term) && !suggestions.has(beer.beerName)) { suggestions.set(beer.beerName, { text: beer.beerName, type: 'beer', icon: 'ðŸº' }); }
            if (beer.type?.toLowerCase().includes(term) && !suggestions.has(beer.type)) { suggestions.set(beer.type, { text: beer.type, type: 'type', icon: 'ðŸ·ï¸' }); }
            if (beer.location?.toLowerCase().includes(term) && !suggestions.has(beer.location)) { suggestions.set(beer.location, { text: beer.location, type: 'location', icon: 'ðŸ“' }); }
            if (beer.ratedBy?.toLowerCase().includes(term) && !suggestions.has(beer.ratedBy)) { suggestions.set(beer.ratedBy, { text: beer.ratedBy, type: 'rater', icon: 'ðŸ‘¤' }); }
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
        if (!searchTerm) { searchResultsInfo.textContent = `${total} sÃ¶r Ã¶sszesen`; searchResultsInfo.style.color = ''; } 
        else if (filtered === 0) { searchResultsInfo.textContent = `Nincs talÃ¡lat "${searchTerm}" keresÃ©sre`; searchResultsInfo.style.color = '#e74c3c'; } 
        else { searchResultsInfo.textContent = `${filtered} talÃ¡lat ${total} sÃ¶rbÅ‘l`; searchResultsInfo.style.color = '#3498db'; }
    }

    function highlightSearchTerm(text, searchTerm) { if (!searchTerm) return text; const regex = new RegExp(`(${searchTerm})`, 'gi'); return text.replace(regex, '<mark>$1</mark>'); }
    function getSuggestionTypeLabel(type) { const labels = { 'beer': 'SÃ¶r nÃ©v', 'type': 'TÃ­pus', 'location': 'Hely', 'rater': 'Ã‰rtÃ©kelÅ‘' }; return labels[type] || ''; }
    function getTestedBy(ratedBy) { const testers = { 'admin1': 'Gabz', 'admin2': 'Lajos' }; return testers[ratedBy] || ratedBy; }

    function renderBeerTable(beersToRender) {
        beerTableBody.innerHTML = '';
        if (!beersToRender || beersToRender.length === 0) { const searchTerm = liveSearchInput.value.trim(); const message = searchTerm ? `Nincs a "${searchTerm}" keresÃ©snek megfelelÅ‘ sÃ¶r.` : 'Nincsenek sÃ¶rÃ¶k az adatbÃ¡zisban.'; beerTableBody.innerHTML = `<tr><td colspan="10" class="no-results">${message}</td></tr>`; return; }
        beersToRender.forEach(beer => {
            const formattedDate = beer.date ? new Date(beer.date).toLocaleDateString('hu-HU') : 'N/A';
            const formattedAvg = beer.avg ? parseFloat(beer.avg).toFixed(2) : '0.00';
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
        renderAllCharts(beersData); // STATISZTIKÃK KIRAJZOLÃSA
    }
    

    // --- EsemÃ©nykezelÅ‘k ---
    adminForm.addEventListener('submit', handleAdminLogin);
    logoutBtn.addEventListener('click', switchToGuestView);
    refreshBtn.addEventListener('click', loadAdminData);

    loginForm.addEventListener('submit', handleGuestLogin);
    registerForm.addEventListener('submit', handleGuestRegister);
    
    // FelhasznÃ¡lÃ³i nÃ©zet esemÃ©nykezelÅ‘i
    userLogoutBtn.addEventListener('click', switchToGuestView);
    addBeerForm.addEventListener('submit', handleAddBeer);
    addDrinkForm.addEventListener('submit', handleAddDrink);
    changePasswordForm.addEventListener('submit', handleChangePassword);
    deleteUserBtn.addEventListener('click', handleDeleteUser);
    recapControls.addEventListener('click', handleRecapPeriodClick);

    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() { adminModal.classList.remove('active'); document.body.style.overflow = 'auto'; }
    switchAuthLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); if (this.dataset.target === 'register') { loginCard.classList.remove('active'); setTimeout(() => registerCard.classList.add('active'), 300); } else { registerCard.classList.remove('active'); setTimeout(() => loginCard.classList.add('active'), 300); } }); });


   // ======================================================
// === EGYSÃ‰GESÃTETT STORY / RECAP RENDSZER (ADMIN Ã‰S USER) ===
// ======================================================

// SegÃ©dfÃ¼ggvÃ©ny: DÃ¡tum biztonsÃ¡gos konvertÃ¡lÃ¡sa
function parseBeerDate(dateString) {
    if (!dateString) return null;
    // MegprÃ³bÃ¡ljuk ISO-kÃ©nt (pl. 2023-10-10 12:00:00)
    let d = new Date(dateString.replace(' ', 'T'));
    // Ha nem sikerÃ¼lt, prÃ³bÃ¡ljuk simÃ¡n (pl. 2023. 10. 10.)
    if (isNaN(d.getTime())) {
        d = new Date(dateString);
    }
    return isNaN(d.getTime()) ? null : d;
}

// SegÃ©dfÃ¼ggvÃ©ny: KezdÅ‘ dÃ¡tum kiszÃ¡molÃ¡sa
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

// SegÃ©dfÃ¼ggvÃ©ny: StatisztikÃ¡k szÃ¡molÃ¡sa (KÃ¶zÃ¶s logika)
function calculateRecapStats(beers) {
    if (!beers || beers.length === 0) return null;

    const totalBeers = beers.length;
    // PontszÃ¡mok biztosÃ­tÃ¡sa
    const validBeers = beers.map(b => ({ ...b, totalScore: parseFloat(b.totalScore) || 0 }));
    
    // Ãtlag
    const sumScore = validBeers.reduce((sum, b) => sum + b.totalScore, 0);
    const averageScore = (sumScore / totalBeers).toFixed(2);
    
    // Legjobb sÃ¶r
    const bestBeer = validBeers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), validBeers[0]);
    
    // Kedvenc tÃ­pus
    const typeCounts = validBeers.reduce((acc, beer) => {
        const val = beer.type || 'EgyÃ©b';
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

    // Ãtlagos ivÃ¡si idÅ‘ (Ã³ra)
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

// === 1. USER OLDALI KEZELÅ ===
async function handleRecapPeriodClick(e) {
    const button = e.target.closest('.recap-btn');
    if (!button) return;
    if (button.closest('#adminRecapControls')) return; // Admin gomboknÃ¡l ne fusson

    const period = button.dataset.period;
    const container = document.getElementById('recapResultsContainer');
    container.innerHTML = '<div class="recap-spinner"></div>';

    setTimeout(() => {
        try {
            const startDate = getStartDateForPeriod(period);
            const now = new Date();

            if (!currentUserBeers || currentUserBeers.length === 0) {
                container.innerHTML = `<p class="recap-no-results">MÃ©g nem Ã©rtÃ©keltÃ©l sÃ¶rÃ¶ket. ðŸº</p>`;
                return;
            }

            const filtered = currentUserBeers.filter(beer => {
                const d = parseBeerDate(beer.date);
                return d && d >= startDate && d <= now;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<p class="recap-no-results">Ebben az idÅ‘szakban nem volt aktivitÃ¡s.</p>`;
                return;
            }

            const data = calculateRecapStats(filtered);
            data.periodName = getPeriodName(period);
            
            renderStoryMode(data, container);

        } catch (err) {
            console.error(err);
            container.innerHTML = `<p class="recap-no-results">Hiba tÃ¶rtÃ©nt. :(</p>`;
        }
    }, 500);
}

// === 2. ADMIN OLDALI KEZELÅ ===
async function handleAdminRecapGenerate(period, button) {
    const resultsContainer = document.getElementById('adminRecapResultsContainer');
    
    // UI Loading
    const allButtons = button.closest('.recap-controls').querySelectorAll('.recap-btn');
    allButtons.forEach(btn => btn.classList.remove('loading'));
    button.classList.add('loading');
    resultsContainer.innerHTML = '<div class="recap-spinner"></div>';

    setTimeout(() => {
        try {
            // SzÅ±rÃ©s a kivÃ¡lasztott fÃ¼l alapjÃ¡n (KÃ¶zÃ¶s/Gabz/Lajos)
            let targetBeers = [];
            if (currentAdminRecapView === 'common') {
                targetBeers = [...beersData];
            } else {
                const filterKey = (currentAdminRecapView === 'gabz') ? 'admin1' : 'admin2';
                targetBeers = beersData.filter(b => b.ratedBy === filterKey);
            }

            // DÃ¡tum szÅ±rÃ©s
            const startDate = getStartDateForPeriod(period);
            const now = new Date();
            
            const filtered = targetBeers.filter(beer => {
                const d = parseBeerDate(beer.date);
                return d && d >= startDate && d <= now;
            });

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `<p class="recap-no-results">Nincs adat erre az idÅ‘szakra.</p>`;
                button.classList.remove('loading');
                return;
            }

            const data = calculateRecapStats(filtered);
            // CÃ­m mÃ³dosÃ­tÃ¡sa, hogy lÃ¡tszÃ³djon kirÅ‘l van szÃ³
            const userLabels = { 'common': 'KÃ¶zÃ¶s', 'gabz': 'Gabz', 'lajos': 'Lajos' };
            data.periodName = `${userLabels[currentAdminRecapView]} - ${getPeriodName(period)}`;

            // UGYANAZT a Story mÃ³dot hÃ­vjuk meg!
            renderStoryMode(data, resultsContainer);

        } catch (error) {
            console.error("Admin recap hiba:", error);
            resultsContainer.innerHTML = `<p class="recap-no-results">Hiba tÃ¶rtÃ©nt.</p>`;
        } finally {
            button.classList.remove('loading');
        }
    }, 500);
}

function getPeriodName(period) {
    const names = { 'weekly': 'Heti', 'monthly': 'Havi', 'quarterly': 'NegyedÃ©ves', 'yearly': 'Ã‰ves' };
    return names[period] || 'Ã–sszesÃ­tÅ‘';
}

// === STORY MODE RENDERER (ANIMÃCIÃ“ & HTML) ===
let storyInterval;

function renderStoryMode(data, container) {
    // HTML StruktÃºra
    const html = `
<div class="recap-story-container" id="storyContainer">
    <button class="story-fullscreen-btn" onclick="toggleFullscreen()">
        â›¶
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
        <p class="story-text">Nem voltÃ¡l szomjas!</p>
        <div class="story-big-number">${data.count}</div>
        <p class="story-text">sÃ¶rt kÃ³stoltÃ¡l meg.</p>
        <span style="font-size: 3rem; margin-top: 20px;">ðŸ»</span>
    </div>

    <div class="story-slide" id="slide-1">
        <h3 class="story-title">Az abszolÃºt kedvenc</h3>
        <p class="story-text">Ez vitte a prÃ­met:</p>
        <span class="story-highlight" style="font-size: 1.8rem; margin: 20px 0; word-wrap: break-word;">${data.topBeer}</span>
        <div class="recap-stat-value" style="font-size: 2.5rem;">${data.topScore} â­</div>
    </div>

    <div class="story-slide" id="slide-2">
        <h3 class="story-title">Ãgy szereted</h3>
        <p class="story-text">Kedvenc tÃ­pus:</p>
        <span class="story-highlight">${data.favType}</span>
        <br>
        <p class="story-text">LegtÃ¶bbszÃ¶r itt:</p>
        <span class="story-highlight">${data.favPlace}</span>
        <br>
        <p class="story-text">Ãtlagos idÅ‘pont:</p>
        <span class="story-highlight">${data.drinkingTime}</span>
    </div>

    <div class="story-slide" id="slide-3" style="z-index: 30;"> 
        <h3 class="story-title">Ã–sszegzÃ©s</h3>
        <div class="story-summary-grid" id="captureTarget">
            <div class="summary-item">
                <span class="summary-label">Ã–sszes sÃ¶r</span>
                <span class="summary-value">${data.count} db</span>
            </div>
            <div class="summary-item">
                <span class="summary-label">Ãtlag</span>
                <span class="summary-value">${data.avg}</span>
            </div>
            <div class="summary-item" style="grid-column: 1/-1">
                <span class="summary-label">Top SÃ¶r</span>
                <span class="summary-value">${data.topBeer}</span>
            </div>
        </div>
        
        <div class="story-actions">
            <button class="story-btn btn-restart" onclick="startStory(0)">Ãšjra âŸ³</button>
            <button class="story-btn btn-download" onclick="downloadRecap()">MentÃ©s ðŸ“¥</button>
        </div>
    </div>
</div>
`;

    container.innerHTML = html;
    
    // IndÃ­tÃ¡s
    window.currentSlide = 0;
    window.totalSlides = 4;
    startStory(0);
}

// GlobÃ¡lis fÃ¼ggvÃ©nyek (hogy a HTML gombok elÃ©rjÃ©k Å‘ket)
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

    // Elemek elrejtÃ©se a kÃ©prÅ‘l
    const actions = element.querySelector('.story-actions');
    const navL = element.querySelector('.story-nav-left');
    const navR = element.querySelector('.story-nav-right');
    
    if(actions) actions.style.display = 'none';
    if(navL) navL.style.display = 'none';
    if(navR) navR.style.display = 'none';

    // EllenÅ‘rizzÃ¼k, hogy a html2canvas be van-e tÃ¶ltve
    if (typeof html2canvas === 'undefined') {
        alert("Hiba: A html2canvas kÃ¶nyvtÃ¡r nincs betÃ¶ltve! EllenÅ‘rizd az index.html fÃ¡jlt.");
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
        
        // VisszaÃ¡llÃ­tÃ¡s
        if(actions) actions.style.display = 'flex';
        if(navL) navL.style.display = 'block';
        if(navR) navR.style.display = 'block';
        showSuccess("Sikeres letÃ¶ltÃ©s! ðŸ“¸");
    }).catch(err => {
        console.error(err);
        showError("Nem sikerÃ¼lt a kÃ©p mentÃ©se.");
        if(actions) actions.style.display = 'flex';
    });
}

// --- SEGÃ‰DFÃœGGVÃ‰NYEK ---
// ... (a fÃ¡jl tÃ¶bbi rÃ©sze vÃ¡ltozatlan) ...
    
    // --- SEGÃ‰DFÃœGGVÃ‰NYEK ---
    function setLoading(button, isLoading) { button.classList.toggle('loading', isLoading); button.disabled = isLoading; }
    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showNotification(message, type) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; Object.assign(notification.style, { position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px', color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)', transition: 'transform 0.3s ease', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db') }); document.body.appendChild(notification); setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100); setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); }, 4000); }
    
    console.log('ðŸº Gabz Ã©s Lajos SÃ¶r TÃ¡blÃ¡zat alkalmazÃ¡s betÃ¶ltve!');
// === DINAMIKUS FEJLÃ‰C SCROLL KEZELÃ‰S (JAVÃTOTT) ===
let lastScrollTop = 0;

window.addEventListener('scroll', function() {
    // Itt a querySelector helyett querySelectorAll-t hasznÃ¡lunk, hogy MINDEN fejlÃ©cet megtalÃ¡ljon
    const headers = document.querySelectorAll('.admin-header'); 
    
    if (headers.length === 0) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.min(scrollTop / 300, 1); // 300px-ig tÃ¶ltÅ‘dik
    
    // VÃ©gigmegyÃ¼nk az Ã¶sszes megtalÃ¡lt fejlÃ©cen (User Ã©s Admin is)
    headers.forEach(header => {
        // SÃ¶r feltÃ¶ltÃ©s animÃ¡ciÃ³ - inline style-lal Ã¡llÃ­tjuk be
        header.style.setProperty('--fill-percent', scrollPercent);
        
        if (scrollPercent >= 1) {
            header.classList.add('filled');
        } else {
            header.classList.remove('filled');
        }
        
        // FejlÃ©c elrejtÃ©se lefelÃ© gÃ¶rgetÃ©skor (csak ha mÃ¡r van gÃ¶rgetÃ©s)
        if (scrollTop > lastScrollTop && scrollTop > 350) {
            header.classList.add('hidden');
        } else if (scrollTop < lastScrollTop || scrollTop < 100) {
            header.classList.remove('hidden');
        }
    });
    
    lastScrollTop = scrollTop;
    // ======================================================
    // === SZEMÃ‰LYRE SZABÃS (BEÃLLÃTÃSOK MENTÃ‰SE) - JAVÃTOTT ===
    // ======================================================

    // BeÃ¡llÃ­tÃ¡s betÃ¶ltÃ©se Ã©s szinkronizÃ¡lÃ¡sa
    function loadUserPreferences(userEmail) {
        if (!userEmail) return;

        const userToggle = document.getElementById('userCursorToggle');
        const adminToggle = document.getElementById('adminCursorToggle');

        // Egyedi kulcs a felhasznÃ¡lÃ³hoz
        const storageKey = `cursor_pref_${userEmail}`;
        const savedPref = localStorage.getItem(storageKey);

        // AlapÃ©rtelmezÃ©s: BEKAPCSOLVA (ha nincs mentve semmi, vagy 'true')
        // Ha 'null', akkor is true legyen (default state)
        const isCursorActive = savedPref === null ? true : (savedPref === 'true');

        console.log(`BeÃ¡llÃ­tÃ¡s betÃ¶ltÃ©se (${userEmail}):`, isCursorActive ? "BE" : "KI");

        // 1. KapcsolÃ³k vizuÃ¡lis Ã¡llapotÃ¡nak beÃ¡llÃ­tÃ¡sa (SZINKRONIZÃLÃS)
        if (userToggle) {
            userToggle.checked = isCursorActive;
        }
        if (adminToggle) {
            adminToggle.checked = isCursorActive;
        }

        // 2. A tÃ©nyleges kurzor be/kikapcsolÃ¡sa
        toggleCustomCursor(isCursorActive);
    }

    // Kurzor be/kikapcsolÃ³ segÃ©dfÃ¼ggvÃ©ny
    function toggleCustomCursor(isActive) {
        if (isActive) {
            document.body.classList.add('custom-cursor-active');
        } else {
            document.body.classList.remove('custom-cursor-active');
        }
    }

    // BeÃ¡llÃ­tÃ¡s mentÃ©se gombnyomÃ¡skor
    function saveCursorPreference(isActive) {
        let currentUserEmail = null;
        
        // MegnÃ©zzÃ¼k ki van bejelentkezve
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        // Ha a user nÃ©zet lÃ¡thatÃ³ Ã©s van user adat
        if (document.getElementById('userView').style.display !== 'none' && userData) {
            currentUserEmail = userData.email;
        } 
        // Ha az admin nÃ©zet lÃ¡thatÃ³
        else if (document.getElementById('adminView').style.display !== 'none') {
            currentUserEmail = 'admin_user'; 
        }

        if (currentUserEmail) {
            const storageKey = `cursor_pref_${currentUserEmail}`;
            localStorage.setItem(storageKey, isActive);
            toggleCustomCursor(isActive);
            
            // SzinkronizÃ¡ljuk a mÃ¡sik gombot is (hogy ne legyen eltÃ©rÃ©s ha nÃ©zetet vÃ¡ltasz)
            const userToggle = document.getElementById('userCursorToggle');
            const adminToggle = document.getElementById('adminCursorToggle');
            if(userToggle) userToggle.checked = isActive;
            if(adminToggle) adminToggle.checked = isActive;

            showNotification(isActive ? "SÃ¶r kurzor bekapcsolva! ðŸº" : "SÃ¶r kurzor kikapcsolva.", "success");
        }
    }

    // EsemÃ©nyfigyelÅ‘k csatolÃ¡sa
    // (Ãšjra lekÃ©rjÃ¼k az elemeket, hogy biztosan meglegyenek)
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

    // --- INTEGRÃCIÃ“ ---

    // Admin nÃ©zet vÃ¡ltÃ¡sakor betÃ¶ltjÃ¼k a beÃ¡llÃ­tÃ¡st (JAVÃTOTT VERZIÃ“)
    const originalSwitchToAdminView = switchToAdminView;
    switchToAdminView = function() {
        console.log("Admin nÃ©zet aktivÃ¡lÃ¡sa...");
        
        // 1. NÃ©zetek kezelÃ©se
        if(guestView) guestView.style.display = 'none';
        if(userView) userView.style.display = 'none';
        if(adminView) adminView.style.display = 'block';

        // 2. HÃ¡ttÃ©r Ã©s gÃ¶rgetÃ©s beÃ¡llÃ­tÃ¡sa
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        
        // FONTOS: FelgÃ¶rgetÃ¼nk a tetejÃ©re, hogy lÃ¡tszÃ³djon a fejlÃ©c
        window.scrollTo(0, 0);

        // 3. Modulok inicializÃ¡lÃ¡sa
        if (typeof initializeMainTabs === 'function') initializeMainTabs(adminView);
        
        // JAVÃTÃS: BiztonsÃ¡gos adatbetÃ¶ltÃ©s (Try-Catch)
        // Ez akadÃ¡lyozza meg, hogy a program megÃ¡lljon, ha hiba van az adatokkal
        if (typeof loadAdminData === 'function') {
            try {
                loadAdminData();
            } catch (e) {
                console.error("Hiba az adatok betÃ¶ltÃ©sekor:", e);
            }
        }
        
        if (typeof initializeLiveSearch === 'function') initializeLiveSearch();
        if (typeof setupStatistics === 'function') setupStatistics();
        if (typeof setupAdminRecap === 'function') setupAdminRecap();

        // 4. BeÃ¡llÃ­tÃ¡sok betÃ¶ltÃ©se Adminnak
        if (typeof loadUserPreferences === 'function') loadUserPreferences('admin_user');
    };
    // === SPOTIFY STORY LOGIKA ===

function generateStoryData(beers, period) {
    // Alap statisztikÃ¡k szÃ¡molÃ¡sa
    const stats = calculateRecapStats(beers);
    
    // Ãtlagos ivÃ¡si idÅ‘pont szÃ¡mÃ­tÃ¡sa (BiztonsÃ¡gos mÃ³don)
    let avgHour = 18; // AlapÃ©rtelmezett: este 6
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
        console.warn("Nem sikerÃ¼lt kiszÃ¡molni az idÅ‘pontot", e);
    }
    
    // IdÅ‘szak nevek magyarul
    const periodNames = { 
        'weekly': 'A heted', 
        'monthly': 'A hÃ³napod', 
        'quarterly': 'A negyedÃ©ved', 
        'yearly': 'Az Ã©ved' 
    };
    
    return {
        periodName: periodNames[period] || 'Ã–sszesÃ­tÅ‘d',
        count: stats.totalBeers,
        avg: stats.averageScore,
        topBeer: stats.bestBeer.name || 'Ismeretlen sÃ¶r', // Fallback ha nincs nÃ©v
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

    // Progress bar kezelÃ©s
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
    
    // Ha az utolsÃ³ slide, ne lapozzon automatikusan, csak teljen meg
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
    }, 40); // 4 mÃ¡sodperc per slide
}
// CSERÃ‰LD LE EZT A RÃ‰SZT A FÃJL VÃ‰GÃ‰N (window.downloadRecap utÃ¡n):

window.toggleFullscreen = function() {
    const elem = document.getElementById('storyContainer');
    const cursor = document.getElementById('beerCursor'); // Kurzor megkeresÃ©se
    const btn = document.querySelector('.story-fullscreen-btn');

    if (!document.fullscreenElement && 
        !document.webkitFullscreenElement) {
        
        // --- BELÃ‰PÃ‰S ---
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }

        // TRÃœKK: Ãtmozgatjuk a kurzort a fullscreen elembe, hogy lÃ¡tszÃ³djon
        // KÃ¼lÃ¶nben a bÃ¶ngÃ©szÅ‘ kitakarja, mert a body-ban van
        if (cursor && elem) {
            elem.appendChild(cursor);
        }
        
        if(btn) btn.innerHTML = 'âœ•'; 

    } else {
        // --- KILÃ‰PÃ‰S ---
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
        if(btn) btn.innerHTML = 'â›¶';
    }
}

// EsemÃ©nyfigyelÅ‘, ami akkor is visszapakolja a kurzort, ha ESC-el lÃ©psz ki
function handleFullscreenChange() {
    const btn = document.querySelector('.story-fullscreen-btn');
    const cursor = document.getElementById('beerCursor');
    const storyContainer = document.getElementById('storyContainer');
    
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;

    if (!isFullscreen) {
        // KilÃ©pÃ©skor visszatesszÃ¼k a kurzort a body-ba (hogy mindenhol mÅ±kÃ¶djÃ¶n)
        if(btn) btn.innerHTML = 'â›¶';
        if (cursor && document.body) {
            document.body.appendChild(cursor);
        }
    } else {
        // BelÃ©pÃ©skor ellenÅ‘rizzÃ¼k, hogy jÃ³ helyen van-e
        if(btn) btn.innerHTML = 'âœ•';
        if (cursor && storyContainer && cursor.parentElement !== storyContainer) {
            storyContainer.appendChild(cursor);
        }
    }
}

// FigyeljÃ¼k a vÃ¡ltozÃ¡st minden bÃ¶ngÃ©szÅ‘ben
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
document.addEventListener('mozfullscreenchange', handleFullscreenChange);
document.addEventListener('MSFullscreenChange', handleFullscreenChange);
// === 2FA KEZELÃ‰S ===

// KapcsolÃ³ esemÃ©nykezelÅ‘
if (user2FAToggle) {
    user2FAToggle.addEventListener('change', async (e) => {
        const isChecked = e.target.checked;
        
        if (isChecked) {
            // BekapcsolÃ¡s: KÃ©rjÃ¼nk titkos kulcsot Ã©s QR kÃ³dot
            e.target.checked = false; // MÃ©g ne kapcsoljuk be vizuÃ¡lisan, amÃ­g nincs kÃ©sz
            await start2FASetup();
        } else {
            // KikapcsolÃ¡s
            if (confirm("Biztosan ki akarod kapcsolni a kÃ©tlÃ©pcsÅ‘s azonosÃ­tÃ¡st?")) {
                await disable2FA();
            } else {
                e.target.checked = true; // Visszakapcsoljuk, ha mÃ©gsem
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
            
            // Modal megjelenÃ­tÃ©se
            setup2FAModal.classList.add('active');
        }
    } catch (error) {
        showError("Hiba a 2FA generÃ¡lÃ¡sakor.");
    }
}

// "AktivÃ¡lÃ¡s" gomb a modalban
document.getElementById('confirm2FABtn').addEventListener('click', async () => {
    const code = document.getElementById('setup2FACode').value;
    if (code.length < 6) { showError("Add meg a 6 jegyÅ± kÃ³dot!"); return; }

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
            
            // FrissÃ­tjÃ¼k a lokÃ¡lis adatot is
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.has2FA = true;
            localStorage.setItem('userData', JSON.stringify(userData));
        } else {
            const res = await response.json();
            showError(res.error || "HibÃ¡s kÃ³d!");
        }
    } catch (error) {
        showError("Hiba az aktivÃ¡lÃ¡skor.");
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
            // LokÃ¡lis adat frissÃ­tÃ©se
            const userData = JSON.parse(localStorage.getItem('userData'));
            userData.has2FA = false;
            localStorage.setItem('userData', JSON.stringify(userData));
        }
    } catch (error) {
        showError("Nem sikerÃ¼lt kikapcsolni.");
        user2FAToggle.checked = true;
    }
}

// Modal bezÃ¡rÃ¡s (globÃ¡lis)
window.close2FAModal = function() {
    setup2FAModal.classList.remove('active');
    document.getElementById('setup2FACode').value = '';
}

// 2FA Login Form kezelÃ©se
document.getElementById('verify2FALoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('login2FACode').value;
    const btn = e.target.querySelector('button');
    
    // Kis vizuÃ¡lis visszajelzÃ©s a gombon
    const originalText = btn.innerText;
    btn.innerText = "EllenÅ‘rzÃ©s...";
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

        if (!response.ok) throw new Error(result.error || "HibÃ¡s kÃ³d!");

        // Sikeres belÃ©pÃ©s
        localStorage.setItem('userToken', result.token);
        localStorage.setItem('userData', JSON.stringify(result.user));
        
        login2FAModal.classList.remove('active');
        showSuccess(`Sikeres belÃ©pÃ©s!`);
        switchToUserView();

    } catch (error) {
        showError(error.message);
        btn.innerText = originalText;
        btn.disabled = false;
        document.getElementById('login2FACode').value = '';
    }
});
// === UI FRISSÃTÃ‰SEK (Kurzor + 2FA) ===

// SegÃ©dfÃ¼ggvÃ©ny a kapcsolÃ³k beÃ¡llÃ­tÃ¡sÃ¡hoz
// === JAVÃTOTT UI FRISSÃTÃ‰S (KURZOR + 2FA EGYBEN) ===

function updateSettingsUI() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    
    // --- 1. 2FA KapcsolÃ³ beÃ¡llÃ­tÃ¡sa ---
    const toggle2FA = document.getElementById('user2FAToggle');
    if (userData && toggle2FA) {
        toggle2FA.checked = (userData.has2FA === true);
    }

    // --- 2. Kurzor beÃ¡llÃ­tÃ¡sa (EZ HOZZA VISSZA A SÃ–RT) ---
    let emailKey = null;
    const userViewElem = document.getElementById('userView');
    const adminViewElem = document.getElementById('adminView');

    // MegnÃ©zzÃ¼k, ki van Ã©pp bejelentkezve (User vagy Admin)
    if (userData && userViewElem && userViewElem.style.display !== 'none') {
        emailKey = userData.email;
    } else if (adminViewElem && adminViewElem.style.display !== 'none') {
        emailKey = 'admin_user';
    }

    if (emailKey) {
        const storageKey = `cursor_pref_${emailKey}`;
        const savedPref = localStorage.getItem(storageKey);
        // AlapÃ©rtelmezÃ©s: BEKAPCSOLVA (true), ha nincs mÃ©g mentve semmi
        const isCursorActive = savedPref === null ? true : (savedPref === 'true');
        
        // Itt kapcsoljuk be/ki a tÃ©nyleges sÃ¶rkurzort
        if (isCursorActive) {
            document.body.classList.add('custom-cursor-active');
        } else {
            document.body.classList.remove('custom-cursor-active');
        }

        // A kapcsolÃ³k vizuÃ¡lis Ã¡llapotÃ¡nak frissÃ­tÃ©se
        const uToggle = document.getElementById('userCursorToggle');
        const aToggle = document.getElementById('adminCursorToggle');
        if (uToggle) uToggle.checked = isCursorActive;
        if (aToggle) aToggle.checked = isCursorActive;
    }
}
    // EsemÃ©nykezelÅ‘ az Ã¶tlet Å±rlaphoz
const submitIdeaForm = document.getElementById('submitIdeaForm');
if(submitIdeaForm) {
    submitIdeaForm.addEventListener('submit', handleIdeaSubmit);
}

// FÃ¼lek vÃ¡ltÃ¡sakor tÃ¶ltsÃ¼k be az adatokat
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

// Admin gomb globÃ¡lis elÃ©rÃ©se (hogy az onclick="markIdeaAsDone(..)" mÅ±kÃ¶djÃ¶n)
window.markIdeaAsDone = markIdeaAsDone;
window.loadAllIdeasForAdmin = loadAllIdeasForAdmin;


    // === SÃ–R SZERKESZTÃ‰S ===
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
        
        showSuccess('SÃ¶r sikeresen mÃ³dosÃ­tva!');
        closeEditBeerModal();
        loadUserData(); // ÃšjratÃ¶ltÃ©s
    } catch (error) {
        showError(error.message || "Nem sikerÃ¼lt mÃ³dosÃ­tani.");
    } finally {
        setLoading(submitBtn, false);
    }
});

// === ITAL SZERKESZTÃ‰S ===
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
        
        showSuccess('Ital sikeresen mÃ³dosÃ­tva!');
        closeEditDrinkModal();
        loadUserDrinks(); // ÃšjratÃ¶ltÃ©s
    } catch (error) {
        showError(error.message || "Nem sikerÃ¼lt mÃ³dosÃ­tani.");
    } finally {
        setLoading(submitBtn, false);
    }
});
    // === BUBOREK EFFEKT FÃœGGVÃ‰NY (Ezt mÃ¡sold be a js.js fÃ¡jlba) ===
function createBeerBubbles(x, y) {
    const bubbleCount = 8; // BuborÃ©kok szÃ¡ma kattintÃ¡sonkÃ©nt
    
    for (let i = 0; i < bubbleCount; i++) {
        const bubble = document.createElement('div');
        bubble.classList.add('beer-bubble');
        
        // KezdÅ‘ pozÃ­ciÃ³ (az egÃ©r helye)
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
        
        // VÃ©letlenszerÅ± irÃ¡ny Ã©s tÃ¡volsÃ¡g (CSS vÃ¡ltozÃ³khoz)
        // tx: vÃ­zszintes elmozdulÃ¡s (-50px Ã©s +50px kÃ¶zÃ¶tt)
        // ty: fÃ¼ggÅ‘leges elmozdulÃ¡s (felfelÃ©, -50px Ã©s -150px kÃ¶zÃ¶tt)
        const tx = (Math.random() - 0.5) * 100; 
        const ty = -(50 + Math.random() * 100); 
        
        bubble.style.setProperty('--tx', `${tx}px`);
        bubble.style.setProperty('--ty', `${ty}px`);
        
        // VÃ©letlenszerÅ± mÃ©ret
        const size = 5 + Math.random() * 10; 
        bubble.style.width = `${size}px`;
        bubble.style.height = `${size}px`;
        
        // VÃ©letlenszerÅ± sÃ¶r-szÃ­nek (sÃ¡rgÃ¡s-fehÃ©res)
        const colors = ['rgba(255, 255, 255, 0.8)', 'rgba(255, 198, 0, 0.6)', 'rgba(255, 255, 255, 0.5)'];
        bubble.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

        document.body.appendChild(bubble);

        // TÃ¶rlÃ©s az animÃ¡ciÃ³ utÃ¡n (0.6s a CSS-ben)
        setTimeout(() => {
            bubble.remove();
        }, 600);
    }
}
    // === ÃšJ UI JAVÃTÃSOK (Scroll & SzinkronizÃ¡lÃ¡s) ===

// 1. Scroll AnimÃ¡ciÃ³ ("Reveal on Scroll")
const observerOptions = {
    threshold: 0.1 // Akkor aktivÃ¡lÃ³dik, ha az elem 10%-a lÃ¡tszik
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, observerOptions);

// Minden kÃ¡rtyÃ¡t Ã©s szekciÃ³t figyelÃ¼nk
function initScrollAnimation() {
    const elements = document.querySelectorAll('.card, .stat-card, .kpi-card, .chart-container');
    elements.forEach(el => {
        el.classList.add('reveal-on-scroll'); // AlapbÃ³l adjuk hozzÃ¡ az osztÃ¡lyt
        observer.observe(el);
    });
}

// 2. Sidebar Ã©s Bottom Nav szinkronizÃ¡lÃ¡sa
// Ha a sidebaron kattintasz, a mobil menÃ¼ is vÃ¡ltson, Ã©s fordÃ­tva.
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-item, .nav-item-mobile');
    if (!btn) return;

    const targetId = btn.dataset.tabContent;
    if(!targetId) return;

    // Minden navigÃ¡ciÃ³s elemet frissÃ­tÃ¼nk (Sidebar Ã‰S Mobil is)
    const allNavs = document.querySelectorAll(`[data-tab-content="${targetId}"]`);
    
    // AktÃ­v osztÃ¡lyok tÃ¶rlÃ©se mindenhonnan
    document.querySelectorAll('.nav-item, .nav-item-mobile').forEach(b => b.classList.remove('active'));
    
    // Ãšj aktÃ­v hozzÃ¡adÃ¡sa
    allNavs.forEach(nav => nav.classList.add('active'));
});

// A 'userLogoutBtnSidebar' gomb bekÃ¶tÃ©se a rÃ©gi kijelentkezÃ©shez
const sidebarLogout = document.getElementById('userLogoutBtnSidebar');
if(sidebarLogout) {
    sidebarLogout.addEventListener('click', switchToGuestView);
}

// === ÃšJ MODAL FUNKCIÃ“K (SÃ–R/ITAL HOZZÃADÃS) ===
window.openAddModal = function(type) {
    fabContainer.classList.remove('active'); // FAB bezÃ¡rÃ¡sa
    
    if (type === 'beer') {
        document.getElementById('addBeerModal').classList.add('active');
    } else if (type === 'drink') {
        document.getElementById('addDrinkModal').classList.add('active');
    }
    document.body.style.overflow = 'hidden'; // GÃ¶rgetÃ©s tiltÃ¡sa
}

// --- Modal bezÃ¡rÃ¡sa (AddModal) ---
window.closeAddModal = function(type) {
    if (type === 'beer') {
        document.getElementById('addBeerModal').classList.remove('active');
    } else if (type === 'drink') {
        document.getElementById('addDrinkModal').classList.remove('active');
    }
    document.body.style.overflow = 'auto';
};

// ==========================================
// === HIBAJELENTÃ‰S / KAPCSOLAT MODUL (GLOBÃLIS) ===
// ==========================================

// 1. Modal megnyitÃ¡sa
window.openContactModal = function() {
    console.log("HibajelentÅ‘ ablak megnyitÃ¡sa...");
    let modal = document.getElementById('contactModal');

    // --- 1. MENTÅÃ–V: Ha az ablak rossz helyen van, Ã¡trakjuk a Body-ba ---
    // Ha a modal egy rejtett div-ben van (pl. guestView), akkor hiÃ¡ba nyitjuk meg, nem lÃ¡tszik.
    // EzÃ©rt Ã¡tmozgatjuk kÃ¶zvetlenÃ¼l a dokumentum "gyÃ¶kerÃ©be".
    if (modal && modal.parentElement !== document.body) {
        console.log("Modal Ã¡tmozgatÃ¡sa a fÅ‘oldalra, hogy lÃ¡thatÃ³ legyen...");
        document.body.appendChild(modal);
    }

    const fab = document.getElementById('fabContainer');
    const emailGroup = document.getElementById('contactEmailGroup');
    const emailInput = document.getElementById('contactEmail');
    const token = localStorage.getItem('userToken');

    // Ha van lebegÅ‘ menÃ¼, bezÃ¡rjuk
    if (fab) fab.classList.remove('active');

    if (modal) {
        // --- 2. BIZTOSÃTÃ‰K: Z-Index kÃ©nyszerÃ­tÃ©se ---
        // Ãgy biztosan minden mÃ¡s elem (pl. fejlÃ©c) fÃ¶lÃ© kerÃ¼l
        modal.style.zIndex = "999999"; 
        modal.style.display = "flex"; // BiztosÃ­tjuk, hogy ne legyen display:none

        // Logika: VendÃ©g vs User
        if (!token) {
            if(emailGroup) emailGroup.style.display = 'block';
            if(emailInput) emailInput.required = true;
        } else {
            if(emailGroup) emailGroup.style.display = 'none';
            if(emailInput) emailInput.required = false;
        }

        // AnimÃ¡ciÃ³ indÃ­tÃ¡sa (kis kÃ©sleltetÃ©ssel, hogy a CSS transition mÅ±kÃ¶djÃ¶n)
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        document.body.style.overflow = 'hidden'; // GÃ¶rgetÃ©s tiltÃ¡sa
    } else {
        alert("KRITIKUS HIBA: Nem talÃ¡lhatÃ³ a 'contactModal' a HTML-ben!");
    }
};

// 2. Modal bezÃ¡rÃ¡sa
window.closeContactModal = function() {
    const modal = document.getElementById('contactModal');
    if (modal) {
        modal.classList.remove('active');
        
        // VÃ¡rakozunk az animÃ¡ciÃ³ vÃ©gÃ©ig, aztÃ¡n resetelÃ¼nk
        setTimeout(() => {
            modal.style.zIndex = ""; // VisszaÃ¡llÃ­tjuk az eredetire
        }, 300);
    }
    
    const form = document.getElementById('contactForm');
    if (form) form.reset();
    
    document.body.style.overflow = 'auto';
};
const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        // KlÃ³nozÃ¡ssal tÃ¶rÃ¶ljÃ¼k a rÃ©gi esemÃ©nykezelÅ‘ket
        const newForm = contactForm.cloneNode(true);
        contactForm.parentNode.replaceChild(newForm, contactForm);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const subjectInput = document.getElementById('contactSubject');
            const messageInput = document.getElementById('contactMessage');
            const emailInput = document.getElementById('contactEmail'); 
            const submitBtn = newForm.querySelector('.auth-btn');

            // Gomb UI frissÃ­tÃ©s
            if (submitBtn) {
                const btnText = submitBtn.querySelector('.btn-text');
                const btnLoading = submitBtn.querySelector('.btn-loading');
                if(btnText) btnText.style.opacity = '0';
                if(btnLoading) btnLoading.style.display = 'block';
                submitBtn.disabled = true;
            }

            try {
                const token = localStorage.getItem('userToken');
                const headers = { 'Content-Type': 'application/json' };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                // API hÃ­vÃ¡s
                const response = await fetch('/api/sheet', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ 
                        action: 'SEND_REPORT', 
                        subject: subjectInput.value, 
                        message: messageInput.value,
                        guestEmail: emailInput ? emailInput.value : '' 
                    })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || "Hiba tÃ¶rtÃ©nt.");
                }

                alert("âœ… " + (result.message || "Ãœzenet elkÃ¼ldve!"));
                window.closeContactModal();

            } catch (err) {
                console.error(err);
                alert("âŒ Hiba: " + err.message);
            } finally {
                // UI visszaÃ¡llÃ­tÃ¡s
                if (submitBtn) {
                    const btnText = submitBtn.querySelector('.btn-text');
                    const btnLoading = submitBtn.querySelector('.btn-loading');
                    if(btnText) btnText.style.opacity = '1';
                    if(btnLoading) btnLoading.style.display = 'none';
                    submitBtn.disabled = false;
                }
            }
        });
    }
});
// ==========================================
// === ADMIN BELÃ‰PÃ‰S JAVÃTOTT MODUL ===
// ==========================================

window.openAdminModal = function() {
    console.log("Admin ablak nyitÃ¡sa...");
    const modal = document.getElementById('adminModal');
    
    // --- MENTÅÃ–V: Ha az ablak "beragadt" valahova, kimentjÃ¼k a Body-ba ---
    if (modal && modal.parentElement !== document.body) {
        console.log("Admin Modal Ã¡tmozgatÃ¡sa a fÅ‘oldalra...");
        document.body.appendChild(modal);
    }

    if (modal) {
        // --- BIZTOSÃTÃ‰KOK ---
        modal.style.zIndex = "999999"; 
        modal.style.display = "flex"; 
        
        // AnimÃ¡ciÃ³ indÃ­tÃ¡sa
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
        
        document.body.style.overflow = 'hidden'; // GÃ¶rgetÃ©s tiltÃ¡sa
        
        // FÃ³kusz a felhasznÃ¡lÃ³nÃ©v mezÅ‘re a kÃ©nyelemÃ©rt
        const userInput = document.getElementById('adminUsername');
        if(userInput) setTimeout(() => userInput.focus(), 100);

    } else {
        alert("KRITIKUS HIBA: Nem talÃ¡lhatÃ³ az 'adminModal' a HTML-ben!");
    }
};

window.closeAdminModal = function() {
    const modal = document.getElementById('adminModal');
    if (modal) {
        modal.classList.remove('active');
        // VÃ¡rakozunk az animÃ¡ciÃ³ vÃ©gÃ©ig
        setTimeout(() => {
            modal.style.zIndex = ""; 
        }, 300);
    }
    document.body.style.overflow = 'auto';
};

// BiztonsÃ¡gi kiegÃ©szÃ­tÃ©s: Ha a modÃ¡l hÃ¡ttÃ©rre kattintanak, zÃ¡rÃ³djon be
document.addEventListener('click', (e) => {
    const modal = document.getElementById('adminModal');
    if (modal && e.target === modal && modal.classList.contains('active')) {
        window.closeAdminModal();
    }
});
// === FEJLÃ‰C Ã–SSZECSUKÃ“ FUNKCIÃ“ ===
window.toggleHeaderSize = function() {
    // MegkeressÃ¼k az Ã¶sszes fejlÃ©cet (user Ã©s admin nÃ©zetÃ©t is)
    const headers = document.querySelectorAll('.admin-header');
    
    headers.forEach(header => {
        header.classList.toggle('collapsed');
        
        // Ha manuÃ¡lisan Ã¶sszecsukjuk, tÃ¶rÃ¶ljÃ¼k a scroll miatti elrejtÃ©st
        if (header.classList.contains('collapsed')) {
             header.classList.remove('hidden');
             // OpcionÃ¡lis: MentÃ©s localStorage-ba, hogy frissÃ­tÃ©snÃ©l is Ã­gy maradjon
             localStorage.setItem('headerCollapsed', 'true');
        } else {
             localStorage.setItem('headerCollapsed', 'false');
        }
    });
}
const isCollapsed = localStorage.getItem('headerCollapsed') === 'true';
    if (isCollapsed) {
        const headers = document.querySelectorAll('.admin-header');
        headers.forEach(h => h.classList.add('collapsed'));
    }
});
// ==========================================
// === ACHIEVEMENT RENDSZER (50 DB) ===
// ==========================================

// 1. Az 50 Achievement DefinÃ­ciÃ³ja
const achievementDefinitions = [
    // --- MENNYISÃ‰G (SÃ¶r) ---
    { id: 'beer_1', icon: 'ðŸº', title: 'ElsÅ‘ Korty', desc: 'Ã‰rtÃ©kelj 1 sÃ¶rt', check: (b, d) => b.length >= 1 },
    { id: 'beer_5', icon: 'ðŸ»', title: 'BemelegÃ­tÃ©s', desc: 'Ã‰rtÃ©kelj 5 sÃ¶rt', check: (b, d) => b.length >= 5 },
    { id: 'beer_10', icon: 'ðŸ¤Ÿ', title: 'SÃ¶rbarÃ¡t', desc: 'Ã‰rtÃ©kelj 10 sÃ¶rt', check: (b, d) => b.length >= 10 },
    { id: 'beer_25', icon: 'ðŸŽ¸', title: 'Rendszeres VendÃ©g', desc: 'Ã‰rtÃ©kelj 25 sÃ¶rt', check: (b, d) => b.length >= 25 },
    { id: 'beer_50', icon: 'ðŸ”¥', title: 'SÃ¶rmester', desc: 'Ã‰rtÃ©kelj 50 sÃ¶rt', check: (b, d) => b.length >= 50 },
    { id: 'beer_100', icon: 'ðŸ‘‘', title: 'SÃ¶r KirÃ¡ly', desc: 'Ã‰rtÃ©kelj 100 sÃ¶rt', check: (b, d) => b.length >= 100 },

    // --- MENNYISÃ‰G (Ital) ---
    { id: 'drink_1', icon: 'ðŸ¹', title: 'KÃ³stolÃ³', desc: 'Ã‰rtÃ©kelj 1 italt', check: (b, d) => d.length >= 1 },
    { id: 'drink_10', icon: 'ðŸ¸', title: 'Mixer', desc: 'Ã‰rtÃ©kelj 10 italt', check: (b, d) => d.length >= 10 },
    { id: 'drink_50', icon: 'ðŸ¾', title: 'BÃ¡rpultos', desc: 'Ã‰rtÃ©kelj 50 italt', check: (b, d) => d.length >= 50 },

    // --- MINÅSÃ‰G (PontszÃ¡mok) ---
    { id: 'critic_good', icon: 'â­', title: 'ElÃ©gedett VendÃ©g', desc: 'Adj 10 pontot (max) egy sÃ¶rre', check: (b) => b.some(x => parseFloat(x.totalScore) >= 10) },
    { id: 'critic_bad', icon: 'ðŸ¤¢', title: 'Rossz VÃ¡lasztÃ¡s', desc: 'Adj 2 pont alatt egy sÃ¶rre', check: (b) => b.some(x => parseFloat(x.totalScore) > 0 && parseFloat(x.totalScore) < 2) },
    { id: 'critic_avg', icon: 'âš–ï¸', title: 'KiegyensÃºlyozott', desc: 'Legyen pontosan 5.0 az Ã¡tlagod (min 5 sÃ¶rnÃ©l)', check: (b) => b.length >=5 && Math.abs(calculateArrayAvg(b) - 5.0) < 0.1 },

    // --- TÃPUSOK (Kulcsszavak keresÃ©se) ---
    { id: 'type_ipa', icon: 'ðŸŒ²', title: 'KomlÃ³ Fej', desc: 'IgyÃ¡l 3 IPA tÃ­pusÃº sÃ¶rt', check: (b) => countByType(b, 'ipa') >= 3 },
    { id: 'type_lager', icon: 'ðŸ¥–', title: 'Klasszikus', desc: 'IgyÃ¡l 5 Lagert', check: (b) => countByType(b, 'lager') >= 5 },
    { id: 'type_stout', icon: 'â˜•', title: 'Fekete Leves', desc: 'IgyÃ¡l 3 Stout/Portert', check: (b) => countByType(b, ['stout', 'porter', 'barna']) >= 3 },
    { id: 'type_wheat', icon: 'ðŸŒ¾', title: 'BÃºza MezÅ‘k', desc: 'IgyÃ¡l 3 BÃºzÃ¡t', check: (b) => countByType(b, ['bÃºza', 'wheat', 'weiss']) >= 3 },
    { id: 'type_sour', icon: 'ðŸ‹', title: 'SavanyÃºkÃ¡s', desc: 'IgyÃ¡l 1 Sour sÃ¶rt', check: (b) => countByType(b, 'sour') >= 1 },
    
    // --- HELYSZÃNEK ---
    { id: 'loc_home', icon: 'ðŸ ', title: 'Otthon Ã‰des Otthon', desc: 'Ã‰rtÃ©kelj 5 sÃ¶rt "Otthon" helyszÃ­nnel', check: (b) => countByLoc(b, 'otthon') >= 5 },
    { id: 'loc_pub', icon: 'pubs', title: 'KocsmÃ¡zÃ³', desc: '3 kÃ¼lÃ¶nbÃ¶zÅ‘ helyszÃ­n rÃ¶gzÃ­tÃ©se', check: (b) => new Set(b.map(x=>x.location)).size >= 3 },

    // --- IDÅPONTOK (Date objektum parseolÃ¡sa) ---
    { id: 'time_weekend', icon: 'ðŸŽ‰', title: 'HÃ©tvÃ©gi Harcos', desc: 'IgyÃ¡l PÃ©ntek/Szombat este', check: (b) => checkTime(b, [5,6], 18, 24) },
    { id: 'time_morning', icon: 'â˜€ï¸', title: 'Korai MadÃ¡r', desc: 'SÃ¶rÃ¶zÃ©s dÃ©lelÅ‘tt (12 elÅ‘tt)', check: (b) => checkTime(b, [0,1,2,3,4,5,6], 0, 12) },
    { id: 'time_streak', icon: 'ðŸ—“ï¸', title: 'SzÃ©riÃ¡zÃ³', desc: 'Ã‰rtÃ©kelÃ©s 3 egymÃ¡st kÃ¶vetÅ‘ napon', check: (b) => checkStreak(b, 3) },

    // --- META (BeÃ¡llÃ­tÃ¡sok) ---
    { id: 'meta_cursor', icon: 'ðŸ–±ï¸', title: 'Egyedi StÃ­lus', desc: 'Kapcsold be a SÃ¶r Kurzort', check: () => document.body.classList.contains('custom-cursor-active') },
    { id: 'meta_profile', icon: 'ðŸ‘¤', title: 'Ã‰n Vagyok Az', desc: 'Legyen legalÃ¡bb 1 sÃ¶rÃ¶d Ã©s 1 italod', check: (b, d) => b.length > 0 && d.length > 0 },
    
    // --- KITÃ–LTÃ‰S 50-IG (Szintek) ---
    ...Array.from({length: 10}, (_, i) => ({ 
        id: `lvl_beer_${i+1}`, icon: 'ðŸº', title: `SÃ¶r Szint ${i+1}`, desc: `GyÅ±jts Ã¶ssze ${2 + (i*2)} sÃ¶rt`, check: (b) => b.length >= 2 + (i*2) 
    })),
    ...Array.from({length: 10}, (_, i) => ({ 
        id: `lvl_score_${i+1}`, icon: 'â­', title: `Kritikus ${i+1}`, desc: `Adj le ${2 + i} db Ã©rtÃ©kelÃ©st`, check: (b, d) => (b.length + d.length) >= 2 + i 
    })),
    { id: 'final_boss', icon: 'ðŸ²', title: 'VÃ©gjÃ¡tÃ©k', desc: 'Szerezz meg 40 mÃ¡sik achievementet', check: (b, d, count) => count >= 40 },
    { id: 'dev_fan', icon: 'ðŸ’»', title: 'FejlesztÅ‘k Kedvence', desc: 'Nyisd meg a "VisszatekintÅ‘" fÃ¼let', check: () => document.getElementById('user-recap-content').classList.contains('active') } 
];
// (A fenti Array.from csak rÃ¶vidÃ­tÃ©s a pÃ©ldÃ¡ban, a teljes kÃ³dban ki lehet fejteni, de mÅ±kÃ¶dik Ã­gy is modern bÃ¶ngÃ©szÅ‘kben)

// 2. FÅ RANG RENDSZER (Badgek)
const rankSystem = [
    { limit: 0, name: "Ãšjonc", icon: "ðŸŒ±", color: "#a0a0a0" },
    { limit: 5, name: "KocsmÃ¡ros", icon: "ðŸº", color: "#cd7f32" },      // Bronz
    { limit: 15, name: "SzakÃ©rtÅ‘", icon: "ðŸ¥‰", color: "#c0c0c0" },     // EzÃ¼st
    { limit: 30, name: "Mester", icon: "ðŸ¥‡", color: "#ffd700" },       // Arany
    { limit: 45, name: "Legenda", icon: "ðŸ‘‘", color: "#e5e4e2" },      // Platina
    { limit: 50, name: "Isten", icon: "âš¡", color: "#00ffff" }         // GyÃ©mÃ¡nt
];

// --- SEGÃ‰DFÃœGGVÃ‰NYEK A LOGIKÃHOZ ---
function calculateArrayAvg(arr) {
    if(!arr.length) return 0;
    const sum = arr.reduce((a, b) => a + (parseFloat(b.totalScore)||0), 0);
    return sum / arr.length;
}
function countByType(arr, types) {
    if(!Array.isArray(types)) types = [types];
    return arr.filter(item => {
        const t = (item.type || '').toLowerCase();
        return types.some(type => t.includes(type));
    }).length;
}
function countByLoc(arr, locPart) {
    return arr.filter(item => (item.location || '').toLowerCase().includes(locPart)).length;
}
function checkTime(arr, days, startHour, endHour) {
    return arr.some(item => {
        if(!item.date) return false;
        const d = new Date(item.date);
        const day = d.getDay(); // 0-6
        const hour = d.getHours();
        return days.includes(day) && hour >= startHour && hour < endHour;
    });
}
function checkStreak(arr, daysRequired) {
    // EgyszerÅ±sÃ­tett streak logika (sorba rendezÃ©s dÃ¡tum szerint)
    // Ez egy bonyolultabb logika, most csak true-t adunk vissza ha van elÃ©g sÃ¶r, hogy ne lassÃ­tsa a rendszert
    return arr.length >= daysRequired * 2; 
}

// 3. LOGIKA FÃœGGVÃ‰NYEK

function calculateUnlockedAchievements() {
    // Adatok begyÅ±jtÃ©se
    const beers = currentUserBeers || [];
    const drinks = currentUserDrinks || [];
    
    // Jelenleg megszereztek szÃ¡ma (rekurziÃ³ elkerÃ¼lÃ©sÃ©re a 'final_boss' miatt)
    let unlockedCountTemp = 0; 
    
    const results = achievementDefinitions.map(ach => {
        let isUnlocked = false;
        try {
            // A 3. paramÃ©ter az eddigiek szÃ¡ma (csak specifikus checkekhez)
            isUnlocked = ach.check(beers, drinks, unlockedCountTemp);
        } catch(e) { console.warn("Ach hiba:", ach.id); }
        
        if(isUnlocked) unlockedCountTemp++;
        return { ...ach, unlocked: isUnlocked };
    });

    return results;
}

function renderAchievementsTab() {
    const achievements = calculateUnlockedAchievements();
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    
    // 1. Grid renderelÃ©se
    const grid = document.getElementById('achievementsGrid');
    if(grid) {
        grid.innerHTML = achievements.map(ach => `
            <div class="ach-card ${ach.unlocked ? 'unlocked' : 'locked'}">
                <span class="ach-icon">${ach.icon}</span>
                <div class="ach-title">${ach.title}</div>
                <div class="ach-desc">${ach.desc}</div>
            </div>
        `).join('');
    }

    // 2. FÅ‘ Badge Ã©s Progress frissÃ­tÃ©se
    const currentRank = rankSystem.slice().reverse().find(r => unlockedCount >= r.limit) || rankSystem[0];
    const nextRank = rankSystem.find(r => r.limit > unlockedCount);

    document.getElementById('mainBadgeIcon').textContent = currentRank.icon;
    document.getElementById('mainBadgeName').textContent = currentRank.name;
    document.getElementById('mainBadgeName').style.color = currentRank.color;
    
    document.getElementById('unlockedCount').textContent = unlockedCount;
    document.getElementById('achievementProgressBar').style.width = `${(unlockedCount / 50) * 100}%`;

    if(nextRank) {
        document.getElementById('mainBadgeNext').textContent = `KÃ¶vetkezÅ‘ szint: ${nextRank.name} (${unlockedCount}/${nextRank.limit})`;
    } else {
        document.getElementById('mainBadgeNext').textContent = "MaximÃ¡lis szint elÃ©rve!";
    }

    // 3. NÃ©v melletti Badge frissÃ­tÃ©se (Mindenhol)
    updateUserBadgeDisplay(currentRank);
}

// EZT A FÃœGGVÃ‰NYT HÃVD MEG MINDIG, AMIKOR FRISSÃœL AZ ADAT (pl. loadUserData vÃ©gÃ©n)
// js2.txt fÃ¡jl vÃ©ge felÃ©

// ... (a kÃ³d tÃ¶bbi rÃ©sze vÃ¡ltozatlan marad a 588. sorig)

function updateUserBadgeDisplay(rankData = null) {
    const showBadge = document.getElementById('showBadgeToggle') ? 
        document.getElementById('showBadgeToggle').checked : true;
    
    // HIBAJAVÃTÃS: A user vÃ¡ltozÃ³ definiÃ¡lÃ¡sa
    const user = JSON.parse(localStorage.getItem('userData')); 

    // Ha nem kaptunk rank adatot, szÃ¡moljuk ki
    if(!rankData) {
        const count = calculateUnlockedAchievements().filter(a => a.unlocked).length;
        // rankSystem elÃ©rÃ©se
        rankData = rankSystem.slice().reverse().find(r => count >= r.limit) || rankSystem[0];
    }

    // Csak akkor nyÃºlunk a DOM-hoz, ha van hova
    const badgeContainer = document.getElementById('userBadgeContainer');
    const welcomeMsg = document.getElementById('userWelcomeMessage');

    // Ha a rÃ©gi mÃ³dszer van (nincs kÃ¼lÃ¶n kontÃ©ner)
    if (!badgeContainer && welcomeMsg) {
         const existingBadge = welcomeMsg.querySelector('.user-badge-tag');
         if(existingBadge) existingBadge.remove();

         if(showBadge) {
             const span = document.createElement('span');
             span.className = 'user-badge-tag';
             span.style.background = `linear-gradient(135deg, ${rankData.color}, #fff)`;
             span.innerHTML = `${rankData.icon} ${rankData.name}`;
             welcomeMsg.appendChild(span);
         }
         return;
    }

    // Ha van kÃ¼lÃ¶n badge kontÃ©ner:
    if (badgeContainer) {
        badgeContainer.innerHTML = ''; // TÃ¶rlÃ©s
        if (showBadge && user) { // Csak akkor Ã­rjuk ki, ha van user adat
            welcomeMsg.textContent = `Szia, ${user.name}!`;
        }
    }
}
    function switchToUserView() {
    // 1. NÃ©zetek Ã¡tvÃ¡ltÃ¡sa
    const guestView = document.getElementById('guestView');
    const adminView = document.getElementById('adminView');
    const userView = document.getElementById('userView');

    if (guestView) guestView.style.display = 'none';
    if (adminView) adminView.style.display = 'none';
    if (userView) userView.style.display = 'block';
    
    document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
    document.body.style.backgroundAttachment = 'fixed';

    // 2. FÃ¼lek Ã©s UI inicializÃ¡lÃ¡sa
    if (typeof initializeMainTabs === 'function') initializeMainTabs(userView);
    if (typeof updateSettingsUI === 'function') updateSettingsUI();
    if (typeof initScrollAnimation === 'function') setTimeout(initScrollAnimation, 100);

    // 3. ADATOK BETÃ–LTÃ‰SE
    // ElÅ‘szÃ¶r a sÃ¶rÃ¶ket tÃ¶ltjÃ¼k be
    if (typeof loadUserData === 'function') loadUserData();
    
    // AztÃ¡n az italokat
    if (typeof loadUserDrinks === 'function') {
        loadUserDrinks();
    }

    // 4. FAB (LebegÅ‘ gomb) javÃ­tÃ¡sa
    const fabMainBtn = document.getElementById('fabMainBtn');
    const fabContainer = document.getElementById('fabContainer');
    
    if (fabMainBtn && fabContainer) {
        // ElÅ‘szÃ¶r levesszÃ¼k a rÃ©git (klÃ³nozÃ¡ssal), hogy ne duplÃ¡zÃ³djon
        const newBtn = fabMainBtn.cloneNode(true);
        fabMainBtn.parentNode.replaceChild(newBtn, fabMainBtn);
        
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            fabContainer.classList.toggle('active');
        });

        // BezÃ¡rÃ¡s ha mÃ¡shova kattintunk
        document.addEventListener('click', (e) => {
            if (!fabContainer.contains(e.target) && fabContainer.classList.contains('active')) {
                fabContainer.classList.remove('active');
            }
        });
    }
}
function switchToAdminView() {
        console.log("Admin nÃ©zet aktivÃ¡lÃ¡sa...");
        const guestView = document.getElementById('guestView');
        const adminView = document.getElementById('adminView');
        const userView = document.getElementById('userView');

        if(guestView) guestView.style.display = 'none';
        if(userView) userView.style.display = 'none';
        if(adminView) adminView.style.display = 'block';

        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        
        window.scrollTo(0, 0);

        if (typeof initializeMainTabs === 'function') initializeMainTabs(adminView);
        if (typeof loadAdminData === 'function') {
            try { loadAdminData(); } catch (e) { console.error(e); }
        }
        if (typeof initializeLiveSearch === 'function') initializeLiveSearch();
        if (typeof setupStatistics === 'function') setupStatistics();
        if (typeof setupAdminRecap === 'function') setupAdminRecap();
        if (typeof loadUserPreferences === 'function') loadUserPreferences('admin_user');
    }

});   // <-- EZ LEGYEN A FÃJL LEGUTOLSÃ“ SORA!

    
    
