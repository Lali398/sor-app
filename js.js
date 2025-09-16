document.addEventListener('DOMContentLoaded', function() {
    // Nézetek
    const guestView = document.getElementById('guestView');
    const adminView = document.getElementById('adminView');
    
    // Vendég felület elemek
    const loginCard = document.getElementById('loginCard');
    const registerCard = document.getElementById('registerCard');
    const switchAuthLinks = document.querySelectorAll('.switch-auth');
    const adminBtn = document.getElementById('adminBtn');
    const adminModal = document.getElementById('adminModal');
    const modalClose = document.getElementById('modalClose');
    
    // Admin felület elemek
    const logoutBtn = document.getElementById('logoutBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const beerModal = document.getElementById('beerModal');
    const beerModalClose = document.getElementById('beerModalClose');
    const addBeerBtn = document.getElementById('addBeerBtn');
    const exportBtn = document.getElementById('exportBtn');
    const beerSearchInput = document.getElementById('beerSearchInput');
    
    // Formok
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const adminForm = document.getElementById('adminForm');
    const sheetsConfigForm = document.getElementById('sheetsConfigForm');
    const beerForm = document.getElementById('beerForm');

    // Adatok tárolása
    let currentUser = null;
    let isAdmin = false;
    let beersData = [];
    let usersData = [];

    // Kezdeti állapot
    // A loadSampleData() hívást eltávolítjuk innen, hogy ne azzal induljon az oldal.
    if(sheetsConfigForm) {
        sheetsConfigForm.closest('.config-section').style.display = 'none';
    }

    // VENDÉG FELÜLET ESEMÉNYKEZELŐK
    
    switchAuthLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.dataset.target;
            if (target === 'register') switchToRegister();
            else switchToLogin();
        });
    });

    function switchToRegister() {
        loginCard.classList.remove('active');
        setTimeout(() => registerCard.classList.add('active'), 300);
    }

    function switchToLogin() {
        registerCard.classList.remove('active');
        setTimeout(() => loginCard.classList.add('active'), 300);
    }

    adminBtn.addEventListener('click', () => {
        adminModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => {
        if (e.target === adminModal) closeAdminModal();
    });

    function closeAdminModal() {
        adminModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        adminForm.reset();
    }

    // Form kezelők
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    adminForm.addEventListener('submit', handleAdminLogin);

    async function handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('.auth-btn');

        if (!validateEmail(email) || password.length < 6) {
            showError('Érvénytelen adatok!');
            return;
        }

        setLoading(submitBtn, true);
        try {
            // Itt is le kellene kérni a felhasználókat, ha még nincsenek betöltve
            if (usersData.length === 0) {
                const { users } = await callSheetApi('GET_DATA');
                usersData = users;
            }
            await simulateApiCall(); // Csak a UX miatt marad
            const user = usersData.find(u => u.email === email && u.password === password);
            if (user) {
                currentUser = user;
                showSuccess('Sikeres bejelentkezés!');
                setTimeout(() => switchToUserDashboard(), 1500);
            } else {
                throw new Error('Hibás adatok');
            }
        } catch (error) {
            showError('Hibás email vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const submitBtn = registerForm.querySelector('.auth-btn');

        if (name.length < 2 || !validateEmail(email) || password.length < 6 || password !== passwordConfirm) {
            showError('Kérjük, töltse ki helyesen az összes mezőt!');
            return;
        }
        if (usersData.some(u => u.email === email)) {
            showError('Ez az email cím már regisztrálva van!');
            return;
        }

        setLoading(submitBtn, true);
        try {
            await simulateApiCall();
            const newUser = {
                id: Date.now(), name, email, password, registeredAt: new Date().toISOString()
            };
            usersData.push(newUser);
            await saveUserToGoogleSheets(newUser);
            showSuccess('Sikeres regisztráció! Átirányítás...');
            setTimeout(() => {
                switchToLogin();
                registerForm.reset();
            }, 1500);
        } catch (error) {
            showError('Hiba történt a regisztráció során!');
            console.error(error);
        } finally {
            setLoading(submitBtn, false);
        }
    }

    async function handleAdminLogin(e) {
        e.preventDefault();
        const username = document.getElementById('adminUsername').value;
        const password = document.getElementById('adminPassword').value;
        const submitBtn = adminForm.querySelector('.auth-btn');

        setLoading(submitBtn, true);
        try {
            await simulateApiCall();
            if (username === 'admin' && password === 'admin123') {
                isAdmin = true;
                currentUser = { name: 'Admin', email: 'admin@sor-tablazat.hu' };
                showSuccess('Sikeres admin bejelentkezés!');
                setTimeout(() => {
                    closeAdminModal();
                    switchToAdminView();
                }, 1500);
            } else {
                throw new Error('Hibás admin adatok');
            }
        } catch (error) {
            showError('Hibás admin felhasználónév vagy jelszó!');
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // ADMIN FELÜLET ESEMÉNYKEZELŐK

    logoutBtn.addEventListener('click', () => {
        isAdmin = false;
        currentUser = null;
        beersData = []; // Kiürítjük az adatokat kijelentkezéskor
        usersData = [];
        switchToGuestView();
        showSuccess('Sikeres kijelentkezés!');
    });

    refreshBtn.addEventListener('click', () => {
        loadAdminData();
        showSuccess('Adatok frissítve!');
    });

    addBeerBtn.addEventListener('click', () => {
        beerForm.reset();
        document.getElementById('beerModalTitle').textContent = 'Új sör hozzáadása';
        document.getElementById('beerSubmitBtnText').textContent = 'Sör hozzáadása';
        beerForm.onsubmit = handleAddBeer;
        beerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    beerModalClose.addEventListener('click', closeBeerModal);
    beerModal.addEventListener('click', e => {
        if (e.target === beerModal) closeBeerModal();
    });

    function closeBeerModal() {
        beerModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        beerForm.reset();
    }

    exportBtn.addEventListener('click', exportBeersData);

    beerSearchInput.addEventListener('input', e => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredBeers = beersData.filter(beer => 
            beer.beerName.toLowerCase().includes(searchTerm) || 
            beer.type.toLowerCase().includes(searchTerm)
        );
        updateBeerTable(filteredBeers);
    });

    async function handleAddBeer(e) {
        e.preventDefault();
        const beerData = getBeerDataFromForm();
        beerData.id = Date.now();
        
        const submitBtn = beerForm.querySelector('.auth-btn');
        setLoading(submitBtn, true);
        try {
            await simulateApiCall();
            
            await saveBeerToGoogleSheets(beerData);
            beersData.push(beerData); // Hozzáadás a helyi listához API hívás után
            
            showSuccess('Új sör sikeresen hozzáadva!');
            closeBeerModal();
            updateBeerTable();
            updateStats();
        } catch (error) {
            showError('Hiba történt a sör hozzáadása során!');
            console.error(error);
        } finally {
            setLoading(submitBtn, false);
        }
    }

    // NÉZET VÁLTÁS
    function switchToGuestView() {
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    function switchToAdminView() {
        guestView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData(); // Itt hívjuk meg az adatbetöltést
    }

    function switchToUserDashboard() {
        showSuccess(`Üdvözöljük, ${currentUser.name}! (Felhasználói felület nincs implementálva)`);
    }

    // ADMIN ADATOK
    async function loadAdminData() {
        try {
            showNotification('Adatok betöltése a Google Sheets-ből...', 'info');
            const { beers, users } = await callSheetApi('GET_DATA');
            beersData = beers || [];
            usersData = users || [];
            
            updateStats();
            updateBeerTable();
            updateSheetsStatus(true);
            showSuccess('Adatok sikeresen betöltve!');

        } catch (error) {
            showError('Hiba az adatok betöltésekor: ' + error.message);
            updateSheetsStatus(false);
            // Hiba esetén betölthetjük a mintaadatokat, hogy ne legyen üres az oldal
            loadSampleData();
            updateStats();
            updateBeerTable();
        }
    }

    function updateStats() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
    }

    function updateBeerTable(data = beersData) {
        const tbody = document.getElementById('beerTableBody');
        tbody.innerHTML = '';
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Nincsenek megjeleníthető sörök.</td></tr>';
            return;
        }
        data.forEach(beer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${beer.beerName || ''}</td>
                <td>${beer.type || ''}</td>
                <td>${beer.beerPercentage || 0}%</td>
                <td>${beer.look || 0}/5</td>
                <td>${beer.smell || 0}/5</td>
                <td>${beer.taste || 0}/10</td>
                <td>${beer.score || 0}/10</td>
                <td>
                    <button class="edit-btn" onclick="editBeer(${beer.id})">✏️ Szerkesztés</button>
                    <button class="delete-btn" onclick="deleteBeer(${beer.id})">🗑️ Törlés</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function updateSheetsStatus(isSuccess) {
        const status = document.getElementById('sheetsStatus');
        if (isSuccess) {
            status.textContent = 'Kapcsolódva';
            status.style.color = '#27ae60';
        } else {
            status.textContent = 'Hiba';
            status.style.color = '#e74c3c';
        }
    }

    function loadSampleData() {
        showNotification('Figyelem: Mintaadatok betöltve. A Google Sheets kapcsolat sikertelen.', 'error');
        usersData = [
            { id: 1, name: 'Teszt János', email: 'teszt@email.com', password: 'teszt123' },
            { id: 2, name: 'Minta Péter', email: 'minta@email.com', password: 'minta123' }
        ];
        beersData = [
            { id: 1, beerName: 'Soproni (Minta)', type: 'Világos lager', beerPercentage: 4.5, look: 4, smell: 3, taste: 6, score: 7 },
            { id: 2, beerName: 'Dreher Classic (Minta)', type: 'Világos lager', beerPercentage: 5.2, look: 5, smell: 4, taste: 7, score: 8 },
            { id: 3, beerName: 'Arany Ászok (Minta)', type: 'Világos lager', beerPercentage: 4.3, look: 3, smell: 3, taste: 5, score: 5 }
        ];
    }

    function getBeerDataFromForm() {
        return {
            beerName: document.getElementById('beerName').value,
            type: document.getElementById('beerType').value,
            beerPercentage: parseFloat(document.getElementById('beerPercentage').value) || 0,
            look: parseInt(document.getElementById('beerLook').value) || 0,
            smell: parseInt(document.getElementById('beerSmell').value) || 0,
            taste: parseInt(document.getElementById('beerTaste').value) || 0,
            score: parseInt(document.getElementById('beerScore').value) || 0,
        };
    }

    function setBeerDataToForm(beer) {
        document.getElementById('beerName').value = beer.beerName;
        document.getElementById('beerType').value = beer.type;
        document.getElementById('beerPercentage').value = beer.beerPercentage;
        document.getElementById('beerLook').value = beer.look;
        document.getElementById('beerSmell').value = beer.smell;
        document.getElementById('beerTaste').value = beer.taste;
        document.getElementById('beerScore').value = beer.score;
    }

    function exportBeersData() {
        if (beersData.length === 0) {
            showError('Nincs mit exportálni!');
            return;
        }
        const headers = ['Név', 'Típus', 'Alkohol %', 'Kinézet', 'Illat', 'Íz', 'Pontszám'];
        const dataToExport = beersData.map(b => [b.beerName, b.type, b.beerPercentage, b.look, b.smell, b.taste, b.score]);
        const csvData = [headers, ...dataToExport].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
        
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'sor_ertekeles_export.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSuccess('Adatok exportálva CSV formátumban!');
    }

    // GLOBÁLIS FÜGGVÉNYEK
    window.editBeer = function(id) {
        const beer = beersData.find(b => b.id === id);
        if (beer) {
            setBeerDataToForm(beer);
            
            document.getElementById('beerModalTitle').textContent = 'Sör szerkesztése';
            document.getElementById('beerSubmitBtnText').textContent = 'Módosítás mentése';
            beerModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            beerForm.onsubmit = async function(e) {
                e.preventDefault();
                const updatedData = getBeerDataFromForm();
                
                const submitBtn = beerForm.querySelector('.auth-btn');
                setLoading(submitBtn, true);
                try {
                    await simulateApiCall();
                    await updateBeerInGoogleSheets({ ...updatedData, id: beer.id });
                    
                    // Helyi adat frissítése
                    Object.assign(beer, updatedData);
                    
                    showSuccess('Sör sikeresen módosítva!');
                    closeBeerModal();
                    updateBeerTable();
                } catch (error) {
                    showError('Hiba történt a módosítás során!');
                    console.error(error);
                } finally {
                    setLoading(submitBtn, false);
                }
            };
        }
    };

    window.deleteBeer = async function(id) {
        if (confirm('Biztosan törli ezt a sört?')) {
            try {
                await deleteBeerFromGoogleSheets(id);
                beersData = beersData.filter(b => b.id !== id);
                updateBeerTable();
                updateStats();
                showSuccess('Sör sikeresen törölve!');
            } catch (error) {
                showError('Hiba történt a törlés során!');
                console.error(error);
            }
        }
    };

    // GOOGLE SHEETS INTEGRÁCIÓ
    async function callSheetApi(action, payload) {
        const response = await fetch('/api/sheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, payload }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Szerveroldali hiba.');
        return result;
    }

    async function saveUserToGoogleSheets(userData) {
        const { password, ...payload } = userData; // Jelszó nélkül küldjük
        await callSheetApi('APPEND_USER', payload);
    }
    async function saveBeerToGoogleSheets(beerData) {
        await callSheetApi('APPEND_BEER', beerData);
    }
    async function updateBeerInGoogleSheets(beerData) {
        await callSheetApi('UPDATE_BEER', beerData);
    }
    async function deleteBeerFromGoogleSheets(beerId) {
        await callSheetApi('DELETE_BEER', { id: beerId });
    }

    // SEGÉDFÜGGVÉNYEK
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).toLowerCase());
    }

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
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 10);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000); // Kicsit több idő, hogy el lehessen olvasni
    }

    function simulateApiCall() {
        return new Promise(resolve => setTimeout(resolve, 300));
    }

    document.querySelectorAll('.input-group input').forEach(input => {
        input.addEventListener('blur', function() {
            this.classList.toggle('has-value', this.value);
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (adminModal.classList.contains('active')) closeAdminModal();
            if (beerModal.classList.contains('active')) closeBeerModal();
        }
    });

    // Stílusok hozzáadása a Notifikációkhoz (CSS-in-JS)
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            position: fixed; top: 20px; right: 20px; padding: 15px 20px; border-radius: 10px;
            color: white; font-weight: 500; z-index: 10000; transform: translateX(120%);
            transition: transform 0.3s ease;
        }
        .notification.show { transform: translateX(0); }
        .notification.error { background-color: #e74c3c; }
        .notification.success { background-color: #27ae60; }
        .notification.info { background-color: #3498db; }
    `;
    document.head.appendChild(style);

    console.log('🍺 Sör Táblázat alkalmazás betöltve!');
});
