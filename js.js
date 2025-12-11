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
        // requestAnimationFrame a simább mozgásért
        requestAnimationFrame(() => {
            // Elmentjük az aktuális egér pozíciót a stílusba (CSS változóként is lehetne, de így közvetlenebb)
            // Viszont a transform felülírása miatt a rotate-et is mindig bele kell írnunk.
            // Ezért egyszerűbb, ha globális változókban tároljuk az X, Y-t.
            window.mouseX = e.clientX;
            window.mouseY = e.clientY;
            updateCursorPosition(e.clientX, e.clientY);
        });
    });

    // 2. GÖRGETÉS EFFEKT (IVÁS / DŐLÉS)
    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('custom-cursor-active')) return;

        const scrollTop = window.scrollY;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        let scrollPercent = scrollTop / docHeight; // 0-tól 1-ig megy

        // Matek:
        // 0% görgetésnél (fent): -15 fok (kicsit dől)
        // 100% görgetésnél (lent): -70 fok (nagyon dől, mintha innád)
        const startAngle = -15;
        const endAngle = -70; 
        
        // Kiszámoljuk az új szöget
        currentScrollRotate = startAngle + (scrollPercent * (endAngle - startAngle));

        // Frissítjük a kurzort az új szöggel (ha épp nem mozdul az egér, akkor is látszódjon)
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
    const userBeerTableBody = document.getElementById('userBeerTableBody');
    const userWelcomeMessage = document.getElementById('userWelcomeMessage');
    const changePasswordForm = document.getElementById('changePasswordForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    const recapControls = document.getElementById('recapControls');
    const recapResultsContainer = document.getElementById('recapResultsContainer');
    
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

    // ======================================================
    // === FŐ FUNKCIÓK (SZERVER KOMMUNIKÁCIÓ) ===
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

            beersData = result.beers || [];
            usersData = result.users || [];
            filteredBeers = [...beersData]; 
            
            showSuccess('Sikeres Gabz és Lajos bejelentkezés!');
            setTimeout(() => {
                closeAdminModal();
                switchToAdminView();
            }, 1000);

        } catch (error) {
            console.error("Bejelentkezési hiba:", error);
            showError(error.message || 'Hibás felhasználónév vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
        }
    }
    
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
        loadUserData();
    } catch (error) {
        console.error("Hiba sör hozzáadásakor:", error);
        showError(error.message || "Nem sikerült a sört hozzáadni.");
    } finally {
        setLoading(submitBtn, false);
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

        if (password !== passwordConfirm) {
            showError("A két jelszó nem egyezik!");
            return;
        }
        if (!termsAccepted) {
            showError("A regisztrációhoz el kell fogadnod az Adatvédelmi Tájékoztatót!");
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

            showSuccess('Sikeres regisztráció! Most már bejelentkezhetsz.');
            registerCard.classList.remove('active');
            setTimeout(() => loginCard.classList.add('active'), 300);

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
            
            localStorage.setItem('userToken', result.token);
            localStorage.setItem('userData', JSON.stringify(result.user));

            showSuccess(`Sikeres bejelentkezés, ${result.user.name}!`);
            setTimeout(switchToUserView, 1000);
        } catch (error) {
            console.error("Bejelentkezési hiba:", error);
            showError(error.message || 'Hibás e-mail cím vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
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

    async function handleDeleteUser() {
        const confirmation = prompt("Biztosan törölni szeretnéd a fiókodat? Ez végleges és nem vonható vissza. Ha biztos vagy, írd be ide: TÖRLÉS");
        if (confirmation !== "TÖRLÉS") {
            showNotification("Fiók törlése megszakítva.", "info");
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

            showSuccess("A fiókodat sikeresen töröltük. Viszlát!");
            setTimeout(switchToGuestView, 2000);

        } catch (error) {
            showError(error.message || "A fiók törlése nem sikerült.");
        }
    }



    // ======================================================
    // === ÚJ: FŐ NAVIGÁCIÓS FÜLEK KEZELÉSE ===
    // ======================================================

    function initializeMainTabs(viewElement) {
        const tabsContainer = viewElement.querySelector('.main-tabs');
        if (!tabsContainer) return; // Nincs is fül ezen a nézeten

        const tabButtons = tabsContainer.querySelectorAll('.main-tab-btn');
        const tabPanes = viewElement.querySelectorAll('.main-tab-pane');

        tabsContainer.addEventListener('click', (e) => {
            const clickedButton = e.target.closest('.main-tab-btn');
            if (!clickedButton) return;

            // Gombok állapotának frissítése
            tabButtons.forEach(btn => btn.classList.remove('active'));
            clickedButton.classList.add('active');

            // Tartalmi panelek frissítése
            const targetPaneId = clickedButton.dataset.tabContent;
            tabPanes.forEach(pane => {
                pane.classList.toggle('active', pane.id === targetPaneId);
            });
        });
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

    function switchToUserView() {
        document.body.classList.add('custom-cursor-active');
        guestView.style.display = 'none';
        adminView.style.display = 'none';
        userView.style.display = 'block';
        document.body.style.background = '#f8fafc';

        // Fő fülek inicializálása a felhasználói nézeten
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed'; // Háttér fixálása

        // Fő fülek inicializálása a felhasználói nézeten
        initializeMainTabs(userView);

        loadUserData();
    }
    function switchToGuestView() {
        document.body.classList.remove('custom-cursor-active');
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        userView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed'; // Háttér fixálása
        
        liveSearchInput.value = '';
        hideSearchSuggestions();
    }

    async function loadUserData() {
    const user = JSON.parse(localStorage.getItem('userData'));
    if (!user) {
        showError('Nem vagy bejelentkezve.');
        switchToGuestView();
        return;
    }
    userWelcomeMessage.textContent = `Szia, ${user.name}!`;
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
        
        currentUserBeers = beers; // <--- ITT MENTJÜK EL GLOBÁLISAN
        
        renderUserBeers(beers);
        updateUserStats(beers);
    } catch (error) {
        console.error("Hiba a felhasználói adatok betöltésekor:", error);
        showError(error.message || "Nem sikerült betölteni a söreidet.");
    }
}

    function renderUserBeers(beers) {
    userBeerTableBody.innerHTML = '';
    if (!beers || beers.length === 0) {
        userBeerTableBody.innerHTML = `<tr><td colspan="9" class="no-results">Még nem értékeltél egy sört sem.</td></tr>`;
        return;
    }
    beers.forEach(beer => {
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
            </tr>
        `;
        userBeerTableBody.insertAdjacentHTML('beforeend', row);
    });
}
    
    function updateUserStats(beers) {
        document.getElementById('userBeerCount').textContent = beers.length;
        if (beers.length === 0) {
            document.getElementById('userAverageScore').textContent = '0.0';
            return;
        }
        const totalScoreSum = beers.reduce((total, beer) => total + (parseFloat(beer.totalScore) || 0), 0);
        const average = (totalScoreSum / beers.length).toFixed(1);
        document.getElementById('userAverageScore').textContent = average;
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
    adminForm.addEventListener('submit', handleAdminLogin);
    logoutBtn.addEventListener('click', switchToGuestView);
    refreshBtn.addEventListener('click', loadAdminData);

    loginForm.addEventListener('submit', handleGuestLogin);
    registerForm.addEventListener('submit', handleGuestRegister);
    
    // Felhasználói nézet eseménykezelői
    userLogoutBtn.addEventListener('click', switchToGuestView);
    addBeerForm.addEventListener('submit', handleAddBeer);
    changePasswordForm.addEventListener('submit', handleChangePassword);
    deleteUserBtn.addEventListener('click', handleDeleteUser);
    recapControls.addEventListener('click', handleRecapPeriodClick);

    adminBtn.addEventListener('click', () => { adminModal.classList.add('active'); document.body.style.overflow = 'hidden'; });
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

// Segédfüggvény: Bővített statisztikák számolása (15 slide-hoz)
function calculateRecapStats(beers) {
    if (!beers || beers.length === 0) return null;

    const totalBeers = beers.length;
    // Adattisztítás
    const validBeers = beers.map(b => ({
        ...b,
        totalScore: parseFloat(b.totalScore) || 0,
        beerPercentage: parseFloat(b.beerPercentage) || 0
    }));
    
    // 1. Átlag pontszám
    const sumScore = validBeers.reduce((sum, b) => sum + b.totalScore, 0);
    const averageScore = (sumScore / totalBeers).toFixed(2);
    
    // 2. Legjobb és Legrosszabb
    const bestBeer = validBeers.reduce((max, beer) => (beer.totalScore > max.totalScore ? beer : max), validBeers[0]);
    const worstBeer = validBeers.reduce((min, beer) => (beer.totalScore < min.totalScore ? beer : min), validBeers[0]);
    const strongestBeer = validBeers.reduce((max, beer) => (beer.beerPercentage > max.beerPercentage ? beer : max), validBeers[0]);
    
    // 3. Mennyiségi becslés (0.5L / sörrel számolva)
    const totalLiters = (totalBeers * 0.5).toFixed(1);

    // 4. Típus statisztikák
    const typeCounts = validBeers.reduce((acc, beer) => {
        const val = beer.type || 'Egyéb';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    const uniqueTypes = Object.keys(typeCounts).length;
    const favoriteType = Object.keys(typeCounts).sort((a,b) => typeCounts[b] - typeCounts[a])[0] || '-';

    // 5. Helyszín statisztikák
    const locCounts = validBeers.reduce((acc, beer) => {
        const val = beer.location || 'Ismeretlen';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    const favoriteLocation = Object.keys(locCounts).sort((a,b) => locCounts[b] - locCounts[a])[0] || '-';

    // 6. Időbeli szokások
    let avgHour = 18;
    const dayCounts = {0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0}; 
    const hours = [];
    
    validBeers.forEach(b => {
        const d = parseBeerDate(b.date);
        if (d) {
            hours.push(d.getHours());
            dayCounts[d.getDay()]++;
        }
    });
    
    if (hours.length > 0) {
        avgHour = Math.floor(hours.reduce((a,b)=>a+b,0) / hours.length);
    }
    
    const daysHu = ['Vasárnap', 'Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat'];
    const busiestDayIndex = Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b);
    const busiestDay = daysHu[busiestDayIndex];

    // 7. Átlag ABV
    const avgAbv = (validBeers.reduce((sum, b) => sum + b.beerPercentage, 0) / totalBeers).toFixed(1);

    // 8. Személyiség
    let personality = "A Kiegyensúlyozott";
    if (averageScore >= 8.5) personality = "A Jószívű Pontozó";
    else if (averageScore <= 4.5) personality = "A Szigorú Kritikus";
    else if (parseFloat(avgAbv) > 7.5) personality = "Az Erős Idezetű";
    else if (uniqueTypes > 10) personality = "A Felfedező";
    else if (totalBeers > 30) personality = "A Sörszakértő";

    return {
        count: totalBeers,
        liters: totalLiters,
        avg: averageScore,
        topBeer: bestBeer.beerName,
        topScore: bestBeer.totalScore,
        worstBeer: worstBeer.beerName,
        worstScore: worstBeer.totalScore,
        strongestBeer: strongestBeer.beerName,
        strongestAbv: strongestBeer.beerPercentage,
        favType: favoriteType,
        uniqueTypes: uniqueTypes,
        favPlace: favoriteLocation,
        drinkingTime: `${avgHour}:00`,
        busiestDay: busiestDay,
        avgAbv: avgAbv,
        personality: personality
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

// === STORY MODE RENDERER (15 SLIDE + FULLSCREEN) ===
let storyInterval;

function renderStoryMode(data, container) {
    const totalSlides = 15;
    
    // Progress barok generálása dinamikusan (hogy ne kelljen 15 sort írni)
    let progressBarsHtml = '';
    for(let i = 0; i < totalSlides; i++) {
        progressBarsHtml += `<div class="story-progress-bar" id="bar-${i}"><div class="story-progress-fill"></div></div>`;
    }

    // HTML Struktúra
    const html = `
    <div class="recap-story-container" id="storyContainer">
        <button class="story-fullscreen-btn" onclick="toggleStoryFullscreen()" title="Teljes képernyő">⛶</button>

        <div class="story-progress-container" style="gap: 2px;">
            ${progressBarsHtml}
        </div>

        <div class="story-nav-left" onclick="prevSlide()"></div>
        <div class="story-nav-right" onclick="nextSlide()"></div>

        <div class="story-slide active" id="slide-0">
            <h3 class="story-title">Szia!</h3>
            <p class="story-text">Készülj fel...</p>
            <p class="story-text">Így telt a ${data.periodName} a sörök világában.</p>
            <span style="font-size: 4rem; margin-top: 20px;">👋</span>
        </div>

        <div class="story-slide" id="slide-1">
            <h3 class="story-title">Mennyiség</h3>
            <p class="story-text">Nem voltál szomjas:</p>
            <div class="story-big-number">${data.count}</div>
            <p class="story-text">sört értékeltél.</p>
        </div>

        <div class="story-slide" id="slide-2">
            <h3 class="story-title">Folyadékpótlás</h3>
            <p class="story-text">Ez nagyjából ennyi folyadékot jelent:</p>
            <span class="story-highlight" style="font-size: 3rem;">~${data.liters} liter</span>
            <p class="story-text" style="font-size: 0.9rem; margin-top:10px;">(Ha 0.5 literrel számolunk)</p>
            <span style="font-size: 3rem;">🚰</span>
        </div>

        <div class="story-slide" id="slide-3">
            <h3 class="story-title">A Felfedező</h3>
            <p class="story-text">Ennyi különböző stílust próbáltál ki:</p>
            <div class="story-big-number" style="font-size: 4rem;">${data.uniqueTypes}</div>
            <p class="story-text">fajta</p>
        </div>

        <div class="story-slide" id="slide-4">
            <h3 class="story-title">A Nagy Kedvenc</h3>
            <p class="story-text">Mindig visszatérsz ehhez:</p>
            <span class="story-highlight" style="font-size: 2rem;">${data.favType}</span>
            <span style="font-size: 3rem; margin-top: 20px;">❤️</span>
        </div>

        <div class="story-slide" id="slide-5">
            <h3 class="story-title">Erősség</h3>
            <p class="story-text">Átlagos alkoholfok (ABV):</p>
            <div class="story-big-number" style="font-size: 3.5rem;">${data.avgAbv}%</div>
            <p class="story-text">Közepesen erős!</p>
        </div>

        <div class="story-slide" id="slide-6">
            <h3 class="story-title">Az Ütős Darab</h3>
            <p class="story-text">A legerősebb söröd:</p>
            <span class="story-highlight">${data.strongestBeer}</span>
            <div class="recap-stat-value" style="color: #ff6b6b; margin-top: 10px;">${data.strongestAbv}% ABV 💀</div>
        </div>

        <div class="story-slide" id="slide-7">
            <h3 class="story-title">Mikor?</h3>
            <p class="story-text">A legaktívabb napod:</p>
            <span class="story-highlight" style="font-size: 2.5rem;">${data.busiestDay}</span>
            <span style="font-size: 3rem; margin-top: 20px;">📅</span>
        </div>

        <div class="story-slide" id="slide-8">
            <h3 class="story-title">Hány órakor?</h3>
            <p class="story-text">A "happy hour" nálad:</p>
            <div class="story-big-number" style="font-size: 3.5rem;">${data.drinkingTime}</div>
            <p class="story-text">Egészségedre!</p>
        </div>

        <div class="story-slide" id="slide-9">
            <h3 class="story-title">Törzshely</h3>
            <p class="story-text">Itt ittad a legtöbbet:</p>
            <span class="story-highlight" style="font-size: 2rem;">${data.favPlace}</span>
            <span style="font-size: 3rem; margin-top: 20px;">📍</span>
        </div>

        <div class="story-slide" id="slide-10">
            <h3 class="story-title">A Kritikus</h3>
            <p class="story-text">Az átlagos pontszámod:</p>
            <div class="story-big-number">${data.avg}</div>
            <p class="story-text">/ 10</p>
        </div>

        <div class="story-slide" id="slide-11">
            <h3 class="story-title" style="color: #51cf66;">A Csúcs 🏆</h3>
            <p class="story-text">A legjobbra értékelt sör:</p>
            <span class="story-highlight" style="font-size: 1.8rem; margin: 20px 0;">${data.topBeer}</span>
            <div class="recap-stat-value">${data.topScore} pont</div>
        </div>

        <div class="story-slide" id="slide-12">
            <h3 class="story-title" style="color: #ff6b6b;">A Mélypont 📉</h3>
            <p class="story-text">Ezt inkább hagytad volna:</p>
            <span class="story-highlight" style="font-size: 1.8rem; margin: 20px 0; color: #ff6b6b;">${data.worstBeer}</span>
            <div class="recap-stat-value">${data.worstScore} pont</div>
        </div>

        <div class="story-slide" id="slide-13">
            <h3 class="story-title">Sör-Személyiség</h3>
            <p class="story-text">Az adataid alapján:</p>
            <span class="story-highlight" style="font-size: 2rem; margin-top: 20px;">"${data.personality}"</span>
            <span style="font-size: 4rem; margin-top: 20px;">😎</span>
        </div>

        <div class="story-slide" id="slide-14" style="z-index: 30;"> 
            <h3 class="story-title">Összegzés</h3>
            <div class="story-summary-grid" id="captureTarget">
                <div class="summary-item">
                    <span class="summary-label">Sörök</span>
                    <span class="summary-value">${data.count} db</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Liters</span>
                    <span class="summary-value">~${data.liters} L</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Top Sör</span>
                    <span class="summary-value">${data.topBeer}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Személyiség</span>
                    <span class="summary-value">${data.personality}</span>
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
    window.totalSlides = totalSlides;
    startStory(0);
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
});
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

    // --- INTEGRÁCIÓ ---
    
    // User nézet váltásakor betöltjük a beállítást
    const originalSwitchToUserView = switchToUserView;
    switchToUserView = function() {
        // Először futtatjuk az eredeti logikát
        // Fontos: Az eredeti függvényben van a "document.body.classList.add('custom-cursor-active')"
        // Ezt felül fogjuk írni a loadUserPreferences-szel, ami helyes.
        
        // Hogy elkerüljük a körkörös hívást, manuálisan másoljuk a logikát, 
        // VAGY hagyjuk lefutni és utána korrigálunk. A korrigálás a biztosabb:
        guestView.style.display = 'none';
        adminView.style.display = 'none';
        userView.style.display = 'block';
        document.body.style.background = 'linear-gradient(135deg, #1f005c 0%, #10002b 50%, #000 100%)';
        document.body.style.backgroundAttachment = 'fixed';
        initializeMainTabs(userView);
        loadUserData();

        // ÉS MOST JÖN A LÉNYEG: Felülírjuk a kurzor állapotot a mentett beállítás alapján
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (userData) {
            loadUserPreferences(userData.email);
        }
    };

    // Admin nézet váltásakor betöltjük a beállítást
    const originalSwitchToAdminView = switchToAdminView;
    switchToAdminView = function() {
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
// === STORY MODE RENDERER (5 SLIDE + FULLSCREEN) ===
let storyInterval;

function renderStoryMode(data, container) {
    // HTML Struktúra - 5 Slide-ra bővítve
    const html = `
    <div class="recap-story-container" id="storyContainer">
        <button class="story-fullscreen-btn" onclick="toggleStoryFullscreen()" title="Teljes képernyő">⛶</button>

        <div class="story-progress-container">
            <div class="story-progress-bar" id="bar-0"><div class="story-progress-fill"></div></div>
            <div class="story-progress-bar" id="bar-1"><div class="story-progress-fill"></div></div>
            <div class="story-progress-bar" id="bar-2"><div class="story-progress-fill"></div></div>
            <div class="story-progress-bar" id="bar-3"><div class="story-progress-fill"></div></div>
            <div class="story-progress-bar" id="bar-4"><div class="story-progress-fill"></div></div>
        </div>

        <div class="story-nav-left" onclick="prevSlide()"></div>
        <div class="story-nav-right" onclick="nextSlide()"></div>

        <div class="story-slide active" id="slide-0">
            <h3 class="story-title">${data.periodName}</h3>
            <p class="story-text">Söripari teljesítményed:</p>
            <div class="story-big-number">${data.count}</div>
            <p class="story-text">sör csúszott le.</p>
            <br>
            <p class="story-text" style="color: #aaa; font-size: 0.9rem;">Az értékeléseid alapján Te vagy:</p>
            <span class="story-highlight" style="font-size: 1.6rem;">"${data.personality}"</span>
        </div>

        <div class="story-slide" id="slide-1">
            <h3 class="story-title">Menny és Pokol</h3>
            <p class="story-text">A skála két vége:</p>
            
            <div class="story-compare-grid">
                <div class="story-compare-item">
                    <span class="compare-label">A CSÚCS 🏆</span>
                    <div class="compare-val-good">${data.topBeer}</div>
                    <span>${data.topScore} pont</span>
                </div>
                <div class="story-compare-item">
                    <span class="compare-label">A MÉLYPONT 💀</span>
                    <div class="compare-val-bad">${data.worstBeer}</div>
                    <span>${data.worstScore} pont</span>
                </div>
            </div>
            <p class="story-text" style="margin-top: 20px;">Az átlagod: <strong>${data.avg}</strong></p>
        </div>

        <div class="story-slide" id="slide-2">
            <h3 class="story-title">Ízlésvilág</h3>
            <p class="story-text">Amiből a legtöbb fogyott:</p>
            <span class="story-highlight">${data.favType}</span>
            <div style="font-size: 3rem; margin: 10px 0;">🍺</div>
            <p class="story-text">Átlagos erősség (ABV):</p>
            <span class="story-highlight">${data.avgAbv}%</span>
        </div>

        <div class="story-slide" id="slide-3">
            <h3 class="story-title">Mikor & Hol?</h3>
            <p class="story-text">Legtöbbször itt:</p>
            <span class="story-highlight">${data.favPlace}</span>
            <hr style="width: 50%; opacity: 0.3; margin: 20px 0;">
            <p class="story-text">A kedvenc napod:</p>
            <span class="story-highlight">${data.busiestDay}</span>
            <p class="story-text">Átlagos időpont: <strong>${data.drinkingTime}</strong></p>
        </div>

        <div class="story-slide" id="slide-4" style="z-index: 30;"> 
            <h3 class="story-title">Összegzés</h3>
            <div class="story-summary-grid" id="captureTarget">
                <div class="summary-item">
                    <span class="summary-label">Sörök száma</span>
                    <span class="summary-value">${data.count} db</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Átlag ABV</span>
                    <span class="summary-value">${data.avgAbv}%</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Top Sör</span>
                    <span class="summary-value">${data.topBeer}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Kedvenc Nap</span>
                    <span class="summary-value">${data.busiestDay}</span>
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
    window.totalSlides = 5; // Most már 5 slide van!
    startStory(0);
}

// === ÚJ: Fullscreen kezelő függvény ===
window.toggleStoryFullscreen = function() {
    const elem = document.getElementById('storyContainer');
    if (!document.fullscreenElement) {
        elem.requestFullscreen().catch(err => {
            alert(`Hiba a teljes képernyőnél: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
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

window.downloadRecap = function() {
    const element = document.getElementById('storyContainer');
    // Gombok elrejtése a képről
    const actions = element.querySelector('.story-actions');
    const navL = element.querySelector('.story-nav-left');
    const navR = element.querySelector('.story-nav-right');
    
    actions.style.display = 'none';
    navL.style.display = 'none';
    navR.style.display = 'none';

    html2canvas(element, { 
        backgroundColor: '#10002b',
        scale: 2 // Jobb minőség
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'sor-recap-2025.png';
        link.href = canvas.toDataURL();
        link.click();
        
        // Visszaállítás
        actions.style.display = 'flex';
        navL.style.display = 'block';
        navR.style.display = 'block';
        showSuccess("Sikeres letöltés!");
    });
}
});
























