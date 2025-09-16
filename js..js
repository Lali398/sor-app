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
    loadSampleData();
    // A konfigurációt már a backend kezeli, így a mentett adatok betöltése nem szükséges
    // loadSavedConfig(); 

    // VENDÉG FELÜLET ESEMÉNYKEZELŐK
    
    // Auth váltás
    switchAuthLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.dataset.target;
            
            if (target === 'register') {
                switchToRegister();
            } else {
                switchToLogin();
            }
        });
    });

    function switchToRegister() {
        loginCard.classList.remove('active');
        setTimeout(() => {
            registerCard.classList.add('active');
        }, 300);
    }

    function switchToLogin() {
        registerCard.classList.remove('active');
        setTimeout(() => {
            loginCard.classList.add('active');
        }, 300);
    }

    // Admin modal
    adminBtn.addEventListener('click', function() {
        adminModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', function(e) {
        if (e.target === adminModal) {
            closeAdminModal();
        }
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

        if (!validateEmail(email)) {
            showError('Érvényes email címet adjon meg!');
            return;
        }

        if (password.length < 6) {
            showError('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
            return;
        }

        setLoading(submitBtn, true);

        try {
            await simulateApiCall();
            
            const user = usersData.find(u => u.email === email && u.password === password);
            if (user) {
                currentUser = user;
                showSuccess('Sikeres bejelentkezés!');
                setTimeout(() => {
                    switchToUserDashboard();
                }, 1500);
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

        if (name.length < 2) {
            showError('A névnek legalább 2 karakter hosszúnak kell lennie!');
            return;
        }
        if (!validateEmail(email)) {
            showError('Érvényes email címet adjon meg!');
            return;
        }
        if (password.length < 6) {
            showError('A jelszónak legalább 6 karakter hosszúnak kell lennie!');
            return;
        }
        if (password !== passwordConfirm) {
            showError('A jelszavak nem egyeznek!');
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
                id: Date.now(),
                name,
                email,
                password, // Valós alkalmazásban a jelszót hashelni kellene!
                registeredAt: new Date().toISOString()
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

        if (!username || !password) {
            showError('Minden mezőt ki kell tölteni!');
            return;
        }

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

    logoutBtn.addEventListener('click', function() {
        isAdmin = false;
        currentUser = null;
        switchToGuestView();
        showSuccess('Sikeres kijelentkezés!');
    });

    refreshBtn.addEventListener('click', function() {
        loadAdminData();
        showSuccess('Adatok frissítve!');
    });

    addBeerBtn.addEventListener('click', function() {
        document.querySelector('#beerModal .modal-header h3').textContent = 'Új sör hozzáadása';
        beerForm.onsubmit = handleAddBeer;
        beerModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    beerModalClose.addEventListener('click', closeBeerModal);
    beerModal.addEventListener('click', function(e) {
        if (e.target === beerModal) {
            closeBeerModal();
        }
    });

    function closeBeerModal() {
        beerModal.classList.remove('active');
        document.body.style.overflow = 'auto';
        beerForm.reset();
    }

    exportBtn.addEventListener('click', function() {
        exportBeersData();
    });

    // A config formra már nincs szükség a frontend-en
    // sheetsConfigForm.addEventListener('submit', handleSheetsConfig);
    beerForm.addEventListener('submit', handleAddBeer);
    
    // A config form elrejtése vagy eltávolítása a HTML-ből javasolt.
    if(sheetsConfigForm) {
        sheetsConfigForm.closest('.config-section').style.display = 'none';
    }


    async function handleAddBeer(e) {
        e.preventDefault();
        
        const beerData = {
            id: Date.now(),
            name: document.getElementById('beerName').value,
            type: document.getElementById('beerType').value,
            alcohol: parseFloat(document.getElementById('beerAlcohol').value),
            price: parseFloat(document.getElementById('beerPrice').value),
            stock: parseInt(document.getElementById('beerStock').value),
            addedAt: new Date().toISOString()
        };

        const submitBtn = beerForm.querySelector('.auth-btn');
        setLoading(submitBtn, true);

        try {
            await simulateApiCall();
            
            beersData.push(beerData);
            await saveBeerToGoogleSheets(beerData);
            
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

    // NÉZET VÁLTÁS FÜGGVÉNYEK

    function switchToGuestView() {
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    function switchToAdminView() {
        guestView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData();
    }

    function switchToUserDashboard() {
        showSuccess(`Üdvözöljük, ${currentUser.name}! (Felhasználói felület nincs implementálva)`);
    }

    // ADMIN ADATOK KEZELÉSE

    function loadAdminData() {
        updateStats();
        updateBeerTable();
        updateSheetsStatus();
    }

    function updateStats() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
    }

    function updateBeerTable() {
        const tbody = document.getElementById('beerTableBody');
        tbody.innerHTML = '';

        beersData.forEach(beer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${beer.name}</td>
                <td>${beer.type}</td>
                <td>${beer.alcohol}%</td>
                <td>${beer.price} Ft</td>
                <td>${beer.stock} db</td>
                <td>
                    <button class="edit-btn" onclick="editBeer(${beer.id})">✏️ Szerkesztés</button>
                    <button class="delete-btn" onclick="deleteBeer(${beer.id})">🗑️ Törlés</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function updateSheetsStatus() {
        const status = document.getElementById('sheetsStatus');
        // Ezt a státuszt a backend-től kérhetnénk le egy 'PING' akcióval,
        // de most egyszerűsítve beállítjuk.
        status.textContent = 'Kapcsolódva';
        status.style.color = '#27ae60';
    }

    function loadSampleData() {
        usersData = [
            { id: 1, name: 'Teszt János', email: 'teszt@email.com', password: 'teszt123', registeredAt: '2024-01-15T10:30:00Z' },
            { id: 2, name: 'Minta Péter', email: 'minta@email.com', password: 'minta123', registeredAt: '2024-01-20T14:45:00Z' }
        ];
        beersData = [
            { id: 1, name: 'Soproni', type: 'Világos lager', alcohol: 4.5, price: 250, stock: 50, addedAt: '2024-01-10T08:00:00Z' },
            { id: 2, name: 'Dreher Classic', type: 'Világos lager', alcohol: 5.2, price: 280, stock: 30, addedAt: '2024-01-12T10:15:00Z' },
            { id: 3, name: 'Arany Ászok', type: 'Világos lager', alcohol: 4.3, price: 220, stock: 25, addedAt: '2024-01-14T16:30:00Z' }
        ];
    }

    function exportBeersData() {
        const csvData = convertToCSV(beersData);
        downloadCSV(csvData, 'sor_tablazat_export.csv');
        showSuccess('Adatok exportálva CSV formátumban!');
    }

    function convertToCSV(data) {
        const headers = ['Név', 'Típus', 'Alkohol %', 'Ár (Ft)', 'Készlet (db)', 'Hozzáadva'];
        const rows = data.map(beer => [
            beer.name, beer.type, beer.alcohol, beer.price, beer.stock, new Date(beer.addedAt).toLocaleDateString('hu-HU')
        ]);
        return [headers, ...rows].map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    function downloadCSV(csvData, filename) {
        const blob = new Blob(["\uFEFF" + csvData], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // GLOBÁLIS FÜGGVÉNYEK (window objektumhoz)
    window.editBeer = function(id) {
        const beer = beersData.find(b => b.id === id);
        if (beer) {
            document.getElementById('beerName').value = beer.name;
            document.getElementById('beerType').value = beer.type;
            document.getElementById('beerAlcohol').value = beer.alcohol;
            document.getElementById('beerPrice').value = beer.price;
            document.getElementById('beerStock').value = beer.stock;
            
            document.querySelector('#beerModal .modal-header h3').textContent = 'Sör szerkesztése';
            beerModal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            beerForm.onsubmit = async function(e) {
                e.preventDefault();
                
                beer.name = document.getElementById('beerName').value;
                beer.type = document.getElementById('beerType').value;
                beer.alcohol = parseFloat(document.getElementById('beerAlcohol').value);
                beer.price = parseFloat(document.getElementById('beerPrice').value);
                beer.stock = parseInt(document.getElementById('beerStock').value);

                const submitBtn = beerForm.querySelector('.auth-btn');
                setLoading(submitBtn, true);

                try {
                    await simulateApiCall();
                    await updateBeerInGoogleSheets(beer);
                    
                    showSuccess('Sör sikeresen módosítva!');
                    closeBeerModal();
                    updateBeerTable();
                    
                    beerForm.onsubmit = handleAddBeer;
                    
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
                const index = beersData.findIndex(b => b.id === id);
                if (index !== -1) {
                    await deleteBeerFromGoogleSheets(id);
                    beersData.splice(index, 1);
                    updateBeerTable();
                    updateStats();
                    showSuccess('Sör sikeresen törölve!');
                }
            } catch (error) {
                showError('Hiba történt a törlés során!');
                console.error(error);
            }
        }
    };

    // ======================================================
    // === ÚJ GOOGLE SHEETS INTEGRÁCIÓ (NETLIFY FUNCTIONS) ===
    // ======================================================

    // Központi függvény, ami a Netlify backenddel kommunikál
    async function callSheetApi(action, payload) {
        const response = await fetch('/.netlify/functions/sheet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, payload }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Hiba a szerveroldali függvénnyel való kommunikáció során.');
        }

        return result;
    }

    async function saveUserToGoogleSheets(userData) {
        console.log('Felhasználó mentése Google Sheets-be:', userData);
        // A jelszót nem küldjük el a backendnek!
        const payload = {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            registeredAt: userData.registeredAt
        };
        await callSheetApi('APPEND_USER', payload);
        showSuccess('Felhasználó sikeresen mentve a felhőbe!');
    }

    async function saveBeerToGoogleSheets(beerData) {
        console.log('Sör mentése Google Sheets-be:', beerData);
        await callSheetApi('APPEND_BEER', beerData);
        showSuccess('Sör sikeresen mentve a felhőbe!');
    }

    async function updateBeerInGoogleSheets(beerData) {
        console.log('Sör frissítése Google Sheets-ben:', beerData);
        await callSheetApi('UPDATE_BEER', beerData);
        showNotification('Söradatok frissítve a felhőben.', 'success');
    }

    async function deleteBeerFromGoogleSheets(beerId) {
        console.log('Sör törlése Google Sheets-ből:', beerId);
        await callSheetApi('DELETE_BEER', { id: beerId });
        showNotification('Sör törölve a felhőből.', 'success');
    }

    // SEGÉDFÜGGVÉNYEK

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function setLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '10px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(400px)',
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

    function simulateApiCall() {
        return new Promise(resolve => setTimeout(resolve, 500));
    }

    const inputs = document.querySelectorAll('.input-group input');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.value) { this.classList.add('has-value'); } 
            else { this.classList.remove('has-value'); }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            if (adminModal.classList.contains('active')) closeAdminModal();
            if (beerModal.classList.contains('active')) closeBeerModal();
        }
    });

    console.log('🍺 Sör Táblázat alkalmazás betöltve!');
    console.log('Admin belépés: felhasználónév: admin, jelszó: admin123');
    console.log('Teszt felhasználó: teszt@email.com / teszt123');
});