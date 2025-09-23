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
    const changePasswordForm = document.getElementById('changePasswordForm');
    const deleteUserBtn = document.getElementById('deleteUserBtn');
    
    // STATISZTIKA ELEMEK
    const statsView = document.getElementById('statsView');
    const statTabButtons = document.getElementById('statTabButtons');
    const statPanes = document.querySelectorAll('.stat-pane');
    
    const loginCard = document.getElementById('loginCard'), registerCard = document.getElementById('registerCard'), switchAuthLinks = document.querySelectorAll('.switch-auth'), adminBtn = document.getElementById('adminBtn'), adminModal = document.getElementById('adminModal'), modalClose = document.getElementById('modalClose'), logoutBtn = document.getElementById('logoutBtn'), refreshBtn = document.getElementById('refreshBtn');

    // --- ÁLLAPOT ---
    let beersData = [];
    let usersData = [];
    let filteredBeers = [];
    let selectedSuggestionIndex = -1;
    let charts = {};

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
                body: JSON.stringify({ action: 'ADD_USER_BEER', beerName, type, location, look, smell, taste, notes })
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
        guestView.style.display = 'none';
        adminView.style.display = 'none';
        userView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadUserData();
    }

    function switchToGuestView() {
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
                    <td class="score-cell">${beer.totalScore || 0}</td>
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
        guestView.style.display = 'none';
        userView.style.display = 'none';
        adminView.style.display = 'block';
        document.body.style.background = '#f8fafc';
        loadAdminData();
        initializeLiveSearch();
        setupStatistics(); // Statisztika fül inicializálása
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

    adminBtn.addEventListener('click', () => { adminModal.classList.add('active'); document.body.style.overflow = 'hidden'; });
    modalClose.addEventListener('click', closeAdminModal);
    adminModal.addEventListener('click', e => { if (e.target === adminModal) closeAdminModal(); });
    function closeAdminModal() { adminModal.classList.remove('active'); document.body.style.overflow = 'auto'; }
    switchAuthLinks.forEach(link => { link.addEventListener('click', function(e) { e.preventDefault(); if (this.dataset.target === 'register') { loginCard.classList.remove('active'); setTimeout(() => registerCard.classList.add('active'), 300); } else { registerCard.classList.remove('active'); setTimeout(() => loginCard.classList.add('active'), 300); } }); });
    
    // --- SEGÉDFÜGGVÉNYEK ---
    function setLoading(button, isLoading) { button.classList.toggle('loading', isLoading); button.disabled = isLoading; }
    function showError(message) { showNotification(message, 'error'); }
    function showSuccess(message) { showNotification(message, 'success'); }
    function showNotification(message, type) { const notification = document.createElement('div'); notification.className = `notification ${type}`; notification.textContent = message; Object.assign(notification.style, { position: 'fixed', top: '20px', right: '20px', padding: '15px 20px', borderRadius: '10px', color: 'white', fontWeight: '500', zIndex: '10000', transform: 'translateX(400px)', transition: 'transform 0.3s ease', backgroundColor: type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db') }); document.body.appendChild(notification); setTimeout(() => { notification.style.transform = 'translateX(0)'; }, 100); setTimeout(() => { notification.style.transform = 'translateX(400px)'; setTimeout(() => { if (notification.parentNode) { notification.parentNode.removeChild(notification); } }, 300); }, 4000); }
    
    console.log('🍺 Gabz és Lajos Sör Táblázat alkalmazás betöltve!');
});
