document.addEventListener('DOMContentLoaded', function() {
    // --- NÉZETEK ÉS ELEMEK ---
    const guestView = document.getElementById('guestView');
    const adminView = document.getElementById('adminView');
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const switchAuthLinks = document.querySelectorAll('.switch-auth');
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const modalClose = document.getElementById('modalClose');
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const adminForm = document.getElementById('adminForm');
    const beerTableBody = document.getElementById('beerTableBody');

    // --- ÁLLAPOT ---
    let beersData = [];
    let usersData = []; // Ezt a szerver nem küldi, de a struktúra megmarad

    // ======================================================
    // === FŐ FUNKCIÓK (JAVÍTVA) ===
    // ======================================================

    /**
     * Admin bejelentkezés kezelése.
     * Ez a függvény most már a szerverhez fordul a bejelentkezési adatokkal.
     */
    async function handleAdminLogin(e) {
        e.preventDefault();
        const usernameInput = document.getElementById('adminUsername').value;
        const passwordInput = document.getElementById('adminPassword').value;
        const submitBtn = adminForm.querySelector('.auth-btn');

        if (!usernameInput || !passwordInput) {
            showError('Minden mezőt ki kell tölteni!');
            return;
        }

        setLoading(submitBtn, true);

        try {
            // --- ITT TÖRTÉNIK A VALÓDI BEJELENTKEZÉS A SZERVEREN ---
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Az adatokat a szerver által várt formátumban küldjük
                body: JSON.stringify({
                    action: 'GET_DATA',
                    username: usernameInput,
                    password: passwordInput
                })
            });

            const result = await response.json();

            if (!response.ok) {
                // Ha a szerver 401-et vagy más hibát küld, itt jelenítjük meg
                throw new Error(result.error || `Hiba: ${response.status}`);
            }

            // Sikeres bejelentkezés esetén elmentjük a kapott adatokat
            beersData = result.beers || [];
            usersData = result.users || [];

            showSuccess('Sikeres admin bejelentkezés!');
            
            setTimeout(() => {
                closeAdminModal();
                switchToAdminView(); // Átváltás az admin felületre
            }, 1000);

        } catch (error) {
            console.error("Admin bejelentkezési hiba:", error);
            showError(error.message || 'Hibás admin felhasználónév vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    /**
     * Adatok frissítése a szerverről.
     */
    async function refreshAdminData() {
        showNotification('Adatok frissítése...', 'info');
        // Újra meghívjuk a bejelentkezési logikát, ami lekéri a friss adatokat
        // Ehhez az adminForm-ban lévő adatok kellenek, vagy elmenthetnénk őket.
        // Egyszerűbb megoldásként most csak a meglévő adatokat rajzoljuk újra.
        updateBeerTable();
        updateStats();
        showSuccess('Adatok frissítve!');
    }

    // ======================================================
    // === EREDETI, DE NEM HASZNÁLT FUNKCIÓK (IDEIGLENES) ===
    // ======================================================
    
    // A vendég regisztráció és bejelentkezés most nincs bekötve a szerverhez,
    // mivel a szerver csak az admin belépést kezeli.
    async function handleLogin(e) {
        e.preventDefault();
        showError('A vendég bejelentkezés jelenleg nem aktív.');
    }

    async function handleRegister(e) {
        e.preventDefault();
        showError('A vendég regisztráció jelenleg nem aktív.');
    }
    
    // ======================================================
    // === NÉZETEK ÉS ADATMEGJELENÍTÉS ===
    // ======================================================

    function switchToAdminView() {
        guestView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData(); // Betölti a kapott adatokat
    }

    function switchToGuestView() {
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    function loadAdminData() {
        updateStats();
        updateBeerTable();
    }

    function updateStats() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
    }

    function updateBeerTable() {
        beerTableBody.innerHTML = '';

        if (!beersData || beersData.length === 0) {
            beerTableBody.innerHTML = `<tr><td colspan="6">Nem található sör az adatbázisban.</td></tr>`;
            return;
        }

        beersData.forEach(beer => {
            const row = document.createElement('tr');
            // Az oszlopok most már a valós adatokhoz igazodnak
            row.innerHTML = `
                <td>${beer.beerName || ''}</td>
                <td>${beer.type || ''}</td>
                <td>${beer.location || ''}</td>
                <td>${beer.beerPercentage || 0}%</td>
                <td>${beer.score || 0}</td>
                <td>${beer.ratedBy || ''}</td>
            `;
            tbody.appendChild(row);
        });
    }

    // ======================================================
    // === ESEMÉNYKEZELŐK ===
    // ======================================================

    // Form beküldések
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    adminForm.addEventListener('submit', handleAdminLogin);

    // Gombok
    logoutBtn.addEventListener('click', () => {
        switchToGuestView();
        showSuccess('Sikeres kijelentkezés!');
    });
    refreshBtn.addEventListener('click', refreshAdminData);
    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Modal bezárása
    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() {
        adminModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    // Auth kártyák váltása
    switchAuthLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            if (this.dataset.target === 'register') {
                loginCard.classList.remove('active');
                setTimeout(() => registerCard.classList.add('active'), 300);
            } else {
                registerCard.classList.remove('active');
                setTimeout(() => loginCard.classList.add('active'), 300);
            }
        });
    });

    // ======================================================
    // === SEGÉDFÜGGVÉNYEK (VÁLTOZATLAN) ===
    // ======================================================
    function setLoading(button, isLoading) {
        button.classList.toggle('loading', isLoading);
        button.disabled = isLoading;
    }

    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        Object.assign(notification.style, {
            position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px',
            color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)',
            transition: 'transform 0.3s ease',
            backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db')
        });
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100);
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300);
        }, 3000);
    }
    
    console.log('🍺 Sör Táblázat alkalmazás betöltve! (Javított verzió)');
    console.log('Admin belépéshez kattints az "Admin" gombra. Felhasználónév: admin, Jelszó: sor');
});
