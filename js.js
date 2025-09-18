// Beer Rating Application JavaScript
class BeerApp {
    constructor() {
        this.currentTab = 'filter';
        this.beers = [];
        this.userProfile = {
            name: 'Felhasználó',
            level: 1,
            points: 0,
            tasteProfile: {
                bitterness: 5,
                sweetness: 5,
                sourness: 5,
                hoppiness: 5,
                maltiness: 5
            },
            favorites: [],
            tried: [],
            wishlist: []
        };
        this.achievements = [];
        this.filters = {
            type: '',
            alcoholRange: 15,
            priceRange: 5000,
            rating: 0
        };
        
        this.initializeApp();
        this.loadSampleData();
    }

    initializeApp() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updateUserInterface();
        this.initializeTasteProfile();
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Filter controls
        const beerType = document.getElementById('beer-type');
        const alcoholRange = document.getElementById('alcohol-range');
        const priceRange = document.getElementById('price-range');
        
        if (beerType) beerType.addEventListener('change', this.applyFilters.bind(this));
        if (alcoholRange) {
            alcoholRange.addEventListener('input', this.updateRangeValue.bind(this));
            alcoholRange.addEventListener('change', this.applyFilters.bind(this));
        }
        if (priceRange) {
            priceRange.addEventListener('input', this.updateRangeValue.bind(this));
            priceRange.addEventListener('change', this.applyFilters.bind(this));
        }

        // Rating filter
        document.querySelectorAll('.rating-filter i').forEach((star, index) => {
            star.addEventListener('click', () => {
                this.setRatingFilter(index + 1);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('search-input');
        const searchBtn = document.getElementById('search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.performSearch.bind(this));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }
        if (searchBtn) searchBtn.addEventListener('click', this.performSearch.bind(this));

        // Filter tags
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                this.setSearchFilter(e.target.dataset.filter);
            });
        });

        // Comparison
        const compareBtn = document.getElementById('compare-btn');
        if (compareBtn) compareBtn.addEventListener('click', this.compareBeers.bind(this));

        // Random beer
        const randomBtn = document.getElementById('random-beer-btn');
        if (randomBtn) randomBtn.addEventListener('click', this.getRandomBeer.bind(this));

        // Prediction
        const predictBtn = document.getElementById('predict-btn');
        if (predictBtn) predictBtn.addEventListener('click', this.predictRating.bind(this));

        // Taste profile
        const saveTasteBtn = document.getElementById('save-taste-profile');
        if (saveTasteBtn) saveTasteBtn.addEventListener('click', this.saveTasteProfile.bind(this));

        // Taste sliders
        document.querySelectorAll('.taste-slider input[type="range"]').forEach(slider => {
            slider.addEventListener('input', this.updateTasteValue.bind(this));
        });

        // Head-to-head
        const h2hBtn = document.getElementById('start-h2h-battle');
        if (h2hBtn) h2hBtn.addEventListener('click', this.startHeadToHeadBattle.bind(this));

        // Ranking tabs
        document.querySelectorAll('.ranking-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchRankingTab(e.target.dataset.ranking);
            });
        });
    }

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // Update button states
                navBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update tab content
                tabContents.forEach(tab => tab.classList.remove('active'));
                const targetContent = document.getElementById(targetTab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                this.currentTab = targetTab;
                this.loadTabContent(targetTab);
            });
        });
    }

    switchTab(tabName) {
        const navBtns = document.querySelectorAll('.nav-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName);
        });

        this.currentTab = tabName;
        this.loadTabContent(tabName);
    }

    loadTabContent(tabName) {
        switch(tabName) {
            case 'filter':
                this.loadFilteredBeers();
                break;
            case 'search':
                this.loadSearchResults();
                break;
            case 'recommendations':
                this.loadRecommendations();
                break;
            case 'rankings':
                this.loadRankings();
                break;
            case 'statistics':
                this.loadStatistics();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
            // Add more cases as needed
        }
    }

    loadSampleData() {
        this.beers = [
            {
                id: 1,
                name: 'Dreher Classic',
                type: 'lager',
                alcohol: 5.2,
                price: 350,
                rating: 4.2,
                description: 'Klasszikus magyar világos sör',
                brewery: 'Dreher',
                country: 'Magyarország',
                taste: { bitterness: 6, sweetness: 3, sourness: 2, hoppiness: 5, maltiness: 7 },
                image: 'dreher-classic.jpg'
            },
            {
                id: 2,
                name: 'Guinness Draught',
                type: 'stout',
                alcohol: 4.2,
                price: 850,
                rating: 4.8,
                description: 'Ír fekete sör krémszerű habbal',
                brewery: 'Guinness',
                country: 'Írország',
                taste: { bitterness: 8, sweetness: 2, sourness: 1, hoppiness: 6, maltiness: 9 },
                image: 'guinness.jpg'
            },
            {
                id: 3,
                name: 'Heineken',
                type: 'lager',
                alcohol: 5.0,
                price: 450,
                rating: 4.0,
                description: 'Holland prémium világos sör',
                brewery: 'Heineken',
                country: 'Hollandia',
                taste: { bitterness: 5, sweetness: 4, sourness: 2, hoppiness: 6, maltiness: 6 },
                image: 'heineken.jpg'
            },
            {
                id: 4,
                name: 'Paulaner Weissbier',
                type: 'wheat',
                alcohol: 5.5,
                price: 650,
                rating: 4.6,
                description: 'Bajor búzasör természetes zavarossággal',
                brewery: 'Paulaner',
                country: 'Németország',
                taste: { bitterness: 3, sweetness: 6, sourness: 3, hoppiness: 4, maltiness: 8 },
                image: 'paulaner.jpg'
            },
            {
                id: 5,
                name: 'IPA Craft Beer',
                type: 'ale',
                alcohol: 6.8,
                price: 890,
                rating: 4.4,
                description: 'Erősen komlózott kézműves sör',
                brewery: 'Local Brewery',
                country: 'Magyarország',
                taste: { bitterness: 9, sweetness: 2, sourness: 4, hoppiness: 10, maltiness: 5 },
                image: 'ipa.jpg'
            }
        ];

        this.achievements = [
            { id: 1, name: 'Első korty', description: 'Értékeld az első söröd', unlocked: false, icon: 'fas fa-baby' },
            { id: 2, name: 'Sör guru', description: 'Értékelj 50 sört', unlocked: false, icon: 'fas fa-graduation-cap' },
            { id: 3, name: 'Világjáró', description: 'Próbálj sört 10 különböző országból', unlocked: false, icon: 'fas fa-globe' },
            { id: 4, name: 'Ízlés fejlesztő', description: 'Állítsd be a teljes ízprofilt', unlocked: false, icon: 'fas fa-palette' },
            { id: 5, name: 'Párbaj bajnok', description: 'Nyerj 10 fej-fej melletti párbajt', unlocked: false, icon: 'fas fa-crown' }
        ];

        this.updateUserInterface();
    }

    updateUserInterface() {
        // Update user info
        document.getElementById('username').textContent = this.userProfile.name;
        document.getElementById('user-level').textContent = `Szint: ${this.userProfile.level}`;
        document.getElementById('user-points').textContent = `Pontok: ${this.userProfile.points}`;
    }

    updateRangeValue(event) {
        const input = event.target;
        const valueSpan = document.getElementById(input.id.replace('-range', '-value'));
        let value = input.value;
        
        if (input.id === 'price-range') {
            value += ' Ft';
        } else if (input.id === 'alcohol-range') {
            value += '%';
        }
        
        if (valueSpan) valueSpan.textContent = value;
        
        this.filters[input.id.replace('-range', 'Range')] = input.value;
    }

    setRatingFilter(rating) {
        const stars = document.querySelectorAll('.rating-filter i');
        stars.forEach((star, index) => {
            star.classList.toggle('active', index < rating);
        });
        this.filters.rating = rating;
        this.applyFilters();
    }

    applyFilters() {
        this.filters.type = document.getElementById('beer-type')?.value || '';
        this.loadFilteredBeers();
    }

    loadFilteredBeers() {
        const filteredBeers = this.beers.filter(beer => {
            return (!this.filters.type || beer.type === this.filters.type) &&
                   beer.alcohol <= this.filters.alcoholRange &&
                   beer.price <= this.filters.priceRange &&
                   beer.rating >= this.filters.rating;
        });

        this.displayBeers(filteredBeers, 'filtered-beers');
    }

    displayBeers(beers, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = beers.map(beer => `
            <div class="beer-card" data-beer-id="${beer.id}">
                <div class="beer-image">
                    <i class="fas fa-beer" style="font-size: 3rem; color: var(--accent-color);"></i>
                </div>
                <div class="beer-info">
                    <h3>${beer.name}</h3>
                    <p class="brewery">${beer.brewery} - ${beer.country}</p>
                    <p class="beer-type">${this.getBeerTypeInHungarian(beer.type)}</p>
                    <div class="beer-stats">
                        <span class="alcohol">${beer.alcohol}%</span>
                        <span class="price">${beer.price} Ft</span>
                        <span class="rating">
                            ${this.generateStars(beer.rating)} ${beer.rating}
                        </span>
                    </div>
                    <p class="description">${beer.description}</p>
                    <div class="beer-actions">
                        <button class="btn-favorite ${this.userProfile.favorites.includes(beer.id) ? 'active' : ''}" 
                                onclick="app.toggleFavorite(${beer.id})">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button class="btn-tried ${this.userProfile.tried.includes(beer.id) ? 'active' : ''}" 
                                onclick="app.toggleTried(${beer.id})">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-wishlist ${this.userProfile.wishlist.includes(beer.id) ? 'active' : ''}" 
                                onclick="app.toggleWishlist(${beer.id})">
                            <i class="fas fa-bookmark"></i>
                        </button>
                        <button class="btn-rate" onclick="app.rateBeer(${beer.id})">
                            <i class="fas fa-star"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add click events to beer cards
        container.querySelectorAll('.beer-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('.beer-actions')) {
                    this.showBeerDetails(parseInt(card.dataset.beerId));
                }
            });
        });
    }

    getBeerTypeInHungarian(type) {
        const types = {
            'lager': 'Világos sör',
            'ale': 'Ale',
            'stout': 'Fekete sör',
            'porter': 'Porter',
            'wheat': 'Búzasör'
        };
        return types[type] || type;
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        let stars = '';
        
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    performSearch() {
        const query = document.getElementById('search-input')?.value.toLowerCase() || '';
        const activeFilter = document.querySelector('.filter-tag.active')?.dataset.filter || 'all';
        
        let searchResults = this.beers.filter(beer => {
            const matchesQuery = !query || 
                beer.name.toLowerCase().includes(query) ||
                beer.brewery.toLowerCase().includes(query) ||
                beer.description.toLowerCase().includes(query) ||
                beer.country.toLowerCase().includes(query);
            
            const matchesFilter = activeFilter === 'all' ||
                (activeFilter === 'favorites' && this.userProfile.favorites.includes(beer.id)) ||
                (activeFilter === 'tried' && this.userProfile.tried.includes(beer.id)) ||
                (activeFilter === 'wishlist' && this.userProfile.wishlist.includes(beer.id));
            
            return matchesQuery && matchesFilter;
        });

        this.displayBeers(searchResults, 'search-results');
    }

    setSearchFilter(filter) {
        document.querySelectorAll('.filter-tag').forEach(tag => {
            tag.classList.toggle('active', tag.dataset.filter === filter);
        });
        this.performSearch();
    }

    loadRecommendations() {
        // Simulate AI-based recommendations
        const tasteRecommendations = this.getRecommendation
