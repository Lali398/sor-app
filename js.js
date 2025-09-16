document.addEventListener('DOMContentLoaded', function() {
    // --- NÉZETEK ÉS ELEMEK ---
    const adminView = document.getElementById('adminView');
    const guestView = document.getElementById('guestView');
    const adminForm = document.getElementById('adminForm');
    const searchInput = document.getElementById('searchInput');
    const searchOptions = document.getElementById('searchOptions'); // <-- ÚJ: Datalist
    const beerTableBody = document.getElementById('beerTableBody');
    // ...többi elem...
    const loginCard = document.getElementById('loginCard'), registerCard = document.getElementById('registerCard'), switchAuthLinks = document.querySelectorAll('.switch-auth'), adminBtn = document.getElementById('adminBtn'), adminModal = document.getElementById('adminModal'), modalClose = document.getElementById('modalClose'), logoutBtn = document.getElementById('logoutBtn'), refreshBtn = document.getElementById('refreshBtn');

    // --- ÁLLAPOT ---
    let beersData = [];
    let usersData = [];

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
            
            populateSearchOptions(); // <-- ÚJ: Keresési javaslatok feltöltése
            
            showSuccess('Sikeres admin bejelentkezés!');
            setTimeout(() => {
                closeAdminModal();
                switchToAdminView();
            }, 1000);

        } catch (error) {
            console.error("Admin bejelentkezési hiba:", error);
            showError(error.message || 'Hibás admin felhasználónév vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // ======================================================
    // === KERESÉSI FUNKCIÓK (ÁTALAKÍTVA) ===
    // ======================================================

    /**
     * Feltölti a keresőhöz tartozó datalist-et egyedi sörnevekkel, típusokkal és helyekkel.
     */
    function populateSearchOptions() {
        searchOptions.innerHTML = ''; // Korábbi opciók törlése
        const uniqueOptions = new Set();

        beersData.forEach(beer => {
            if (beer.beerName) uniqueOptions.add(beer.beerName);
            if (beer.type) uniqueOptions.add(beer.type);
            if (beer.location) uniqueOptions.add(beer.location);
        });

        uniqueOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            searchOptions.appendChild(optionElement);
        });
    }

    /**
     * Szűri a táblázatot a keresőmező értéke alapján.
     */
    function handleSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const filteredBeers = beersData.filter(beer => {
            return (beer.beerName?.toLowerCase() || '').includes(searchTerm) ||
                   (beer.type?.toLowerCase() || '').includes(searchTerm) ||
                   (beer.location?.toLowerCase() || '').includes(searchTerm);
        });
        renderBeerTable(filteredBeers);
    }
    
    // ======================================================
    // === ADATMEGJELENÍTÉS (VÁLTOZATLAN) ===
    // ======================================================

    function renderBeerTable(beersToRender) {
        beerTableBody.innerHTML = '';
        if (!beersToRender || beersToRender.length === 0) {
            beerTableBody.innerHTML = `<tr><td colspan="6">Nincs a keresésnek megfelelő sör.</td></tr>`;
            return;
        }
        beersToRender.forEach(beer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${beer.beerName || ''}</td>
                <td>${beer.type || ''}</td>
                <td>${beer.location || ''}</td>
                <td>${beer.beerPercentage || 0}%</td>
                <td>${beer.score || 0}</td>
                <td>${beer.ratedBy || ''}</td>
            `;
            beerTableBody.appendChild(row);
        });
    }

    function loadAdminData() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
        renderBeerTable(beersData);
    }
    
    // ======================================================
    // === NÉZETVÁLTÁS ÉS ESEMÉNYKEZELŐK ===
    // ======================================================

    function switchToAdminView() {
        guestView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData();
    }

    function switchToGuestView() {
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        searchInput.value = '';
    }

    // --- Eseménykezelők ---
    adminForm.addEventListener('submit', handleAdminLogin);
    searchInput.addEventListener('input', handleSearch);
    logoutBtn.addEventListener('click', switchToGuestView);
    refreshBtn.addEventListener('click', loadAdminData);

    // ... a többi, változatlan eseménykezelő ...
    adminBtn.addEventListener('click', () => { adminModal.classList.add('active'); document.body.style.overflow = 'hidden'; });
    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() { adminModal.classList.remove('active'); document.body.style.overflow = 'auto'; }
    switchAuthLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); if (this.dataset.target === 'register') { loginCard.classList.remove('active'); setTimeout(() => registerCard.classList.add('active'), 300); } else { registerCard.classList.remove('active'); setTimeout(() => loginCard.classList.add('active'), 300); } }); });
    document.getElementById('loginForm').addEventListener('submit', e => { e.preventDefault(); showError('A vendég bejelentkezés jelenleg nem aktív.'); });
    document.getElementById('registerForm').addEventListener('submit', e => { e.preventDefault(); showError('A vendég regisztráció jelenleg nem aktív.'); });
    
    // ======================================================
    // === SEGÉDFÜGGVÉNYEK (VÁLTOZATLAN) ===
    // ======================================================
    function setLoading(button, isLoading) { button.classList.toggle('loading', isLoading); button.disabled = isLoading; }
    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showNotification(message, type) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; Object.assign(notification.style, { position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px', color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)', transition: 'transform 0.3s ease', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db') }); document.body.appendChild(notification); setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100); setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); }, 3000); }
    
    console.log('🍺 Sör Táblázat alkalmazás betöltve! (Javaslatokkal működő keresővel)');
});
