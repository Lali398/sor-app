document.addEventListener('DOMContentLoaded', function() {
    // --- NÉZETEK ÉS ELEMEK ---
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
    
    // ...többi elem...
    const loginCard = document.getElementById('loginCard'), registerCard = document.getElementById('registerCard'), switchAuthLinks = document.querySelectorAll('.switch-auth'), adminBtn = document.getElementById('adminBtn'), adminModal = document.getElementById('adminModal'), modalClose = document.getElementById('modalClose'), logoutBtn = document.getElementById('logoutBtn'), refreshBtn = document.getElementById('refreshBtn');

    // --- ÁLLAPOT ---
    let beersData = [];
    let usersData = [];
    let filteredBeers = [];
    let selectedSuggestionIndex = -1;

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
            filteredBeers = [...beersData]; // Kezdetben az összes sör
            
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

    async function handleGuestRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
        const submitBtn = registerForm.querySelector('.auth-btn');

        if (password !== passwordConfirm) {
            showError("A két jelszó nem egyezik!");
            return;
        }

        setLoading(submitBtn, true);
        try {
            // A backendet kell megvalósítani, hogy kezelje ezt a kérést!
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'REGISTER_USER', name, email, password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');

            showSuccess('Sikeres regisztráció! Most már bejelentkezhetsz.');
            // Váltás a bejelentkezési kártyára
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
            // A backendet kell megvalósítani, hogy kezelje ezt a kérést!
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'LOGIN_USER', email, password })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Szerverhiba');
            
            // Mentsük el a session tokent és a felhasználó adatait
            // A localStorage egy egyszerű példa, de biztonságosabb a httpOnly cookie.
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
    // ======================================================
    // === NÉZETVÁLTÁS ÉS ADATKEZELÉS (KIEGÉSZÍTVE) ===
    // ======================================================

    function switchToUserView() {
        guestView.style.display = 'none';
        adminView.style.display = 'none';
        userView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadUserData();
    }

    function switchToGuestView() {
        // Kijelentkezéskor töröljük a felhasználói adatokat
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');

        guestView.style.display = 'block';
        adminView.style.display = 'none';
        userView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
            // A backendet kell megvalósítani, hogy kezelje ezt a kérést!
            const response = await fetch('/api/sheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    // A tokent a headerben küldjük a hitelesítéshez
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify({ action: 'GET_USER_BEERS' })
            });
            const beers = await response.json();
            if (!response.ok) throw new Error(beers.error || 'Szerverhiba');
            
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
            userBeerTableBody.innerHTML = `<tr><td colspan="5" class="no-results">Még nem értékeltél egy sört sem.</td></tr>`;
            return;
        }

        beers.forEach(beer => {
            const row = `
                <tr>
                    <td>${beer.beerName}</td>
                    <td>${beer.type}</td>
                    <td>${beer.location}</td>
                    <td>${beer.beerPercentage || 0}%</td>
                    <td class="score-cell">${beer.score || 0}</td>
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
        const sum = beers.reduce((total, beer) => total + (parseFloat(beer.score) || 0), 0);
        const average = (sum / beers.length).toFixed(1);
        document.getElementById('userAverageScore').textContent = average;
    }

    // ======================================================
    // === INDEXELT ÁTLAG SZÁMÍTÁS ===
    // ======================================================

    function calculateIndexedAverage(beers = beersData) {
        if (!beers || beers.length === 0) return 0;
        
        // Az indexelt átlag az "avg" mezőből jön a sheet.js alapján
        const validAverages = beers
            .map(beer => parseFloat(beer.avg) || 0)
            .filter(avg => avg > 0);
        
        if (validAverages.length === 0) return 0;
        
        const sum = validAverages.reduce((total, avg) => total + avg, 0);
        return (sum / validAverages.length).toFixed(1);
    }

    function updateIndexedAverage() {
        const average = calculateIndexedAverage(filteredBeers.length > 0 ? filteredBeers : beersData);
        document.getElementById('indexedAverage').textContent = average;
        
        // Színek az átlag alapján
        const avgElement = document.getElementById('indexedAverage');
        const avgValue = parseFloat(average);
        
        if (avgValue >= 4.0) {
            avgElement.style.color = '#27ae60'; // Zöld - kiváló
        } else if (avgValue >= 3.0) {
            avgElement.style.color = '#f39c12'; // Sárga - jó
        } else if (avgValue >= 2.0) {
            avgElement.style.color = '#e67e22'; // Narancs - közepes
        } else {
            avgElement.style.color = '#e74c3c'; // Piros - gyenge
        }
    }

    // ======================================================
    // === MODERN ÉLŐKERESÉSI FUNKCIÓK ===
    // ======================================================

    function initializeLiveSearch() {
        liveSearchInput.addEventListener('input', handleLiveSearch);
        liveSearchInput.addEventListener('keydown', handleSearchKeyNavigation);
        liveSearchInput.addEventListener('focus', showSearchSuggestions);
        liveSearchInput.addEventListener('blur', hideSearchSuggestionsDelayed);
        clearSearch.addEventListener('click', clearSearchInput);
        
        // Kattintás a javaslatokon
        searchSuggestions.addEventListener('mousedown', handleSuggestionClick);
    }

    function handleLiveSearch() {
        const searchTerm = liveSearchInput.value.trim();
        
        // Clear gomb megjelenítése/elrejtése
        clearSearch.style.display = searchTerm ? 'flex' : 'none';
        
        if (!searchTerm) {
            filteredBeers = [...beersData];
            hideSearchSuggestions();
            updateSearchResultsInfo();
            updateIndexedAverage();
            renderBeerTable(filteredBeers);
            return;
        }

        // Keresés végrehajtása
        performLiveSearch(searchTerm);
        showSearchSuggestions();
        updateSearchResultsInfo();
        updateIndexedAverage();
    }

    function performLiveSearch(searchTerm) {
        const term = searchTerm.toLowerCase();
        
        filteredBeers = beersData.filter(beer => {
            return (beer.beerName?.toLowerCase() || '').includes(term) ||
                   (beer.type?.toLowerCase() || '').includes(term) ||
                   (beer.location?.toLowerCase() || '').includes(term) ||
                   (beer.ratedBy?.toLowerCase() || '').includes(term);
        });

        // Súlyozott rangsorolás (sör név > típus > hely > értékelő)
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
        const suggestions = new Set();
        
        beersData.forEach(beer => {
            // Sör nevek
            if (beer.beerName?.toLowerCase().includes(term)) {
                suggestions.add({
                    text: beer.beerName,
                    type: 'beer',
                    icon: '🍺'
                });
            }
            
            // Típusok
            if (beer.type?.toLowerCase().includes(term)) {
                suggestions.add({
                    text: beer.type,
                    type: 'type',
                    icon: '🏷️'
                });
            }
            
            // Helyek
            if (beer.location?.toLowerCase().includes(term)) {
                suggestions.add({
                    text: beer.location,
                    type: 'location',
                    icon: '📍'
                });
            }
            
            // Értékelők
            if (beer.ratedBy?.toLowerCase().includes(term)) {
                suggestions.add({
                    text: beer.ratedBy,
                    type: 'rater',
                    icon: '👤'
                });
            }
        });
        
        return Array.from(suggestions).slice(0, 6); // Max 6 javaslat
    }

    function showSearchSuggestions() {
        const searchTerm = liveSearchInput.value.trim();
        if (!searchTerm) {
            hideSearchSuggestions();
            return;
        }
        
        const suggestions = generateSearchSuggestions(searchTerm);
        
        if (suggestions.length === 0) {
            hideSearchSuggestions();
            return;
        }
        
        searchSuggestions.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}" data-text="${suggestion.text}">
                <span class="suggestion-icon">${suggestion.icon}</span>
                <span class="suggestion-text">${highlightSearchTerm(suggestion.text, searchTerm)}</span>
                <span class="suggestion-type">${getSuggestionTypeLabel(suggestion.type)}</span>
            </div>
        `).join('');
        
        searchSuggestions.style.display = 'block';
    }

    function hideSearchSuggestions() {
        searchSuggestions.style.display = 'none';
        selectedSuggestionIndex = -1;
    }

    function hideSearchSuggestionsDelayed() {
        setTimeout(() => hideSearchSuggestions(), 150);
    }

    function handleSearchKeyNavigation(e) {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, suggestions.length - 1);
            updateSelectedSuggestion();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
            updateSelectedSuggestion();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
                selectSuggestion(suggestions[selectedSuggestionIndex].dataset.text);
            }
        } else if (e.key === 'Escape') {
            hideSearchSuggestions();
            liveSearchInput.blur();
        }
    }

    function updateSelectedSuggestion() {
        const suggestions = searchSuggestions.querySelectorAll('.suggestion-item');
        suggestions.forEach((item, index) => {
            item.classList.toggle('selected', index === selectedSuggestionIndex);
        });
    }

    function handleSuggestionClick(e) {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            selectSuggestion(suggestionItem.dataset.text);
        }
    }

    function selectSuggestion(text) {
        liveSearchInput.value = text;
        hideSearchSuggestions();
        handleLiveSearch();
        liveSearchInput.focus();
    }

    function clearSearchInput() {
        liveSearchInput.value = '';
        clearSearch.style.display = 'none';
        filteredBeers = [...beersData];
        hideSearchSuggestions();
        updateSearchResultsInfo();
        updateIndexedAverage();
        renderBeerTable(filteredBeers);
        liveSearchInput.focus();
    }

    function updateSearchResultsInfo() {
        const total = beersData.length;
        const filtered = filteredBeers.length;
        const searchTerm = liveSearchInput.value.trim();
        
        if (!searchTerm) {
            searchResultsInfo.textContent = `${total} sör összesen`;
        } else if (filtered === 0) {
            searchResultsInfo.textContent = `Nincs találat "${searchTerm}" keresésre`;
            searchResultsInfo.style.color = '#e74c3c';
        } else if (filtered === total) {
            searchResultsInfo.textContent = `${total} sör megjelenítve`;
            searchResultsInfo.style.color = '#27ae60';
        } else {
            searchResultsInfo.textContent = `${filtered} találat ${total} sörből`;
            searchResultsInfo.style.color = '#3498db';
        }
    }

    // ======================================================
    // === SEGÉDFÜGGVÉNYEK A KERESÉSHEZ ===
    // ======================================================

    function highlightSearchTerm(text, searchTerm) {
        if (!searchTerm) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    function getSuggestionTypeLabel(type) {
        const labels = {
            'beer': 'Sör név',
            'type': 'Típus',
            'location': 'Hely',
            'rater': 'Értékelő'
        };
        return labels[type] || '';
    }

    // ======================================================
    // === KI TESZTELTE FUNKCIÓ ===
    // ======================================================

    function getTestedBy(ratedBy) {
        const testers = {
            'admin1': 'Gabz',
            'admin2': 'Lajos'
        };
        return testers[ratedBy] || ratedBy;
    }

    // ======================================================
    // === ADATMEGJELENÍTÉS (FRISSÍTETT) ===
    // ======================================================

    function renderBeerTable(beersToRender) {
        beerTableBody.innerHTML = '';
        
        if (!beersToRender || beersToRender.length === 0) {
            const searchTerm = liveSearchInput.value.trim();
            const message = searchTerm ? 
                `Nincs a "${searchTerm}" keresésnek megfelelő sör.` : 
                'Nincsenek sörök az adatbázisban.';
            beerTableBody.innerHTML = `<tr><td colspan="7" class="no-results">${message}</td></tr>`;
            return;
        }

        const searchTerm = liveSearchInput.value.trim().toLowerCase();
        
        beersToRender.forEach(beer => {
            const row = document.createElement('tr');
            
            // Kiemelés a keresett kifejezésnek
            const highlightText = (text) => {
                if (!searchTerm || !text) return text || '';
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                return text.replace(regex, '<mark>$1</mark>');
            };
            
            row.innerHTML = `
                <td>${highlightText(beer.beerName)}</td>
                <td>${highlightText(beer.type)}</td>
                <td>${highlightText(beer.location)}</td>
                <td>${beer.beerPercentage || 0}%</td>
                <td class="score-cell">${beer.score || 0}</td>
                <td class="indexed-avg-cell">${beer.avg || 0}</td>
                <td class="tester-cell">${highlightText(getTestedBy(beer.ratedBy))}</td>
            `;
            
            // Animáció a megjelenéshez
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';
            beerTableBody.appendChild(row);
            
            // Smooth megjelenés
            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 50);
        });
    }

    function loadAdminData() {
        document.getElementById('userCount').textContent = usersData.length;
        document.getElementById('beerCount').textContent = beersData.length;
        filteredBeers = [...beersData];
        renderBeerTable(filteredBeers);
        updateSearchResultsInfo();
        updateIndexedAverage();
    }
    
    // ======================================================
    // === NÉZETVÁLTÁS ÉS ESEMÉNYKEZELŐK ===
    // ======================================================

    function switchToAdminView() {
        guestView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData();
        initializeLiveSearch();
    }

    function switchToGuestView() {
        guestView.style.display = 'block';
        adminView.style.display = 'none';
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        liveSearchInput.value = '';
        hideSearchSuggestions();
    }

    // --- Eseménykezelők ---
    adminForm.addEventListener('submit', handleAdminLogin);
    logoutBtn.addEventListener('click', switchToGuestView);
    refreshBtn.addEventListener('click', loadAdminData);

    // ... a többi, változatlan eseménykezelő ...
    adminBtn.addEventListener('click', () => { adminModal.classList.add('active'); document.body.style.overflow = 'hidden'; });
    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() { adminModal.classList.remove('active'); document.body.style.overflow = 'auto'; }
    switchAuthLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); if (this.dataset.target === 'register') { loginCard.classList.remove('active'); setTimeout(() => registerCard.classList.add('active'), 300); } else { registerCard.classList.remove('active'); setTimeout(() => loginCard.classList.add('active'), 300); } }); });
    loginForm.addEventListener('submit', handleGuestLogin);
    registerForm.addEventListener('submit', handleGuestRegister);
    userLogoutBtn.addEventListener('click', switchToGuestView); // Kijelentkezés
    
    // ======================================================
    // === SEGÉDFÜGGVÉNYEK (VÁLTOZATLAN) ===
    // ======================================================
    function setLoading(button, isLoading) { button.classList.toggle('loading', isLoading); button.disabled = isLoading; }
    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showNotification(message, type) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; Object.assign(notification.style, { position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px', color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)', transition: 'transform 0.3s ease', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db') }); document.body.appendChild(notification); setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100); setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); }, 3000); }
    
    console.log('🍺 Gabz és Lajos Sör Táblázat alkalmazás betöltve! (Modern élőkereséssel és indexelt átlaggal)');
});

