/* ======================================================
   🏓🍺 SÖRPONG ARÉNA MODUL
   ------------------------------------------------------
   - Csapatsorsolás animációval
   - Élő meccs pohár-piramissal, dobás animációkkal
   - Nagyon részletes meccs statisztika (Chart.js)
   - Egyéni és csapat leaderboard
   - Tournament: kieséses ágrajz VAGY körmérkőzés,
     egyéni és csapat módban
   - Google Sheets szinkron (BEERPONG_* API akciók),
     offline cache localStorage-ben
   - Minden adat profilhoz (email) kötött: csak az látja,
     akinek a profilján a játék elindult.
====================================================== */
(function () {
'use strict';

const BP_API_URL = '/api/sheet';

// ---------- SEGÉDFÜGGVÉNYEK ----------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

const uid = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);

const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

const pct = (part, whole) => whole > 0 ? Math.round((part / whole) * 100) : 0;

const fmtDuration = (sec) => {
    sec = Math.max(0, Math.round(sec || 0));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};

const fmtDate = (iso) => {
    try {
        return new Date(iso).toLocaleString('hu-HU', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (e) { return iso || ''; }
};

const TEAM_PRE = ['Habzó', 'Részeg', 'Villám', 'Arany', 'Tüzes', 'Jeges', 'Vad', 'Bátor',
    'Legendás', 'Szomjas', 'Turbó', 'Pörgős', 'Krémes', 'Ördögi'];
const TEAM_POST = ['Oroszlánok', 'Sörcápák', 'Hurrikánok', 'Vikingek', 'Titánok', 'Sárkányok',
    'Pumák', 'Kobrák', 'Bikák', 'Farkasok', 'Gladiátorok', 'Mesterlövészek', 'Kalózok', 'Hódok'];
const TEAM_EMOJI = ['🦁', '🦈', '🐉', '🐺', '🦅', '🐯', '🦖', '🐙', '🦍', '🐸', '🦊', '🐻', '🏴‍☠️', '🦉'];
const PLAYER_EMOJI = ['😎', '🤠', '🥳', '😈', '🤖', '👽', '🦸', '🧙', '🥷', '🧛', '🤡', '👻', '🐵', '🦄', '🍀', '⚡'];

const randTeamName = () => `${TEAM_PRE[Math.floor(Math.random() * TEAM_PRE.length)]} ${TEAM_POST[Math.floor(Math.random() * TEAM_POST.length)]}`;
const randTeamEmoji = () => TEAM_EMOJI[Math.floor(Math.random() * TEAM_EMOJI.length)];
const emojiForName = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return PLAYER_EMOJI[h % PLAYER_EMOJI.length];
};

// Pohár elrendezés tetszőleges darabszámra (1-20): piramis-szerű sorok,
// pl. 6 -> [3,2,1], 10 -> [4,3,2,1], 7 -> [4,3], 20 -> [6,5,4,3,2]
const MIN_CUPS = 1, MAX_CUPS = 20;
const clampCups = (n) => Math.max(MIN_CUPS, Math.min(MAX_CUPS, Math.round(Number(n) || 6)));

const cupRows = (n) => {
    n = clampCups(n);
    let k = 1;
    while ((k * (k + 1)) / 2 < n) k++;
    const rows = [];
    let remaining = n;
    for (let size = k; size >= 1 && remaining > 0; size--) {
        const take = Math.min(remaining, size);
        rows.push(take);
        remaining -= take;
    }
    return rows;
};

// Pohárszám választó (gyorsgombok + léptető + mini előnézet)
const CUP_PRESETS = [3, 6, 10, 15, 20];
function cupsPickerHtml(value, prefix) {
    return `
    <div class="bp-cups-picker">
        <div class="bp-seg">
            ${CUP_PRESETS.map(v => `<button class="bp-seg-btn bp-seg-cup ${value === v ? 'active' : ''}" data-bp="${prefix}-set" data-val="${v}">${v}</button>`).join('')}
        </div>
        <div class="bp-stepper">
            <button class="bp-step-btn" data-bp="${prefix}-adj" data-delta="-1" ${value <= MIN_CUPS ? 'disabled' : ''}>−</button>
            <span class="bp-step-val">${value} pohár</span>
            <button class="bp-step-btn" data-bp="${prefix}-adj" data-delta="1" ${value >= MAX_CUPS ? 'disabled' : ''}>+</button>
        </div>
        <div class="bp-cup-preview">
            ${cupRows(value).map(r => `<div class="bp-cup-preview-row">${'<span></span>'.repeat(r)}</div>`).join('')}
        </div>
    </div>`;
}

// ---------- ÁLLAPOT ----------

const BP = {
    email: null,
    inited: false,
    loading: false,
    loadError: null,
    missingSheet: false,
    roster: { players: [] },        // { players: [{id, name, emoji}] }
    games: [],                      // befejezett meccsek
    tournaments: [],
    view: 'home',
    setup: null,                    // új meccs beállító állapot
    game: null,                     // aktív meccs
    statsGame: null,                // épp megtekintett meccs statisztika
    statsBackView: 'home',
    historyOpenId: null,
    lbTab: 'egyeni',
    lbSort: { key: 'wins', dir: -1 },
    thrower: null,                  // { team, player }
    bounceMode: false,
    activeTournamentId: null,
    tourForm: null,
    timerInt: null,
    charts: {},
    fullscreen: false
};

// ---------- TOAST ----------

function bpToast(message, type = 'info') {
    const n = document.createElement('div');
    n.className = 'bp-toast';
    n.textContent = message;
    n.style.backgroundColor = type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#3498db');
    document.body.appendChild(n);
    requestAnimationFrame(() => n.classList.add('show'));
    setTimeout(() => {
        n.classList.remove('show');
        setTimeout(() => n.remove(), 400);
    }, 3500);
}

// ---------- API + OFFLINE CACHE ----------

async function bpApi(payload) {
    const res = await fetch(BP_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('userToken')}`
        },
        body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    // 202 = a service worker offline queue-ba tette a kérést
    if (res.status === 202 && data.queued) return { queued: true };
    if (!res.ok) {
        const err = new Error(data.error || 'Hálózati hiba történt.');
        err.missingSheet = !!data.missingSheet;
        throw err;
    }
    return data;
}

const cacheKey = () => `bp_cache_${BP.email}`;
const draftKey = () => `bp_active_${BP.email}`;

function writeCache() {
    try {
        localStorage.setItem(cacheKey(), JSON.stringify({
            roster: BP.roster, games: BP.games, tournaments: BP.tournaments
        }));
    } catch (e) { /* betelt a localStorage - nem végzetes */ }
}

function readCache() {
    try { return JSON.parse(localStorage.getItem(cacheKey()) || 'null'); }
    catch (e) { return null; }
}

function saveDraft() {
    try {
        if (BP.game && BP.game.winner == null) {
            localStorage.setItem(draftKey(), JSON.stringify(BP.game));
        } else {
            localStorage.removeItem(draftKey());
        }
    } catch (e) {}
}

function readDraft() {
    try { return JSON.parse(localStorage.getItem(draftKey()) || 'null'); }
    catch (e) { return null; }
}

function clearDraft() {
    try { localStorage.removeItem(draftKey()); } catch (e) {}
}

async function loadData() {
    BP.loading = true;
    BP.loadError = null;
    BP.missingSheet = false;
    renderView();
    try {
        const data = await bpApi({ action: 'BEERPONG_GET' });
        BP.roster = data.roster && Array.isArray(data.roster.players) ? data.roster : { players: [] };
        BP.games = (data.games || []).filter(g => g && g.id);
        BP.tournaments = (data.tournaments || []).filter(t => t && t.id);
        sortGames();
        writeCache();
    } catch (err) {
        BP.missingSheet = !!err.missingSheet;
        const cached = readCache();
        if (cached && !err.missingSheet) {
            BP.roster = cached.roster || { players: [] };
            BP.games = cached.games || [];
            BP.tournaments = cached.tournaments || [];
            sortGames();
            bpToast('Offline mód: mentett sörpong adatok betöltve. 📦', 'info');
        } else {
            BP.loadError = err.message;
        }
    }
    BP.loading = false;
    renderView();
}

function sortGames() {
    BP.games.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function persistRoster() {
    writeCache();
    bpApi({ action: 'BEERPONG_SAVE', type: 'roster', id: 'roster', data: BP.roster })
        .then(r => { if (r.queued) bpToast('Offline: a játékoslista szinkronizálása sorban áll. 📡'); })
        .catch(err => bpToast('Játékoslista mentési hiba: ' + err.message, 'error'));
}

function persistGame(game) {
    writeCache();
    bpApi({ action: 'BEERPONG_SAVE', type: 'game', id: game.id, data: game })
        .then(r => { if (r.queued) bpToast('Offline: a meccs mentése sorban áll. 📡'); })
        .catch(err => bpToast('Meccs mentési hiba: ' + err.message, 'error'));
}

function persistTournament(t) {
    writeCache();
    bpApi({ action: 'BEERPONG_SAVE', type: 'tournament', id: t.id, data: t })
        .then(r => { if (r.queued) bpToast('Offline: a bajnokság mentése sorban áll. 📡'); })
        .catch(err => bpToast('Bajnokság mentési hiba: ' + err.message, 'error'));
}

// ---------- STATISZTIKA SZÁMÍTÁS ----------

// Egy meccs dobásaiból játékosonkénti statisztika
function gamePlayerStats(game) {
    const stats = {};
    const ensure = (p, team) => {
        if (!stats[p]) stats[p] = { name: p, team, throws: 0, hits: 0, bounces: 0, misses: 0, cups: 0, bestStreak: 0, curStreak: 0 };
        return stats[p];
    };
    (game.teams || []).forEach((t, ti) => (t.players || []).forEach(p => ensure(p, ti)));
    (game.throws || []).forEach(th => {
        const s = ensure(th.p, th.team);
        s.throws++;
        if (th.r === 'miss') {
            s.misses++;
            s.curStreak = 0;
        } else {
            if (th.r === 'bounce') s.bounces++; else s.hits++;
            s.cups += (th.cups || []).length;
            s.curStreak++;
            if (s.curStreak > s.bestStreak) s.bestStreak = s.curStreak;
        }
    });
    return stats;
}

function gameTeamStats(game) {
    const pl = gamePlayerStats(game);
    return (game.teams || []).map((t, ti) => {
        const members = Object.values(pl).filter(s => s.team === ti);
        const throws = members.reduce((a, s) => a + s.throws, 0);
        const hits = members.reduce((a, s) => a + s.hits + s.bounces, 0);
        const cups = members.reduce((a, s) => a + s.cups, 0);
        const bestStreak = members.reduce((a, s) => Math.max(a, s.bestStreak), 0);
        return { name: t.name, emoji: t.emoji, throws, hits, cups, bestStreak, hitPct: pct(hits, throws) };
    });
}

function gameMvp(game) {
    if (game.winner == null) return null;
    const pl = Object.values(gamePlayerStats(game)).filter(s => s.team === game.winner);
    pl.sort((a, b) => b.cups - a.cups || pct(b.hits + b.bounces, b.throws) - pct(a.hits + a.bounces, a.throws));
    return pl[0] && pl[0].cups > 0 ? pl[0] : (pl[0] || null);
}

// Összesített egyéni leaderboard az összes befejezett meccsből
function buildIndividualLeaderboard() {
    const map = {};
    const ensure = (name) => {
        if (!map[name]) map[name] = { name, games: 0, wins: 0, throws: 0, hits: 0, cups: 0, bestStreak: 0, mvps: 0 };
        return map[name];
    };
    BP.games.forEach(g => {
        if (g.winner == null) return;
        const pl = gamePlayerStats(g);
        const mvp = gameMvp(g);
        Object.values(pl).forEach(s => {
            const e = ensure(s.name);
            e.games++;
            if (s.team === g.winner) e.wins++;
            e.throws += s.throws;
            e.hits += s.hits + s.bounces;
            e.cups += s.cups;
            if (s.bestStreak > e.bestStreak) e.bestStreak = s.bestStreak;
        });
        if (mvp) ensure(mvp.name).mvps++;
    });
    const list = Object.values(map);
    list.forEach(e => {
        e.winPct = pct(e.wins, e.games);
        e.hitPct = pct(e.hits, e.throws);
    });
    return list;
}

// Csapat leaderboard: a csapatot a (rendezett) tagnévsor azonosítja
function buildTeamLeaderboard() {
    const map = {};
    BP.games.forEach(g => {
        if (g.winner == null) return;
        const ts = gameTeamStats(g);
        (g.teams || []).forEach((t, ti) => {
            const key = [...(t.players || [])].map(p => p.toLowerCase()).sort().join('|');
            if (!key) return;
            if (!map[key]) map[key] = { key, name: t.name, emoji: t.emoji, players: t.players, games: 0, wins: 0, cups: 0, throws: 0, hits: 0 };
            const e = map[key];
            e.name = t.name;      // a legutóbbi csapatnév marad
            e.emoji = t.emoji;
            e.games++;
            if (ti === g.winner) e.wins++;
            e.cups += ts[ti].cups;
            e.throws += ts[ti].throws;
            e.hits += ts[ti].hits;
        });
    });
    const list = Object.values(map);
    list.forEach(e => {
        e.winPct = pct(e.wins, e.games);
        e.hitPct = pct(e.hits, e.throws);
    });
    list.sort((a, b) => b.wins - a.wins || b.winPct - a.winPct || b.cups - a.cups);
    return list;
}

function playerQuickStats(name) {
    let games = 0, wins = 0, throws = 0, hits = 0;
    BP.games.forEach(g => {
        if (g.winner == null) return;
        const pl = gamePlayerStats(g)[name];
        if (!pl) return;
        games++;
        if (pl.team === g.winner) wins++;
        throws += pl.throws;
        hits += pl.hits + pl.bounces;
    });
    return { games, wins, hitPct: pct(hits, throws) };
}

// ---------- INICIALIZÁLÁS / TAB HOOK ----------

function currentUserEmail() {
    try {
        const ud = JSON.parse(localStorage.getItem('userData') || 'null');
        return ud && ud.email ? ud.email : null;
    } catch (e) { return null; }
}

function initBeerPong() {
    const email = currentUserEmail();
    const root = document.getElementById('beerpong-root');
    if (!root) return;

    if (!email) {
        root.innerHTML = '<div class="bp-empty card"><p>A Sörpong Arénához be kell jelentkezned. 🔐</p></div>';
        BP.inited = false;
        return;
    }

    // Ha másik felhasználó lépett be, mindent újratöltünk
    if (BP.inited && BP.email === email) return;

    BP.email = email;
    BP.inited = true;
    BP.view = 'home';
    BP.game = null;
    BP.setup = null;
    BP.activeTournamentId = null;

    renderShell();
    loadData();
}

// A tabra kattintáskor lusta inicializálás - nem kell a js.js-t módosítani
document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab-content="user-beerpong-content"]');
    if (btn) setTimeout(initBeerPong, 30);
});

// Kívülről is hívható (pl. ha a js.js-ből akarnád indítani)
window.initBeerPongTab = initBeerPong;

// ---------- SHELL + AL-NAVIGÁCIÓ ----------

const SUBNAV = [
    { id: 'home', icon: '🏠', label: 'Kezdőlap' },
    { id: 'setup', icon: '🎯', label: 'Új meccs' },
    { id: 'tournament', icon: '🏆', label: 'Bajnokság' },
    { id: 'players', icon: '👥', label: 'Játékosok' },
    { id: 'history', icon: '📜', label: 'Előzmények' },
    { id: 'leaderboard', icon: '🥇', label: 'Toplista' }
];

function renderShell() {
    const root = document.getElementById('beerpong-root');
    if (!root) return;
    root.innerHTML = `
        <div class="bp-shell">
            <div class="bp-hero">
                <div class="bp-bubbles">${'<span class="bp-bubble"></span>'.repeat(12)}</div>
                <div class="bp-hero-inner">
                    <div class="bp-hero-ball">🏓</div>
                    <div>
                        <h2 class="bp-hero-title">Sörpong Aréna</h2>
                        <p class="bp-hero-sub">Sorsolt csapatok · élő meccsek · bajnokságok · toplisták</p>
                    </div>
                    <div class="bp-hero-cup">🍺</div>
                    <button class="bp-help-btn" data-bp="help" title="Útmutató">❓</button>
                </div>
            </div>
            <nav class="bp-subnav" id="bp-subnav"></nav>
            <div class="bp-view" id="bp-view"></div>
        </div>
    `;
    if (!root.dataset.bpBound) {
        root.dataset.bpBound = '1';
        root.addEventListener('click', handleRootClick);
    }
    renderSubnav();
}

function renderSubnav() {
    const nav = document.getElementById('bp-subnav');
    if (!nav) return;
    const liveBtn = BP.game && BP.game.winner == null
        ? `<button class="bp-pill bp-pill-live ${BP.view === 'game' ? 'active' : ''}" data-bp="nav" data-view="game"><span class="bp-live-dot"></span> Élő meccs</button>`
        : '';
    nav.innerHTML = SUBNAV.map(s =>
        `<button class="bp-pill ${BP.view === s.id ? 'active' : ''}" data-bp="nav" data-view="${s.id}">
            <span>${s.icon}</span><span class="bp-pill-label">${s.label}</span>
        </button>`
    ).join('') + liveBtn;
}

function setView(v) {
    BP.view = v;
    renderSubnav();
    renderView();
}

function destroyCharts() {
    Object.values(BP.charts).forEach(c => { try { c.destroy(); } catch (e) {} });
    BP.charts = {};
}

function renderView() {
    const el = document.getElementById('bp-view');
    if (!el) return;
    destroyCharts();
    if (BP.timerInt) { clearInterval(BP.timerInt); BP.timerInt = null; }

    if (BP.loading) {
        el.innerHTML = `
            <div class="bp-loading">
                <div class="bp-loading-cups"><span>🍺</span><span>🍺</span><span>🍺</span></div>
                <p>Sörpong adatok betöltése...</p>
            </div>`;
        return;
    }
    if (BP.loadError) {
        el.innerHTML = `
            <div class="bp-empty card">
                <p>⚠️ ${esc(BP.loadError)}</p>
                ${BP.missingSheet ? '<p class="bp-muted">Tipp: nyisd meg a Google Táblázatot, és hozz létre egy új, üres munkalapot <b>Sörpong</b> néven, majd próbáld újra.</p>' : ''}
                <button class="bp-btn bp-btn-primary" data-bp="reload">🔄 Újrapróbálás</button>
            </div>`;
        return;
    }

    switch (BP.view) {
        case 'home': return renderHome(el);
        case 'players': return renderPlayers(el);
        case 'setup': return renderSetup(el);
        case 'game': return renderGame(el);
        case 'stats': return renderStatsView(el);
        case 'history': return renderHistory(el);
        case 'leaderboard': return renderLeaderboard(el);
        case 'tournament': return renderTournament(el);
        default: return renderHome(el);
    }
}

// ---------- KEZDŐLAP ----------

function renderHome(el) {
    const finished = BP.games.filter(g => g.winner != null);
    const lb = buildIndividualLeaderboard().sort((a, b) => b.wins - a.wins || b.hitPct - a.hitPct);
    const best = lb[0];
    const totalThrows = finished.reduce((a, g) => a + (g.throws || []).length, 0);
    const totalHits = finished.reduce((a, g) => a + (g.throws || []).filter(t => t.r !== 'miss').length, 0);
    const activeTours = BP.tournaments.filter(t => t.status === 'active');
    const draft = (!BP.game || BP.game.winner != null) ? readDraft() : null;

    el.innerHTML = `
        ${draft ? `
        <div class="bp-resume-banner">
            <div>⏸️ <b>Félbehagyott meccs:</b> ${esc(draft.teams[0].name)} vs ${esc(draft.teams[1].name)}</div>
            <div class="bp-resume-actions">
                <button class="bp-btn bp-btn-primary bp-btn-sm" data-bp="resume-draft">▶️ Folytatás</button>
                <button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="discard-draft">🗑️ Elvetés</button>
            </div>
        </div>` : ''}

        <div class="bp-stat-grid">
            <div class="bp-stat-card bp-anim-in" style="--d:0">
                <div class="bp-stat-icon">🎮</div>
                <div class="bp-stat-value">${finished.length}</div>
                <div class="bp-stat-label">Lejátszott meccs</div>
            </div>
            <div class="bp-stat-card bp-anim-in" style="--d:1">
                <div class="bp-stat-icon">🏀</div>
                <div class="bp-stat-value">${totalThrows}</div>
                <div class="bp-stat-label">Összes dobás</div>
            </div>
            <div class="bp-stat-card bp-anim-in" style="--d:2">
                <div class="bp-stat-icon">🎯</div>
                <div class="bp-stat-value">${pct(totalHits, totalThrows)}%</div>
                <div class="bp-stat-label">Találati arány</div>
            </div>
            <div class="bp-stat-card bp-anim-in" style="--d:3">
                <div class="bp-stat-icon">👑</div>
                <div class="bp-stat-value bp-stat-value-sm">${best ? esc(best.name) : '–'}</div>
                <div class="bp-stat-label">Legtöbb győzelem${best ? ` (${best.wins})` : ''}</div>
            </div>
        </div>

        <div class="bp-cta-grid">
            <button class="bp-cta bp-cta-match" data-bp="nav" data-view="setup">
                <span class="bp-cta-icon">🎯</span>
                <span class="bp-cta-title">Új meccs</span>
                <span class="bp-cta-sub">Gyors játék sorsolt csapatokkal</span>
            </button>
            <button class="bp-cta bp-cta-tour" data-bp="nav" data-view="tournament">
                <span class="bp-cta-icon">🏆</span>
                <span class="bp-cta-title">Bajnokság</span>
                <span class="bp-cta-sub">Kieséses vagy körmérkőzés</span>
            </button>
        </div>

        ${activeTours.length ? `
        <div class="bp-section">
            <h3 class="bp-section-title">🔥 Folyamatban lévő bajnokságok</h3>
            <div class="bp-tour-mini-list">
                ${activeTours.map(t => {
                    const done = t.matches.filter(m => m.winner != null).length;
                    const total = t.matches.length;
                    return `<button class="bp-tour-mini" data-bp="open-tour" data-id="${t.id}">
                        <span class="bp-tour-mini-name">${t.format === 'kieses' ? '🪜' : '🔁'} ${esc(t.name)}</span>
                        <span class="bp-progress"><span class="bp-progress-fill" style="width:${pct(done, total)}%"></span></span>
                        <span class="bp-muted">${done}/${total} meccs</span>
                    </button>`;
                }).join('')}
            </div>
        </div>` : ''}

        ${finished.length ? `
        <div class="bp-section">
            <h3 class="bp-section-title">🕓 Legutóbbi meccsek</h3>
            <div class="bp-recent-list">
                ${finished.slice(0, 3).map(g => {
                    const ts = gameTeamStats(g);
                    return `<button class="bp-recent" data-bp="open-game" data-id="${g.id}">
                        <span class="bp-recent-teams">
                            <b class="${g.winner === 0 ? 'bp-win' : ''}">${g.teams[0].emoji} ${esc(g.teams[0].name)}</b>
                            <span class="bp-recent-score">${ts[0].cups} : ${ts[1].cups}</span>
                            <b class="${g.winner === 1 ? 'bp-win' : ''}">${esc(g.teams[1].name)} ${g.teams[1].emoji}</b>
                        </span>
                        <span class="bp-muted">${fmtDate(g.date)}</span>
                    </button>`;
                }).join('')}
            </div>
        </div>` : `
        <div class="bp-empty card">
            <p>Még nincs lejátszott meccs. Adj hozzá játékosokat, aztán irány az aréna! 🍻</p>
        </div>`}
    `;
}

// ---------- JÁTÉKOSOK ----------

function renderPlayers(el) {
    const players = BP.roster.players || [];
    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">👥 Játékosok kezelése</h3>
            <div class="bp-add-player">
                <input type="text" id="bp-new-player" class="bp-input" maxlength="24"
                       placeholder="Játékos neve..." autocomplete="off">
                <button class="bp-btn bp-btn-primary" data-bp="add-player">➕ Hozzáadás</button>
            </div>
            ${players.length === 0
                ? '<div class="bp-empty card"><p>Még nincs játékos. Add hozzá a haverokat, hogy a gép csapatokat sorsolhasson! 🎲</p></div>'
                : `<div class="bp-player-grid">
                    ${players.map((p, i) => {
                        const qs = playerQuickStats(p.name);
                        return `<div class="bp-player-card bp-anim-in" style="--d:${i % 8}">
                            <button class="bp-player-avatar" data-bp="reroll-emoji" data-id="${p.id}" title="Kattints új emojiért!">${p.emoji}</button>
                            <div class="bp-player-name">${esc(p.name)}</div>
                            <div class="bp-player-mini">
                                🎮 ${qs.games} · 🏆 ${qs.wins} · 🎯 ${qs.hitPct}%
                            </div>
                            <button class="bp-player-del" data-bp="del-player" data-id="${p.id}" title="Törlés">✕</button>
                        </div>`;
                    }).join('')}
                </div>`}
        </div>
    `;
    const input = document.getElementById('bp-new-player');
    if (input) {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addPlayer(); }
        });
    }
}

function addPlayer() {
    const input = document.getElementById('bp-new-player');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;
    if ((BP.roster.players || []).some(p => p.name.toLowerCase() === name.toLowerCase())) {
        bpToast('Ilyen nevű játékos már van! 🙃', 'error');
        return;
    }
    BP.roster.players = BP.roster.players || [];
    BP.roster.players.push({ id: uid(), name, emoji: emojiForName(name) });
    persistRoster();
    renderView();
    bpToast(`${name} csatlakozott az arénához! 🍻`, 'success');
    const ni = document.getElementById('bp-new-player');
    if (ni) ni.focus();
}

// ---------- ÚJ MECCS (SETUP + SORSOLÁS) ----------

function renderSetup(el) {
    if (!BP.setup) {
        BP.setup = { cups: 6, teamSize: 2, selected: [], drawn: null };
    }
    const s = BP.setup;
    const players = BP.roster.players || [];

    const minPlayers = s.teamSize * 2;
    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">🎯 Új meccs indítása</h3>

            <div class="bp-card">
                <h4 class="bp-card-title">1️⃣ Poharak csapatonként <span class="bp-muted">(1–${MAX_CUPS}, te döntöd el)</span></h4>
                ${cupsPickerHtml(s.cups, 'cups')}
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">2️⃣ Csapat mérete</h4>
                <div class="bp-seg">
                    ${[1, 2, 3, 4, 5].map(n =>
                        `<button class="bp-seg-btn ${s.teamSize === n ? 'active' : ''}" data-bp="setup-teamsize" data-val="${n}">${n} fő</button>`
                    ).join('')}
                </div>
                <p class="bp-muted" style="margin-top:8px">Szükséges: minimum <b>${minPlayers} játékos</b> (${s.teamSize}+${s.teamSize})</p>
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">3️⃣ Ki játszik? <span class="bp-muted">(${s.selected.length} kiválasztva, min. ${minPlayers})</span></h4>
                ${players.length === 0
                    ? `<p class="bp-muted">Nincs még játékos. <button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="nav" data-view="players">👥 Játékosok hozzáadása</button></p>`
                    : `<div class="bp-chip-grid">
                        ${players.map(p => `
                            <button class="bp-chip ${s.selected.includes(p.name) ? 'selected' : ''}" data-bp="toggle-select" data-name="${esc(p.name)}">
                                ${p.emoji} ${esc(p.name)}
                            </button>`).join('')}
                    </div>`}
            </div>

            <button class="bp-btn bp-btn-big bp-btn-primary ${s.selected.length < minPlayers ? 'disabled' : ''}" data-bp="draw-teams">
                🎲 Csapatok kisorsolása
            </button>
            ${s.selected.length < minPlayers ? `<p class="bp-muted bp-center">Legalább ${minPlayers} játékos kell (${s.teamSize} fő/csapat)!</p>` : ''}
        </div>
    `;
}

// Sorsolás: rulett-effekt - a teljes névsor látszik, egy fénycsík ugrál
// a nevek között, lassulva megáll a kisorsolt játékoson, aki bekerül a csapatába
let activeDrawCancel = null;

function drawTeams() {
    const s = BP.setup;
    const teamSize = s.teamSize || 2;
    const minPlayers = teamSize * 2;
    if (!s || s.selected.length < minPlayers) {
        bpToast(`Válassz ki legalább ${minPlayers} játékost! 👥`, 'error');
        return;
    }

    const shuffled = shuffle(s.selected);

    // Első teamSize játékos → A csapat, következő teamSize → B csapat
    const teamA = shuffled.slice(0, teamSize);
    const teamB = shuffled.slice(teamSize, teamSize * 2);

    // Extra játékosok (ha többet választottak) felváltva kerülnek a csapatokba
    const extras = shuffled.slice(teamSize * 2);
    extras.forEach((p, i) => (i % 2 === 0 ? teamA : teamB).push(p));

    // Animációs sorrend: felváltva A, B, A, B, ... (a draw overlay így tölti a slotokat)
    const maxLen = Math.max(teamA.length, teamB.length);
    const order = [];
    for (let i = 0; i < maxLen; i++) {
        if (i < teamA.length) order.push(teamA[i]);
        if (i < teamB.length) order.push(teamB[i]);
    }

    s.drawn = {
        teams: [
            { name: randTeamName(), emoji: randTeamEmoji(), players: teamA },
            { name: randTeamName(), emoji: randTeamEmoji(), players: teamB }
        ],
        order // sorsolás animációs sorrendje: A0, B0, A1, B1, ...
    };

    showDrawOverlay(s.drawn);
}

function showDrawOverlay(drawn) {
    closeOverlay();
    const teams = drawn.teams;
    const ov = document.createElement('div');
    ov.className = 'bp-overlay';
    ov.id = 'bp-overlay';
    ov.innerHTML = `
        <div class="bp-overlay-box bp-draw-box">
            <h3 class="bp-draw-title" id="bp-draw-title">🎲 Sorsolás...</h3>
            <div class="bp-draw-pool" id="bp-draw-pool">
                ${drawn.order.map(p => `<span class="bp-pool-chip" data-pool="${esc(p)}">${emojiForName(p)} ${esc(p)}</span>`).join('')}
            </div>
            <div class="bp-draw-teams">
                ${[0, 1].map(ti => `
                    <div class="bp-draw-team" data-team="${ti}">
                        <div class="bp-draw-team-head">
                            <span class="bp-draw-emoji">${teams[ti].emoji}</span>
                            <span class="bp-draw-team-name" id="bp-draw-name-${ti}">${esc(teams[ti].name)}</span>
                        </div>
                        <div class="bp-teamname-edit" id="bp-name-edit-${ti}" style="display:none">
                            <input type="text" class="bp-input bp-team-name-input" id="bp-team-name-${ti}"
                                   value="${esc(teams[ti].name)}" maxlength="30" title="Saját csapatnév">
                            <button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="reroll-teamname" data-team="${ti}" title="Új véletlen név">🎲</button>
                        </div>
                        <div class="bp-draw-slots" id="bp-draw-slots-${ti}">
                            ${teams[ti].players.map(() => '<div class="bp-draw-slot">&nbsp;</div>').join('')}
                        </div>
                    </div>`).join('')}
            </div>
            <p class="bp-draw-hint" id="bp-draw-hint" style="display:none">✏️ Írd át a csapatneveket, ha sajátot szeretnétek!</p>
            <div class="bp-draw-actions">
                <button class="bp-btn bp-btn-ghost bp-btn-sm" id="bp-draw-skip">⏩ Ugorj a végére</button>
            </div>
            <div class="bp-draw-actions" id="bp-draw-actions" style="visibility:hidden">
                <button class="bp-btn bp-btn-ghost" data-bp="redraw">🔁 Újrasorsolás</button>
                <button class="bp-btn bp-btn-primary" data-bp="start-game">🚀 Kezdjük!</button>
            </div>
        </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
    runDrawAnimation(ov, drawn);
}

function runDrawAnimation(ov, drawn) {
    const order = drawn.order;
    let remaining = [...order];
    let finished = false;
    let cancelled = false;
    const timers = [];
    const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

    const chipEl = (name) => {
        return [...ov.querySelectorAll('.bp-pool-chip')].find(el => el.dataset.pool === name) || null;
    };

    const clearFocus = () => ov.querySelectorAll('.bp-pool-chip.spin-focus').forEach(el => el.classList.remove('spin-focus'));

    // A kisorsolt játékos átkerül a csapata következő üres helyére
    const placeChip = (name, k) => {
        const chip = chipEl(name);
        if (chip) { chip.classList.remove('spin-focus', 'chosen'); chip.classList.add('assigned'); }
        const ti = k % 2;
        const slot = ov.querySelectorAll(`#bp-draw-slots-${ti} .bp-draw-slot`)[Math.floor(k / 2)];
        if (slot) {
            slot.innerHTML = `${emojiForName(name)} ${esc(name)}`;
            slot.classList.add('locked');
        }
    };

    const finishDraw = () => {
        if (finished) return;
        finished = true;
        const title = ov.querySelector('#bp-draw-title');
        if (title) title.textContent = '⚔️ A csapatok készen állnak!';
        [0, 1].forEach(ti => {
            const nameEl = ov.querySelector(`#bp-draw-name-${ti}`);
            const edit = ov.querySelector(`#bp-name-edit-${ti}`);
            if (nameEl) nameEl.style.display = 'none';
            if (edit) edit.style.display = '';
        });
        const hint = ov.querySelector('#bp-draw-hint');
        if (hint) hint.style.display = '';
        const skip = ov.querySelector('#bp-draw-skip');
        if (skip) skip.style.display = 'none';
        const actions = ov.querySelector('#bp-draw-actions');
        if (actions) actions.style.visibility = 'visible';
        if (typeof confetti === 'function' && !cancelled) {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.4 }, zIndex: 10050 });
        }
    };

    // Egy játékos kisorsolása: a fénycsík körbejár a még bent lévő neveken,
    // egyre lassul, és pontosan a kisorsolt néven áll meg
    const spinPick = (k) => {
        if (cancelled) return;
        if (k >= order.length) { later(finishDraw, 200); return; }

        const target = order[k];
        const len = remaining.length;
        const targetIdx = remaining.indexOf(target);
        // legalább 2 teljes kör, aztán pont a célon áll meg
        const steps = len <= 1 ? 1 : len * 2 + targetIdx;
        const speed = len > 6 ? 0.65 : 1; // sok játékosnál kicsit gyorsabb
        let i = 0;

        const step = () => {
            if (cancelled) return;
            clearFocus();
            const el = chipEl(remaining[i % len]);
            if (el) el.classList.add('spin-focus');
            i++;
            if (i <= steps) {
                const t = i / steps;
                later(step, (45 + 190 * t * t) * speed); // fokozatos lassulás
            } else {
                const chosen = chipEl(target);
                if (chosen) chosen.classList.add('chosen');
                later(() => {
                    placeChip(target, k);
                    remaining = remaining.filter(n => n !== target);
                    later(() => spinPick(k + 1), 260);
                }, 420);
            }
        };
        step();
    };

    // ⏩ átugrás: azonnal a végeredmény
    const skipBtn = ov.querySelector('#bp-draw-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => {
        timers.forEach(clearTimeout);
        clearFocus();
        order.forEach((p, i) => placeChip(p, i));
        remaining = [];
        finishDraw();
    });

    activeDrawCancel = () => {
        cancelled = true;
        timers.forEach(clearTimeout);
    };

    later(() => spinPick(0), 650);
}

function startGameFromDraw() {
    const s = BP.setup;
    if (!s || !s.drawn) return;
    // Szerkesztett csapatnevek átvétele
    [0, 1].forEach(ti => {
        const inp = document.getElementById(`bp-team-name-${ti}`);
        if (inp && inp.value.trim()) s.drawn.teams[ti].name = inp.value.trim().slice(0, 30);
    });
    closeOverlay();

    const game = {
        id: uid(),
        date: new Date().toISOString(),
        startTs: Date.now(),
        cupsPerSide: s.cups,
        tournamentId: null,
        matchId: null,
        teams: s.drawn.teams,
        cups: [Array(s.cups).fill(true), Array(s.cups).fill(true)],
        throws: [],
        winner: null,
        durationSec: null
    };
    BP.game = game;
    BP.thrower = null;
    BP.bounceMode = false;
    BP.setup = null;
    saveDraft();
    setView('game');
}

// ---------- MECCS KÉPERNYŐ ----------

function cupsLeft(game, ti) {
    return game.cups[ti].filter(Boolean).length;
}

function renderGame(el) {
    const g = BP.game;
    if (!g || g.winner != null) {
        el.innerHTML = `<div class="bp-empty card"><p>Nincs folyamatban lévő meccs.</p>
            <button class="bp-btn bp-btn-primary" data-bp="nav" data-view="setup">🎯 Új meccs</button></div>`;
        return;
    }

    const throwsCount = g.throws.length;
    el.innerHTML = `
        <div class="bp-game" id="bp-game">
            <div class="bp-game-topbar">
                <div class="bp-game-score">
                    <span class="bp-game-team-label">${g.teams[0].emoji} ${esc(g.teams[0].name)}</span>
                    <span class="bp-game-cups-big" id="bp-score-0">${cupsLeft(g, 0)}</span>
                    <span class="bp-game-vs">VS</span>
                    <span class="bp-game-cups-big" id="bp-score-1">${cupsLeft(g, 1)}</span>
                    <span class="bp-game-team-label">${esc(g.teams[1].name)} ${g.teams[1].emoji}</span>
                </div>
                <div class="bp-game-meta">
                    <span>⏱️ <span id="bp-timer">0:00</span></span>
                    <span>🏀 <span id="bp-throwcount">${throwsCount}</span> dobás</span>
                </div>
                <div class="bp-game-tools">
                    <button class="bp-icon-btn" data-bp="help" title="Útmutató">❓</button>
                    <button class="bp-icon-btn" data-bp="toggle-fs" title="Teljes képernyő">${BP.fullscreen ? '✕ Kilépés' : '⛶ Teljes képernyő'}</button>
                </div>
            </div>

            <div class="bp-tables">
                ${[0, 1].map(ti => renderTeamPanel(g, ti)).join('<div class="bp-net"><span></span></div>')}
            </div>

            <div class="bp-actionbar">
                <div class="bp-actionbar-info" id="bp-thrower-info">
                    ${BP.thrower
                        ? `🎯 <b>${esc(BP.thrower.player)}</b> dob <span class="bp-muted">(${esc(g.teams[BP.thrower.team].name)})</span>`
                        : (throwsCount === 0 ? '👆 Válaszd ki, ki kezdi a meccset!' : '👆 Válassz dobó játékost!')}
                </div>
                <div class="bp-actionbar-btns">
                    <button class="bp-btn bp-btn-bounce ${BP.bounceMode ? 'active' : ''}" data-bp="toggle-bounce" title="Pattintott dobás: 2 pohár!">✌️ Pattintott</button>
                    <button class="bp-btn bp-btn-miss" data-bp="throw-miss">❌ Mellé</button>
                    <button class="bp-btn bp-btn-ghost" data-bp="undo-throw" ${throwsCount === 0 ? 'disabled' : ''}>↩️ Vissza</button>
                    <button class="bp-btn bp-btn-danger-ghost" data-bp="abort-game">⏹️</button>
                </div>
            </div>
            <p class="bp-game-hint" id="bp-game-hint">${BP.thrower
                ? `Kattints a(z) <b>${esc(g.teams[1 - BP.thrower.team].name)}</b> egyik poharára, ha talált – vagy nyomd a „Mellé” gombot. A sorrend magától pörög, de bármikor átválaszthatsz másik dobóra.`
                : 'Kattints egy játékosra a kezdéshez – utána a sorrend automatikus: mindig az ellenfél jön, csapaton belül pedig felváltva dobtok.'}</p>
        </div>
    `;
    startTimer();
}

function renderTeamPanel(g, ti) {
    const rows = cupRows(g.cupsPerSide);
    let idx = 0;
    const targetable = BP.thrower && BP.thrower.team !== ti;
    const rackHtml = rows.map(rowCount => {
        let row = '<div class="bp-cup-row">';
        for (let i = 0; i < rowCount; i++) {
            const cupIdx = idx++;
            const alive = g.cups[ti][cupIdx];
            row += `<button class="bp-cup ${alive ? '' : 'gone'} ${targetable && alive ? 'targetable' : ''}"
                        data-bp="cup" data-team="${ti}" data-idx="${cupIdx}" ${alive ? '' : 'disabled'}>
                        <span class="bp-cup-body"></span><span class="bp-cup-foam"></span>
                    </button>`;
        }
        return row + '</div>';
    }).join('');

    const stats = gamePlayerStats(g);
    return `
        <div class="bp-table-side ${targetable ? 'is-target' : ''}" data-team-panel="${ti}">
            <div class="bp-team-head">
                <span class="bp-team-emoji">${g.teams[ti].emoji}</span>
                <span class="bp-team-name">${esc(g.teams[ti].name)}</span>
            </div>
            <div class="bp-rack" id="bp-rack-${ti}">${rackHtml}</div>
            <div class="bp-team-players">
                ${g.teams[ti].players.map(p => {
                    const s = stats[p] || { throws: 0, cups: 0, curStreak: 0 };
                    const active = BP.thrower && BP.thrower.player === p;
                    return `<button class="bp-thrower-chip ${active ? 'active' : ''}" data-bp="pick-thrower" data-team="${ti}" data-name="${esc(p)}">
                        <span class="bp-thrower-emoji">${emojiForName(p)}</span>
                        <span class="bp-thrower-name">${esc(p)}</span>
                        <span class="bp-thrower-stat">${s.cups}🍺 ${s.throws}🏀</span>
                        ${s.curStreak >= 2 ? `<span class="bp-streak">🔥${s.curStreak}</span>` : ''}
                    </button>`;
                }).join('')}
            </div>
        </div>
    `;
}

function startTimer() {
    const g = BP.game;
    if (!g) return;
    const upd = () => {
        const el = document.getElementById('bp-timer');
        if (el) el.textContent = fmtDuration((Date.now() - g.startTs) / 1000);
    };
    upd();
    BP.timerInt = setInterval(upd, 1000);
}

function pickThrower(team, name) {
    BP.thrower = { team: Number(team), player: name };
    BP.bounceMode = false;
    renderView();
    renderSubnav();
}

// Automatikus dobási sorrend: minden dobás után az ellenfél következik,
// csapaton belül pedig körbejárnak a játékosok (aki legutóbb dobott a
// csapatból, az utáni játékos jön). A dobásnaplóból vezetjük le, így az
// visszavonás és a kézi felülbírálás után is helyes marad.
function deriveNextThrower(g) {
    if (!g || !g.throws.length) return null;
    const last = g.throws[g.throws.length - 1];
    const nextTeam = 1 - last.team;
    const players = g.teams[nextTeam].players || [];
    if (!players.length) return null;

    let lastOfTeam = null;
    for (let i = g.throws.length - 1; i >= 0; i--) {
        if (g.throws[i].team === nextTeam) { lastOfTeam = g.throws[i].p; break; }
    }
    let idx = 0;
    if (lastOfTeam != null) {
        const li = players.indexOf(lastOfTeam);
        idx = li === -1 ? 0 : (li + 1) % players.length;
    }
    return { team: nextTeam, player: players[idx] };
}

// Dobás rögzítése. cupIdx: eltalált pohár indexe (miss esetén null)
function recordThrow(result, targetTeam, cupIdx) {
    const g = BP.game;
    if (!g || !BP.thrower) return;

    const t = Math.round((Date.now() - g.startTs) / 1000);
    const removed = [];

    if (result !== 'miss') {
        removed.push(cupIdx);
        g.cups[targetTeam][cupIdx] = false;
        if (result === 'bounce') {
            // Pattintott: +1 pohár automatikusan (az utolsó még élő)
            const extra = g.cups[targetTeam].lastIndexOf(true);
            if (extra !== -1) {
                removed.push(extra);
                g.cups[targetTeam][extra] = false;
            }
        }
    }

    g.throws.push({ p: BP.thrower.player, team: BP.thrower.team, r: result, cups: removed, t });
    saveDraft();

    const throwerTeam = BP.thrower.team;
    const won = result !== 'miss' && cupsLeft(g, targetTeam) === 0;

    // Automatikus sorrend: ha nincs vége, az ellenfél következő játékosa jön
    if (!won) BP.thrower = deriveNextThrower(g);

    if (result === 'miss') {
        animateMiss(targetTeam);
        setTimeout(() => { renderView(); }, 650);
    } else {
        animateHit(targetTeam, removed);
        setTimeout(() => {
            if (won) finishGame(throwerTeam);
            else renderView();
        }, 800);
    }
}

// ---------- DOBÁS ANIMÁCIÓK ----------

function ballFlight(fromEl, toEl, arcClass, onLand) {
    const container = document.getElementById('bp-game');
    if (!container || !fromEl || !toEl) { if (onLand) onLand(); return; }
    const cRect = container.getBoundingClientRect();
    const fRect = fromEl.getBoundingClientRect();
    const tRect = toEl.getBoundingClientRect();

    const wrap = document.createElement('div');
    wrap.className = 'bp-ball-x';
    const ball = document.createElement('div');
    ball.className = `bp-ball-y ${arcClass}`;
    ball.textContent = '⚪';
    wrap.appendChild(ball);
    container.appendChild(wrap);

    const x0 = fRect.left + fRect.width / 2 - cRect.left;
    const y0 = fRect.top + fRect.height / 2 - cRect.top;
    const x1 = tRect.left + tRect.width / 2 - cRect.left;
    const y1 = tRect.top + tRect.height / 2 - cRect.top;

    wrap.style.left = x0 + 'px';
    wrap.style.top = y0 + 'px';
    wrap.style.setProperty('--dx', (x1 - x0) + 'px');
    wrap.style.setProperty('--dy', (y1 - y0) + 'px');

    setTimeout(() => { if (onLand) onLand(); }, 520);
    setTimeout(() => wrap.remove(), 900);
}

function throwerChipEl() {
    if (!BP.thrower) return null;
    return document.querySelector(`.bp-thrower-chip.active`);
}

function animateHit(targetTeam, removedIdxs) {
    const first = removedIdxs[0];
    const cupEl = document.querySelector(`.bp-cup[data-team="${targetTeam}"][data-idx="${first}"]`);
    ballFlight(throwerChipEl(), cupEl, 'bp-arc-hit', () => {
        removedIdxs.forEach((idx, k) => {
            const c = document.querySelector(`.bp-cup[data-team="${targetTeam}"][data-idx="${idx}"]`);
            if (c) setTimeout(() => {
                c.classList.add('splash');
                spawnSplash(c);
            }, k * 180);
        });
        const score = document.getElementById(`bp-score-${targetTeam}`);
        if (score) {
            score.textContent = cupsLeft(BP.game, targetTeam);
            score.classList.add('bp-pop');
            setTimeout(() => score.classList.remove('bp-pop'), 400);
        }
        if (typeof confetti === 'function' && removedIdxs.length > 1) {
            confetti({ particleCount: 50, spread: 70, origin: { y: 0.5 }, zIndex: 10050 });
        }
    });
}

function animateMiss(targetTeam) {
    const rack = document.getElementById(`bp-rack-${targetTeam}`);
    ballFlight(throwerChipEl(), rack, 'bp-arc-miss', () => {
        const panel = document.querySelector(`[data-team-panel="${targetTeam}"]`);
        if (panel) {
            panel.classList.add('bp-shake');
            setTimeout(() => panel.classList.remove('bp-shake'), 500);
        }
    });
}

function spawnSplash(cupEl) {
    for (let i = 0; i < 7; i++) {
        const d = document.createElement('span');
        d.className = 'bp-droplet';
        d.style.setProperty('--ang', (Math.random() * 360) + 'deg');
        d.style.setProperty('--dist', (18 + Math.random() * 26) + 'px');
        cupEl.appendChild(d);
        setTimeout(() => d.remove(), 700);
    }
}

function undoThrow() {
    const g = BP.game;
    if (!g || g.throws.length === 0) return;
    const last = g.throws.pop();
    (last.cups || []).forEach(idx => { g.cups[1 - last.team][idx] = true; });
    // A visszavont dobás gazdája jön újra
    BP.thrower = { team: last.team, player: last.p };
    saveDraft();
    renderView();
    bpToast('Utolsó dobás visszavonva. ↩️');
}

function abortGame() {
    if (!confirm('Biztosan megszakítod a meccset? Az állás elveszik!')) return;
    exitGameFullscreen();
    const g = BP.game;
    BP.game = null;
    BP.thrower = null;
    clearDraft();
    if (g && g.tournamentId) {
        BP.activeTournamentId = g.tournamentId;
        setView('tournament');
    } else {
        setView('home');
    }
    bpToast('Meccs megszakítva.');
}

// ---------- MECCS VÉGE ----------

function finishGame(winnerTeam) {
    const g = BP.game;
    if (!g) return;
    exitGameFullscreen();
    g.winner = winnerTeam;
    g.durationSec = Math.round((Date.now() - g.startTs) / 1000);
    delete g.startTs;
    clearDraft();

    BP.games.unshift(g);
    sortGames();
    persistGame(g);

    // Tournament eredmény visszaírása
    let championDecided = null;
    if (g.tournamentId) {
        const t = BP.tournaments.find(x => x.id === g.tournamentId);
        if (t) {
            championDecided = applyMatchResult(t, g);
            persistTournament(t);
        }
    }

    BP.game = null;
    BP.thrower = null;
    if (BP.timerInt) { clearInterval(BP.timerInt); BP.timerInt = null; }
    renderSubnav();
    showVictoryOverlay(g, championDecided);
}

function showVictoryOverlay(game, championName) {
    closeOverlay();
    const w = game.teams[game.winner];
    const ts = gameTeamStats(game);
    const mvp = gameMvp(game);

    const ov = document.createElement('div');
    ov.className = 'bp-overlay';
    ov.id = 'bp-overlay';
    ov.innerHTML = `
        <div class="bp-overlay-box bp-victory-box">
            <div class="bp-trophy">🏆</div>
            <h2 class="bp-victory-title">${w.emoji} ${esc(w.name)}</h2>
            <p class="bp-victory-sub">nyerte a meccset!</p>
            <div class="bp-victory-score">${ts[0].cups} : ${ts[1].cups} <span class="bp-muted">eltalált pohár</span></div>
            ${mvp ? `<div class="bp-mvp-badge">⭐ MVP: <b>${esc(mvp.name)}</b> (${mvp.cups} pohár)</div>` : ''}
            ${championName ? `<div class="bp-champion-note">👑 Ezzel eldőlt a bajnokság: <b>${esc(championName)}</b> a bajnok!</div>` : ''}
            <div class="bp-victory-actions">
                <button class="bp-btn bp-btn-primary" data-bp="show-stats" data-id="${game.id}">📊 Részletes statisztika</button>
                ${game.tournamentId
                    ? `<button class="bp-btn bp-btn-ghost" data-bp="back-to-tour" data-id="${game.tournamentId}">🏆 Vissza a bajnoksághoz</button>`
                    : `<button class="bp-btn bp-btn-ghost" data-bp="victory-home">🏠 Kezdőlap</button>`}
            </div>
        </div>
    `;
    document.body.appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));

    if (typeof confetti === 'function') {
        confetti({ particleCount: 130, spread: 100, origin: { y: 0.6 }, zIndex: 10050 });
        setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0 }, zIndex: 10050 }), 400);
        setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1 }, zIndex: 10050 }), 700);
        if (championName) {
            setTimeout(() => confetti({ particleCount: 200, spread: 160, origin: { y: 0.3 }, zIndex: 10050 }), 1200);
        }
    }
}

// ---------- RÉSZLETES STATISZTIKA NÉZET ----------

function renderStatsView(el) {
    const g = BP.statsGame;
    if (!g) { setView('home'); return; }
    el.innerHTML = `<div id="bp-stats-container"></div>
        <div class="bp-center" style="margin-top:16px">
            <button class="bp-btn bp-btn-ghost" data-bp="nav" data-view="${BP.statsBackView}">⬅️ Vissza</button>
        </div>`;
    renderGameStats(g, document.getElementById('bp-stats-container'));
}

function renderGameStats(game, container) {
    if (!container) return;
    const ts = gameTeamStats(game);
    const pl = Object.values(gamePlayerStats(game));
    const mvp = gameMvp(game);
    pl.sort((a, b) => b.cups - a.cups || (b.hits + b.bounces) - (a.hits + a.bounces));

    const totalThrows = game.throws.length;
    const maxBar = Math.max(ts[0].cups, ts[1].cups, 1);

    container.innerHTML = `
        <div class="bp-stats-header">
            <div class="bp-stats-team ${game.winner === 0 ? 'winner' : ''}">
                <span class="bp-stats-emoji">${game.teams[0].emoji}</span>
                <span>${esc(game.teams[0].name)}</span>
                ${game.winner === 0 ? '<span class="bp-crown">👑</span>' : ''}
            </div>
            <div class="bp-stats-score">${ts[0].cups} : ${ts[1].cups}</div>
            <div class="bp-stats-team ${game.winner === 1 ? 'winner' : ''}">
                <span class="bp-stats-emoji">${game.teams[1].emoji}</span>
                <span>${esc(game.teams[1].name)}</span>
                ${game.winner === 1 ? '<span class="bp-crown">👑</span>' : ''}
            </div>
        </div>
        <div class="bp-stats-meta">
            <span>📅 ${fmtDate(game.date)}</span>
            <span>⏱️ ${fmtDuration(game.durationSec)}</span>
            <span>🏀 ${totalThrows} dobás</span>
            <span>🥤 ${game.cupsPerSide} pohár/oldal</span>
        </div>

        ${mvp ? `<div class="bp-mvp-card bp-anim-in">
            <span class="bp-mvp-star">⭐</span>
            <div>
                <div class="bp-mvp-title">A meccs MVP-je</div>
                <div class="bp-mvp-name">${emojiForName(mvp.name)} ${esc(mvp.name)}</div>
                <div class="bp-muted">${mvp.cups} eltalált pohár · ${pct(mvp.hits + mvp.bounces, mvp.throws)}% pontosság · 🔥${mvp.bestStreak} sorozat</div>
            </div>
        </div>` : ''}

        <div class="bp-card">
            <h4 class="bp-card-title">⚔️ Csapat összehasonlítás</h4>
            ${[
                { label: '🍺 Eltalált poharak', a: ts[0].cups, b: ts[1].cups },
                { label: '🏀 Dobások', a: ts[0].throws, b: ts[1].throws },
                { label: '🎯 Pontosság', a: ts[0].hitPct, b: ts[1].hitPct, suffix: '%' },
                { label: '🔥 Leghosszabb sorozat', a: ts[0].bestStreak, b: ts[1].bestStreak }
            ].map(row => {
                const m = Math.max(row.a, row.b, 1);
                return `<div class="bp-vs-row">
                    <span class="bp-vs-val">${row.a}${row.suffix || ''}</span>
                    <div class="bp-vs-bars">
                        <div class="bp-vs-bar left"><span style="width:${(row.a / m) * 100}%"></span></div>
                        <span class="bp-vs-label">${row.label}</span>
                        <div class="bp-vs-bar right"><span style="width:${(row.b / m) * 100}%"></span></div>
                    </div>
                    <span class="bp-vs-val">${row.b}${row.suffix || ''}</span>
                </div>`;
            }).join('')}
        </div>

        <div class="bp-card">
            <h4 class="bp-card-title">👤 Játékos statisztikák</h4>
            <div class="bp-table-scroll">
                <table class="bp-table">
                    <thead><tr>
                        <th>Játékos</th><th>Csapat</th><th>🏀 Dobás</th><th>🎯 Találat</th>
                        <th>✌️ Pattintott</th><th>🍺 Pohár</th><th>%</th><th>🔥 Sorozat</th>
                    </tr></thead>
                    <tbody>
                        ${pl.map(s => `<tr class="${mvp && s.name === mvp.name ? 'bp-row-mvp' : ''}">
                            <td>${emojiForName(s.name)} ${esc(s.name)} ${mvp && s.name === mvp.name ? '⭐' : ''}</td>
                            <td>${game.teams[s.team].emoji}</td>
                            <td>${s.throws}</td>
                            <td>${s.hits + s.bounces}</td>
                            <td>${s.bounces}</td>
                            <td><b>${s.cups}</b></td>
                            <td>${pct(s.hits + s.bounces, s.throws)}%</td>
                            <td>${s.bestStreak >= 2 ? '🔥' : ''}${s.bestStreak}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div class="bp-card">
            <h4 class="bp-card-title">📈 Poharak alakulása</h4>
            <div class="bp-chart-wrap"><canvas id="bp-chart-timeline"></canvas></div>
        </div>

        <div class="bp-card">
            <h4 class="bp-card-title">🎬 Dobások idővonala</h4>
            <div class="bp-timeline">
                ${game.throws.map(th => `
                    <span class="bp-tl-dot ${th.r === 'miss' ? 'miss' : 'hit'} team-${th.team}"
                          title="${esc(th.p)} – ${th.r === 'miss' ? 'mellé' : (th.r === 'bounce' ? 'pattintott (2 pohár)' : 'talált')} (${fmtDuration(th.t)})">
                        ${th.r === 'miss' ? '·' : (th.r === 'bounce' ? '✌' : '●')}
                    </span>`).join('')}
            </div>
            <p class="bp-muted bp-tl-legend">● találat · ✌ pattintott · <span style="opacity:.55">·</span> mellé — színek: <span class="bp-tl-team0">■</span> ${esc(game.teams[0].name)}, <span class="bp-tl-team1">■</span> ${esc(game.teams[1].name)}</p>
        </div>
    `;

    renderTimelineChart(game);
}

function renderTimelineChart(game) {
    const canvas = document.getElementById('bp-chart-timeline');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        // Ha a Chart.js (CDN) nem érhető el, ne maradjon üres doboz
        canvas.parentElement.innerHTML = '<p class="bp-muted bp-center">A grafikonhoz internetkapcsolat szükséges (Chart.js). 📶</p>';
        return;
    }

    const labels = [0];
    const dataA = [game.cupsPerSide];
    const dataB = [game.cupsPerSide];
    let a = game.cupsPerSide, b = game.cupsPerSide;
    game.throws.forEach((th, i) => {
        const removed = (th.cups || []).length;
        if (th.team === 0) b -= removed; else a -= removed;
        labels.push(i + 1);
        dataA.push(a);
        dataB.push(b);
    });

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8a73ff';
    BP.charts.timeline = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: game.teams[0].name, data: dataA, borderColor: accent, backgroundColor: 'transparent', tension: 0.25, pointRadius: 2 },
                { label: game.teams[1].name, data: dataB, borderColor: '#f472b6', backgroundColor: 'transparent', tension: 0.25, pointRadius: 2 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#ddd' } } },
            scales: {
                x: { title: { display: true, text: 'Dobások', color: '#aaa' }, ticks: { color: '#aaa' }, grid: { color: 'rgba(255,255,255,.06)' } },
                y: { beginAtZero: true, title: { display: true, text: 'Poharak', color: '#aaa' }, ticks: { color: '#aaa', precision: 0 }, grid: { color: 'rgba(255,255,255,.06)' } }
            }
        }
    });
}

// ---------- ELŐZMÉNYEK ----------

function renderHistory(el) {
    const finished = BP.games.filter(g => g.winner != null);
    if (finished.length === 0) {
        el.innerHTML = '<div class="bp-empty card"><p>Még nincs lejátszott meccs. 🕸️</p></div>';
        return;
    }
    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">📜 Meccs előzmények <span class="bp-muted">(${finished.length})</span></h3>
            <div class="bp-history-list">
                ${finished.map(g => {
                    const ts = gameTeamStats(g);
                    const open = BP.historyOpenId === g.id;
                    const tour = g.tournamentId ? BP.tournaments.find(t => t.id === g.tournamentId) : null;
                    return `<div class="bp-history-item ${open ? 'open' : ''}">
                        <button class="bp-history-head" data-bp="toggle-history" data-id="${g.id}">
                            <span class="bp-history-teams">
                                <b class="${g.winner === 0 ? 'bp-win' : ''}">${g.teams[0].emoji} ${esc(g.teams[0].name)}</b>
                                <span class="bp-history-score">${ts[0].cups} : ${ts[1].cups}</span>
                                <b class="${g.winner === 1 ? 'bp-win' : ''}">${esc(g.teams[1].name)} ${g.teams[1].emoji}</b>
                            </span>
                            <span class="bp-history-meta">
                                ${tour ? `<span class="bp-tag">🏆 ${esc(tour.name)}</span>` : ''}
                                <span class="bp-muted">${fmtDate(g.date)}</span>
                                <span class="bp-chevron">${open ? '▲' : '▼'}</span>
                            </span>
                        </button>
                        ${open ? `<div class="bp-history-body">
                            <div id="bp-hist-stats-${g.id}"></div>
                            <div class="bp-center">
                                <button class="bp-btn bp-btn-danger-ghost bp-btn-sm" data-bp="del-game" data-id="${g.id}">🗑️ Meccs törlése</button>
                            </div>
                        </div>` : ''}
                    </div>`;
                }).join('')}
            </div>
        </div>
    `;
    if (BP.historyOpenId) {
        const g = finished.find(x => x.id === BP.historyOpenId);
        const c = document.getElementById(`bp-hist-stats-${BP.historyOpenId}`);
        if (g && c) renderGameStats(g, c);
    }
}

function deleteGame(id) {
    if (!confirm('Biztosan törlöd ezt a meccset? A statisztikákból is eltűnik!')) return;
    BP.games = BP.games.filter(g => g.id !== id);
    if (BP.historyOpenId === id) BP.historyOpenId = null;
    writeCache();
    bpApi({ action: 'BEERPONG_DELETE', type: 'game', id })
        .then(r => bpToast(r.queued ? 'Offline: a törlés sorban áll. 📡' : 'Meccs törölve. 🗑️', 'success'))
        .catch(err => bpToast('Törlési hiba: ' + err.message, 'error'));
    renderView();
}

// ---------- LEADERBOARD ----------

const LB_COLS = [
    { key: 'wins', label: '🏆 Győzelem' },
    { key: 'games', label: '🎮 Meccs' },
    { key: 'winPct', label: 'Win %' },
    { key: 'cups', label: '🍺 Pohár' },
    { key: 'hitPct', label: '🎯 Pontosság' },
    { key: 'bestStreak', label: '🔥 Sorozat' },
    { key: 'mvps', label: '⭐ MVP' }
];

function renderLeaderboard(el) {
    const isSolo = BP.lbTab === 'egyeni';
    let list = isSolo ? buildIndividualLeaderboard() : buildTeamLeaderboard();

    if (isSolo) {
        const { key, dir } = BP.lbSort;
        list.sort((a, b) => (b[key] - a[key]) * (dir === -1 ? 1 : -1) || b.wins - a.wins || b.cups - a.cups);
    }

    const podium = list.slice(0, 3);
    const podiumOrder = [1, 0, 2]; // ezüst - arany - bronz elrendezés
    const medals = ['🥇', '🥈', '🥉'];

    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">🥇 Sörpong toplista <span class="bp-muted">– csak a te profilodon</span></h3>
            <div class="bp-seg bp-lb-seg">
                <button class="bp-seg-btn ${isSolo ? 'active' : ''}" data-bp="lb-tab" data-tab="egyeni">👤 Egyéni</button>
                <button class="bp-seg-btn ${!isSolo ? 'active' : ''}" data-bp="lb-tab" data-tab="csapat">👥 Csapat</button>
            </div>

            ${list.length === 0 ? '<div class="bp-empty card"><p>Még nincs adat – játsszatok pár meccset! 🍻</p></div>' : `
            <div class="bp-podium">
                ${podiumOrder.filter(i => podium[i]).map(i => {
                    const e = podium[i];
                    const displayName = isSolo ? e.name : e.name;
                    return `<div class="bp-podium-col rank-${i + 1}">
                        <div class="bp-podium-avatar">${isSolo ? emojiForName(e.name) : (e.emoji || '👥')}</div>
                        <div class="bp-podium-name">${esc(displayName)}</div>
                        <div class="bp-podium-medal">${medals[i]}</div>
                        <div class="bp-podium-block">
                            <div class="bp-podium-wins">${e.wins} 🏆</div>
                            <div class="bp-muted">${e.games} meccs</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>

            <div class="bp-card">
                <div class="bp-table-scroll">
                    <table class="bp-table bp-lb-table">
                        <thead><tr>
                            <th>#</th>
                            <th>${isSolo ? 'Játékos' : 'Csapat'}</th>
                            ${isSolo
                                ? LB_COLS.map(c => `<th class="bp-sortable ${BP.lbSort.key === c.key ? 'sorted' : ''}" data-bp="lb-sort" data-key="${c.key}">${c.label} ${BP.lbSort.key === c.key ? '▼' : ''}</th>`).join('')
                                : '<th>🏆 Győzelem</th><th>🎮 Meccs</th><th>Win %</th><th>🍺 Pohár</th><th>🎯 Pontosság</th>'}
                        </tr></thead>
                        <tbody>
                            ${list.map((e, i) => `<tr class="${i < 3 ? 'bp-lb-top' : ''}">
                                <td>${i < 3 ? medals[i] : i + 1}</td>
                                <td class="bp-lb-name">
                                    ${isSolo
                                        ? `${emojiForName(e.name)} ${esc(e.name)}`
                                        : `${e.emoji || '👥'} ${esc(e.name)}<div class="bp-muted bp-lb-members">${(e.players || []).map(esc).join(', ')}</div>`}
                                </td>
                                ${isSolo
                                    ? LB_COLS.map(c => `<td>${e[c.key]}${c.key.endsWith('Pct') ? '%' : ''}</td>`).join('')
                                    : `<td>${e.wins}</td><td>${e.games}</td><td>${e.winPct}%</td><td>${e.cups}</td><td>${e.hitPct}%</td>`}
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`}
        </div>
    `;
}

// ---------- TOURNAMENT ----------

function entityById(t, id) {
    return t.entities.find(e => e.id === id) || null;
}

function roundName(t, round) {
    const totalRounds = Math.max(...t.matches.map(m => m.round));
    const left = totalRounds - round;
    if (left === 0) return '🏆 Döntő';
    if (left === 1) return 'Elődöntő';
    if (left === 2) return 'Negyeddöntő';
    return `${round}. kör`;
}

function renderTournament(el) {
    if (BP.activeTournamentId) {
        const t = BP.tournaments.find(x => x.id === BP.activeTournamentId);
        if (t) return renderTournamentDetail(el, t);
        BP.activeTournamentId = null;
    }
    if (BP.tourForm) return renderTournamentForm(el);

    const active = BP.tournaments.filter(t => t.status === 'active');
    const finished = BP.tournaments.filter(t => t.status === 'finished');

    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">🏆 Bajnokságok</h3>
            <button class="bp-btn bp-btn-big bp-btn-primary" data-bp="new-tour">➕ Új bajnokság indítása</button>

            ${active.length ? `<h4 class="bp-sub-title">🔥 Folyamatban</h4>
            <div class="bp-tour-list">
                ${active.map(t => tournamentCard(t)).join('')}
            </div>` : ''}

            ${finished.length ? `<h4 class="bp-sub-title">✅ Befejezett</h4>
            <div class="bp-tour-list">
                ${finished.map(t => tournamentCard(t)).join('')}
            </div>` : ''}

            ${(active.length + finished.length) === 0 ? '<div class="bp-empty card" style="margin-top:14px"><p>Még nem volt bajnokság. Indíts egyet, és derüljön ki, ki a király! 👑</p></div>' : ''}
        </div>
    `;
}

function tournamentCard(t) {
    const done = t.matches.filter(m => m.winner != null).length;
    const total = t.matches.length;
    const champ = t.champion ? entityById(t, t.champion) : null;
    return `<div class="bp-tour-card bp-anim-in">
        <div class="bp-tour-card-head">
            <span class="bp-tour-card-name">${t.format === 'kieses' ? '🪜' : '🔁'} ${esc(t.name)}</span>
            <span class="bp-tag">${t.mode === 'egyeni' ? '👤 Egyéni' : '👥 Csapat'}</span>
        </div>
        <div class="bp-muted">${fmtDate(t.date)} · ${t.entities.length} résztvevő · ${t.cupsPerSide} pohár</div>
        ${champ ? `<div class="bp-tour-champ">👑 Bajnok: <b>${champ.emoji} ${esc(champ.name)}</b></div>`
                : `<div class="bp-progress"><span class="bp-progress-fill" style="width:${pct(done, total)}%"></span></div>
                   <div class="bp-muted">${done}/${total} meccs lejátszva</div>`}
        <div class="bp-tour-card-actions">
            <button class="bp-btn bp-btn-primary bp-btn-sm" data-bp="open-tour" data-id="${t.id}">${t.status === 'active' ? '▶️ Folytatás' : '📊 Megtekintés'}</button>
            <button class="bp-btn bp-btn-danger-ghost bp-btn-sm" data-bp="del-tour" data-id="${t.id}">🗑️</button>
        </div>
    </div>`;
}

function renderTournamentForm(el) {
    const f = BP.tourForm;
    const players = BP.roster.players || [];
    const minPlayers = f.mode === 'csapat' ? f.teamSize * 2 : 3;

    el.innerHTML = `
        <div class="bp-section">
            <h3 class="bp-section-title">➕ Új bajnokság</h3>

            <div class="bp-card">
                <h4 class="bp-card-title">Bajnokság neve</h4>
                <input type="text" id="bp-tour-name" class="bp-input" maxlength="40"
                       placeholder="pl. Pénteki Sörpong Kupa" value="${esc(f.name)}">
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">Típus</h4>
                <div class="bp-seg">
                    <button class="bp-seg-btn ${f.mode === 'egyeni' ? 'active' : ''}" data-bp="tf-mode" data-val="egyeni">👤 Egyéni<br><small>mindenki magáért</small></button>
                    <button class="bp-seg-btn ${f.mode === 'csapat' ? 'active' : ''}" data-bp="tf-mode" data-val="csapat">👥 Csapat<br><small>sorsolt csapatok</small></button>
                </div>
                ${f.mode === 'csapat' ? `
                <div class="bp-form-row">
                    <span>Csapatméret:</span>
                    <div class="bp-seg bp-seg-inline">
                        <button class="bp-seg-btn ${f.teamSize === 2 ? 'active' : ''}" data-bp="tf-teamsize" data-val="2">2 fő</button>
                        <button class="bp-seg-btn ${f.teamSize === 3 ? 'active' : ''}" data-bp="tf-teamsize" data-val="3">3 fő</button>
                    </div>
                </div>` : ''}
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">Lebonyolítás</h4>
                <div class="bp-seg">
                    <button class="bp-seg-btn ${f.format === 'kieses' ? 'active' : ''}" data-bp="tf-format" data-val="kieses">🪜 Kieséses<br><small>ágrajz, egyenes kiesés</small></button>
                    <button class="bp-seg-btn ${f.format === 'kormerkozes' ? 'active' : ''}" data-bp="tf-format" data-val="kormerkozes">🔁 Körmérkőzés<br><small>mindenki mindenkivel</small></button>
                </div>
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">Poharak csapatonként <span class="bp-muted">(1–${MAX_CUPS})</span></h4>
                ${cupsPickerHtml(f.cups, 'tfcups')}
            </div>

            <div class="bp-card">
                <h4 class="bp-card-title">Résztvevők <span class="bp-muted">(${f.selected.length} kiválasztva, min. ${minPlayers})</span></h4>
                ${players.length === 0
                    ? `<p class="bp-muted">Nincs még játékos. <button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="nav" data-view="players">👥 Játékosok hozzáadása</button></p>`
                    : `<div class="bp-chip-grid">
                        ${players.map(p => `
                            <button class="bp-chip ${f.selected.includes(p.name) ? 'selected' : ''}" data-bp="tf-toggle" data-name="${esc(p.name)}">
                                ${p.emoji} ${esc(p.name)}
                            </button>`).join('')}
                    </div>`}
            </div>

            <div class="bp-form-actions">
                <button class="bp-btn bp-btn-ghost" data-bp="tf-cancel">Mégse</button>
                <button class="bp-btn bp-btn-primary bp-btn-big ${f.selected.length < minPlayers ? 'disabled' : ''}" data-bp="tf-create">🎲 Sorsolás és indítás</button>
            </div>
        </div>
    `;

    const nameInput = document.getElementById('bp-tour-name');
    if (nameInput) nameInput.addEventListener('input', () => { f.name = nameInput.value; });
}

function createTournament() {
    const f = BP.tourForm;
    const minPlayers = f.mode === 'csapat' ? f.teamSize * 2 : 3;
    if (f.selected.length < minPlayers) {
        bpToast(`Legalább ${minPlayers} játékos kell ehhez a beállításhoz!`, 'error');
        return;
    }

    // Entitások: egyéniben a játékosok, csapatban sorsolt csapatok
    let entities = [];
    if (f.mode === 'egyeni') {
        entities = f.selected.map(name => ({
            id: uid(), name, emoji: emojiForName(name), players: [name]
        }));
    } else {
        const shuffled = shuffle(f.selected);
        const teamCount = Math.floor(shuffled.length / f.teamSize);
        for (let i = 0; i < teamCount; i++) {
            entities.push({
                id: uid(), name: randTeamName(), emoji: randTeamEmoji(),
                players: shuffled.slice(i * f.teamSize, (i + 1) * f.teamSize)
            });
        }
        // Kimaradó játékosok szétosztása a meglévő csapatokba
        shuffled.slice(teamCount * f.teamSize).forEach((p, i) => {
            entities[i % entities.length].players.push(p);
        });
    }

    if (entities.length < 2) {
        bpToast('Legalább 2 csapat/résztvevő kell!', 'error');
        return;
    }

    const t = {
        id: uid(),
        name: (f.name || '').trim() || `Sörpong Kupa (${new Date().toLocaleDateString('hu-HU')})`,
        date: new Date().toISOString(),
        mode: f.mode,
        format: f.format,
        cupsPerSide: f.cups,
        teamSize: f.mode === 'csapat' ? f.teamSize : 1,
        entities,
        matches: [],
        status: 'active',
        champion: null
    };

    if (f.format === 'kieses') {
        t.matches = buildKnockoutMatches(entities);
        resolveByes(t);
    } else {
        t.matches = buildRoundRobinMatches(entities);
    }

    checkTournamentFinished(t);
    BP.tournaments.unshift(t);
    persistTournament(t);
    BP.tourForm = null;
    BP.activeTournamentId = t.id;
    renderView();
    bpToast('Bajnokság kisorsolva! Sok sikert! 🏆', 'success');
    if (typeof confetti === 'function') confetti({ particleCount: 80, spread: 90, origin: { y: 0.5 }, zIndex: 10050 });
}

// Kieséses ágrajz felépítése (bye-okkal a 2 hatványára töltve)
function buildKnockoutMatches(entities) {
    const shuffled = shuffle(entities.map(e => e.id));
    let size = 1;
    while (size < shuffled.length) size *= 2;

    // A bye-okat szétszórjuk: minden párba először 1 játékos kerül, a maradék helyekre jut ellenfél
    const slots = Array(size).fill(null);
    for (let i = 0; i < shuffled.length; i++) {
        // páros indexek először (0,2,4...), majd páratlanok - így a bye-ok eloszlanak
        const pos = i < size / 2 ? i * 2 : (i - size / 2) * 2 + 1;
        slots[pos] = shuffled[i];
    }

    const matches = [];
    const totalRounds = Math.log2(size);
    // 1. kör a slotokból
    for (let i = 0; i < size / 2; i++) {
        matches.push({ id: uid(), round: 1, pos: i, a: slots[i * 2], b: slots[i * 2 + 1], winner: null, gameId: null, aCups: null, bCups: null });
    }
    // További körök üresen
    for (let r = 2; r <= totalRounds; r++) {
        const count = size / Math.pow(2, r);
        for (let i = 0; i < count; i++) {
            matches.push({ id: uid(), round: r, pos: i, a: null, b: null, winner: null, gameId: null, aCups: null, bCups: null });
        }
    }
    return matches;
}

// Bye meccsek automatikus lezárása + továbbjuttatás
function resolveByes(t) {
    let changed = true;
    while (changed) {
        changed = false;
        t.matches.forEach(m => {
            if (m.winner != null) return;
            if (m.a && !m.b && isByeSlotFinal(t, m, 'b')) { m.winner = m.a; propagateWinner(t, m); changed = true; }
            else if (m.b && !m.a && isByeSlotFinal(t, m, 'a')) { m.winner = m.b; propagateWinner(t, m); changed = true; }
        });
    }
}

// Egy üres slot akkor végleges bye, ha nem érkezhet bele későbbi győztes
function isByeSlotFinal(t, match, slot) {
    if (match.round === 1) return true;
    const feederPos = match.pos * 2 + (slot === 'a' ? 0 : 1);
    const feeder = t.matches.find(m => m.round === match.round - 1 && m.pos === feederPos);
    if (!feeder) return true;
    // Ha a feeder meccsnek egyáltalán nincs résztvevője, üres ág
    return !feeder.a && !feeder.b && feeder.winner == null;
}

function propagateWinner(t, match) {
    if (t.format !== 'kieses') return;
    const next = t.matches.find(m => m.round === match.round + 1 && m.pos === Math.floor(match.pos / 2));
    if (!next) return;
    if (match.pos % 2 === 0) next.a = match.winner; else next.b = match.winner;
}

// Körmérkőzés párosítások (kör-módszer)
function buildRoundRobinMatches(entities) {
    const ids = entities.map(e => e.id);
    if (ids.length % 2 === 1) ids.push(null); // bye
    const n = ids.length;
    const rounds = n - 1;
    const matches = [];
    const arr = [...ids];
    for (let r = 1; r <= rounds; r++) {
        for (let i = 0; i < n / 2; i++) {
            const a = arr[i], b = arr[n - 1 - i];
            if (a != null && b != null) {
                matches.push({ id: uid(), round: r, pos: i, a, b, winner: null, gameId: null, aCups: null, bCups: null });
            }
        }
        // forgatás (az első elem fix)
        arr.splice(1, 0, arr.pop());
    }
    return matches;
}

// Meccs eredmény visszaírása a bajnokságba. Visszaadja a bajnok nevét, ha most dőlt el.
function applyMatchResult(t, game) {
    const m = t.matches.find(x => x.id === game.matchId);
    if (!m) return null;
    const ts = gameTeamStats(game);
    // game.teams[0] = m.a entitás, game.teams[1] = m.b entitás
    m.winner = game.winner === 0 ? m.a : m.b;
    m.gameId = game.id;
    m.aCups = ts[0].cups;
    m.bCups = ts[1].cups;
    if (t.format === 'kieses') {
        propagateWinner(t, m);
        resolveByes(t);
    }
    return checkTournamentFinished(t);
}

function checkTournamentFinished(t) {
    const playable = t.matches.filter(m => !(m.a == null && m.b == null));
    const allDone = playable.every(m => m.winner != null);
    if (!allDone) return null;

    let champion = null;
    if (t.format === 'kieses') {
        const maxRound = Math.max(...t.matches.map(m => m.round));
        const final = t.matches.find(m => m.round === maxRound);
        champion = final ? final.winner : null;
    } else {
        const standings = roundRobinStandings(t);
        champion = standings[0] ? standings[0].id : null;
    }
    t.champion = champion;
    t.status = 'finished';
    const e = champion ? entityById(t, champion) : null;
    return e ? e.name : null;
}

function roundRobinStandings(t) {
    const table = {};
    t.entities.forEach(e => {
        table[e.id] = { id: e.id, name: e.name, emoji: e.emoji, played: 0, wins: 0, losses: 0, cupsFor: 0, cupsAgainst: 0, pts: 0 };
    });
    t.matches.forEach(m => {
        if (m.winner == null) return;
        const a = table[m.a], b = table[m.b];
        if (!a || !b) return;
        a.played++; b.played++;
        a.cupsFor += m.aCups || 0; a.cupsAgainst += m.bCups || 0;
        b.cupsFor += m.bCups || 0; b.cupsAgainst += m.aCups || 0;
        if (m.winner === m.a) { a.wins++; a.pts += 3; b.losses++; }
        else { b.wins++; b.pts += 3; a.losses++; }
    });
    const list = Object.values(table);
    list.forEach(e => { e.diff = e.cupsFor - e.cupsAgainst; });
    list.sort((x, y) => y.pts - x.pts || y.diff - x.diff || y.cupsFor - x.cupsFor);
    return list;
}

function renderTournamentDetail(el, t) {
    const done = t.matches.filter(m => m.winner != null).length;
    const total = t.matches.length;
    const champ = t.champion ? entityById(t, t.champion) : null;

    el.innerHTML = `
        <div class="bp-section">
            <div class="bp-tour-detail-head">
                <button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="close-tour">⬅️ Bajnokságok</button>
                <h3 class="bp-section-title">${t.format === 'kieses' ? '🪜' : '🔁'} ${esc(t.name)}</h3>
                <div class="bp-tour-detail-tags">
                    <span class="bp-tag">${t.mode === 'egyeni' ? '👤 Egyéni' : '👥 Csapat'}</span>
                    <span class="bp-tag">${t.cupsPerSide} pohár</span>
                    <span class="bp-tag">${done}/${total} meccs</span>
                </div>
            </div>

            ${champ ? `<div class="bp-champion-banner">
                <span class="bp-champion-crown">👑</span>
                <div><div class="bp-muted">A bajnokság győztese</div>
                <div class="bp-champion-name">${champ.emoji} ${esc(champ.name)}</div>
                ${t.mode === 'csapat' ? `<div class="bp-muted">${(champ.players || []).map(esc).join(', ')}</div>` : ''}</div>
                <span class="bp-champion-crown">🏆</span>
            </div>` : ''}

            ${t.format === 'kieses' ? renderBracket(t) : renderRoundRobin(t)}
        </div>
    `;
}

function renderBracket(t) {
    const rounds = [...new Set(t.matches.map(m => m.round))].sort((a, b) => a - b);
    return `<div class="bp-bracket-scroll"><div class="bp-bracket">
        ${rounds.map(r => `
            <div class="bp-bracket-round">
                <div class="bp-bracket-round-title">${roundName(t, r)}</div>
                ${t.matches.filter(m => m.round === r).sort((a, b) => a.pos - b.pos).map(m => bracketMatchHtml(t, m)).join('')}
            </div>`).join('')}
    </div></div>`;
}

function bracketMatchHtml(t, m) {
    const a = m.a ? entityById(t, m.a) : null;
    const b = m.b ? entityById(t, m.b) : null;
    const playable = a && b && m.winner == null && t.status === 'active';
    const isBye = m.winner != null && !m.gameId;

    const slot = (e, isWinner, cups) => `
        <div class="bp-bracket-slot ${isWinner ? 'winner' : ''} ${!e ? 'empty' : ''}">
            <span class="bp-bracket-slot-name">${e ? `${e.emoji} ${esc(e.name)}` : '—'}</span>
            ${cups != null ? `<span class="bp-bracket-cups">${cups}</span>` : ''}
            ${isWinner ? '<span class="bp-bracket-check">✓</span>' : ''}
        </div>`;

    return `<div class="bp-bracket-match ${m.winner != null ? 'done' : ''} ${playable ? 'playable' : ''}">
        ${slot(a, m.winner != null && m.winner === m.a, m.aCups)}
        ${slot(b, m.winner != null && m.winner === m.b, m.bCups)}
        ${playable ? `<button class="bp-btn bp-btn-primary bp-btn-sm bp-bracket-play" data-bp="play-match" data-tour="${t.id}" data-match="${m.id}">▶️ Lejátszás</button>` : ''}
        ${isBye ? '<div class="bp-bracket-bye">erőnyerő ✨</div>' : ''}
        ${m.gameId ? `<button class="bp-bracket-statlink" data-bp="show-stats" data-id="${m.gameId}">📊 statisztika</button>` : ''}
    </div>`;
}

function renderRoundRobin(t) {
    const standings = roundRobinStandings(t);
    const rounds = [...new Set(t.matches.map(m => m.round))].sort((a, b) => a - b);
    return `
        <div class="bp-card">
            <h4 class="bp-card-title">📋 Tabella <span class="bp-muted">(győzelem = 3 pont)</span></h4>
            <div class="bp-table-scroll">
                <table class="bp-table">
                    <thead><tr><th>#</th><th>${t.mode === 'egyeni' ? 'Játékos' : 'Csapat'}</th><th>M</th><th>GY</th><th>V</th><th>🍺 +</th><th>🍺 −</th><th>+/−</th><th>Pont</th></tr></thead>
                    <tbody>
                        ${standings.map((s, i) => `<tr class="${i === 0 && t.status === 'finished' ? 'bp-row-mvp' : ''}">
                            <td>${i + 1}</td>
                            <td>${s.emoji} ${esc(s.name)} ${i === 0 && t.status === 'finished' ? '👑' : ''}</td>
                            <td>${s.played}</td><td>${s.wins}</td><td>${s.losses}</td>
                            <td>${s.cupsFor}</td><td>${s.cupsAgainst}</td>
                            <td>${s.diff > 0 ? '+' : ''}${s.diff}</td>
                            <td><b>${s.pts}</b></td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        ${rounds.map(r => `
        <div class="bp-card">
            <h4 class="bp-card-title">${r}. forduló</h4>
            <div class="bp-rr-matches">
                ${t.matches.filter(m => m.round === r).map(m => {
                    const a = entityById(t, m.a), b = entityById(t, m.b);
                    const playable = m.winner == null && t.status === 'active';
                    return `<div class="bp-rr-match ${m.winner != null ? 'done' : ''}">
                        <span class="bp-rr-side ${m.winner === m.a ? 'winner' : ''}">${a ? `${a.emoji} ${esc(a.name)}` : '—'}</span>
                        <span class="bp-rr-mid">${m.winner != null ? `${m.aCups} : ${m.bCups}` : 'vs'}</span>
                        <span class="bp-rr-side right ${m.winner === m.b ? 'winner' : ''}">${b ? `${b.emoji} ${esc(b.name)}` : '—'}</span>
                        ${playable ? `<button class="bp-btn bp-btn-primary bp-btn-sm" data-bp="play-match" data-tour="${t.id}" data-match="${m.id}">▶️</button>`
                                   : (m.gameId ? `<button class="bp-btn bp-btn-ghost bp-btn-sm" data-bp="show-stats" data-id="${m.gameId}">📊</button>` : '')}
                    </div>`;
                }).join('')}
            </div>
        </div>`).join('')}
    `;
}

function playTournamentMatch(tourId, matchId) {
    if (BP.game && BP.game.winner == null) {
        bpToast('Előbb fejezd be (vagy szakítsd meg) a folyamatban lévő meccset! ⏳', 'error');
        setView('game');
        return;
    }
    const t = BP.tournaments.find(x => x.id === tourId);
    if (!t) return;
    const m = t.matches.find(x => x.id === matchId);
    if (!m || !m.a || !m.b || m.winner != null) return;

    const a = entityById(t, m.a), b = entityById(t, m.b);
    const game = {
        id: uid(),
        date: new Date().toISOString(),
        startTs: Date.now(),
        cupsPerSide: t.cupsPerSide,
        tournamentId: t.id,
        matchId: m.id,
        teams: [
            { name: a.name, emoji: a.emoji, players: [...a.players] },
            { name: b.name, emoji: b.emoji, players: [...b.players] }
        ],
        cups: [Array(t.cupsPerSide).fill(true), Array(t.cupsPerSide).fill(true)],
        throws: [],
        winner: null,
        durationSec: null
    };
    BP.game = game;
    BP.thrower = null;
    BP.bounceMode = false;
    saveDraft();
    setView('game');
}

function deleteTournament(id) {
    if (!confirm('Biztosan törlöd ezt a bajnokságot? (A lejátszott meccsek megmaradnak az előzményekben.)')) return;
    BP.tournaments = BP.tournaments.filter(t => t.id !== id);
    if (BP.activeTournamentId === id) BP.activeTournamentId = null;
    writeCache();
    bpApi({ action: 'BEERPONG_DELETE', type: 'tournament', id })
        .then(r => bpToast(r.queued ? 'Offline: a törlés sorban áll. 📡' : 'Bajnokság törölve. 🗑️', 'success'))
        .catch(err => bpToast('Törlési hiba: ' + err.message, 'error'));
    renderView();
}

// ---------- OVERLAY ----------

function closeOverlay() {
    if (activeDrawCancel) { activeDrawCancel(); activeDrawCancel = null; }
    const ov = document.getElementById('bp-overlay');
    if (ov) ov.remove();
}

// ---------- ÚTMUTATÓ (❓) ----------

function showHelpOverlay() {
    closeOverlay();
    const ov = document.createElement('div');
    ov.className = 'bp-overlay';
    ov.id = 'bp-overlay';
    ov.innerHTML = `
        <div class="bp-overlay-box bp-help-box">
            <button class="bp-help-close" data-bp="close-overlay" title="Bezárás">✕</button>
            <h3 class="bp-draw-title">❓ Sörpong útmutató</h3>

            <h4>👥 1. Játékosok</h4>
            <p>Először add hozzá a játékosokat a <b>Játékosok</b> fülön. Emoji avatart kapnak – az avatarra kattintva újat sorsolhatsz.</p>

            <h4>🎯 2. Új meccs</h4>
            <p>Állítsd be a poharak számát (<b>1–20</b>, gyorsgombokkal vagy a −/+ léptetővel), jelöld ki, kik játszanak, majd nyomd meg a <b>🎲 Csapatok kisorsolása</b> gombot. A fénycsík végigfut a neveken, és kisorsolja a két csapatot. A végén <b>saját csapatnevet</b> is beírhattok (vagy 🎲 új véletlen név).</p>

            <h4>🏓 3. A meccs</h4>
            <ul>
                <li>Csak a <b>kezdő dobót</b> kell kiválasztani – utána a sorrend automatikus: mindig az ellenfél jön, csapaton belül felváltva dobtok. Bármikor átválaszthatsz másik játékosra.</li>
                <li><b>Találat:</b> kattints az ellenfél eltalált poharára. 🍺</li>
                <li><b>✌️ Pattintott:</b> kapcsold be dobás előtt – a pattintott találat 2 poharat ér!</li>
                <li><b>❌ Mellé:</b> ha nem talált. <b>↩️ Vissza:</b> az utolsó dobás visszavonása.</li>
                <li><b>⛶ Teljes képernyő:</b> csak a játék látszik, semmi más.</li>
                <li>Az nyer, aki előbb kilövi az ellenfél összes poharát. 🏆</li>
            </ul>

            <h4>🏆 4. Bajnokság</h4>
            <p>Válassz <b>egyéni</b> vagy <b>csapat</b> módot (a csapatokat a gép sorsolja), és <b>kieséses ágrajzot</b> vagy <b>körmérkőzést</b>. A meccseket az ágrajzból / a fordulókból indítod a ▶️ gombbal, az eredmény magától kerül vissza.</p>

            <h4>🥇 5. Toplista és statisztika</h4>
            <p>Minden meccs után részletes statisztika készül (MVP, pontosság, sorozatok, grafikon), és épül az <b>egyéni</b> és <b>csapat toplista</b>. Mindezt csak te látod, a saját profilodon. 🔒</p>

            <h4>📶 Offline</h4>
            <p>Nincs net? Nem gond – a mentések sorba állnak, és automatikusan szinkronizálódnak, amint visszajön a kapcsolat.</p>

            <div class="bp-draw-actions">
                <button class="bp-btn bp-btn-primary" data-bp="close-overlay">Értem! 👍</button>
            </div>
        </div>
    `;
    // Teljes képernyős módban a body-ra tett overlay nem látszana
    (document.fullscreenElement || document.body).appendChild(ov);
    requestAnimationFrame(() => ov.classList.add('show'));
}

// ---------- TELJES KÉPERNYŐS JÁTÉK (⛶) ----------

function toggleGameFullscreen() {
    if (BP.fullscreen) { exitGameFullscreen(); return; }
    BP.fullscreen = true;
    document.body.classList.add('bp-game-fs');
    // Natív fullscreen a stabil #bp-view elemre (a meccs újrarenderelése nem dobja ki);
    // ha a böngésző nem támogatja, a CSS fallback (body osztály) akkor is teljes képernyőt ad
    const view = document.getElementById('bp-view');
    if (view && view.requestFullscreen) view.requestFullscreen().catch(() => {});
    renderView();
}

function exitGameFullscreen() {
    if (!BP.fullscreen) return;
    BP.fullscreen = false;
    document.body.classList.remove('bp-game-fs');
    if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
    }
    renderView();
}

// Ha Esc-kel lép ki a natív fullscreenből, az állapotot szinkronban tartjuk
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && BP.fullscreen) {
        BP.fullscreen = false;
        document.body.classList.remove('bp-game-fs');
        renderView();
    }
});

// Az overlay-ek a body-ra kerülnek, ezért ott is figyeljük a kattintásokat.
// A __bpHandled flag védi ki a dupla feldolgozást: a root handler fut előbb
// (bubbling), és ha újrarenderel, a gomb már nincs a DOM-ban - a closest()
// ellenőrzés ezért nem lenne megbízható.
document.addEventListener('click', (e) => {
    if (e.__bpHandled) return;
    const btn = e.target.closest('[data-bp]');
    if (!btn) return;
    handleAction(btn, e);
});

function handleRootClick(e) {
    const btn = e.target.closest('[data-bp]');
    if (!btn) return;
    e.__bpHandled = true;
    handleAction(btn, e);
}

// ---------- KÖZPONTI ESEMÉNYKEZELŐ ----------

function handleAction(btn, e) {
    const act = btn.dataset.bp;

    switch (act) {
        case 'nav':
            if (btn.dataset.view === 'setup' && BP.game && BP.game.winner == null) { setView('game'); return; }
            setView(btn.dataset.view);
            break;
        case 'reload':
            loadData();
            break;
        case 'help': showHelpOverlay(); break;
        case 'close-overlay': closeOverlay(); break;
        case 'toggle-fs': toggleGameFullscreen(); break;

        // Játékosok
        case 'add-player': addPlayer(); break;
        case 'del-player': {
            const p = (BP.roster.players || []).find(x => x.id === btn.dataset.id);
            if (p && confirm(`Törlöd ${p.name} játékost? (A korábbi meccsek statisztikái megmaradnak.)`)) {
                BP.roster.players = BP.roster.players.filter(x => x.id !== btn.dataset.id);
                persistRoster();
                renderView();
            }
            break;
        }
        case 'reroll-emoji': {
            const p = (BP.roster.players || []).find(x => x.id === btn.dataset.id);
            if (p) {
                p.emoji = PLAYER_EMOJI[Math.floor(Math.random() * PLAYER_EMOJI.length)];
                persistRoster();
                renderView();
            }
            break;
        }

        // Új meccs setup
        case 'cups-set':
            BP.setup.cups = clampCups(btn.dataset.val);
            renderView();
            break;
        case 'cups-adj':
            BP.setup.cups = clampCups(BP.setup.cups + Number(btn.dataset.delta));
            renderView();
            break;
        case 'setup-teamsize':
            BP.setup.teamSize = Number(btn.dataset.val);
            renderView();
            break;
        case 'toggle-select': {
            const name = btn.dataset.name;
            const i = BP.setup.selected.indexOf(name);
            if (i === -1) BP.setup.selected.push(name); else BP.setup.selected.splice(i, 1);
            renderView();
            break;
        }
        case 'draw-teams':
            if (BP.game && BP.game.winner == null) { bpToast('Már fut egy meccs! ⏳', 'error'); setView('game'); return; }
            drawTeams();
            break;
        case 'redraw': drawTeams(); break;
        case 'reroll-teamname': {
            const inp = document.getElementById(`bp-team-name-${btn.dataset.team}`);
            if (inp) inp.value = randTeamName();
            break;
        }
        case 'start-game': startGameFromDraw(); break;

        // Félbehagyott meccs
        case 'resume-draft': {
            const d = readDraft();
            if (d) {
                if (!d.startTs) d.startTs = Date.now() - ((d.throws.length ? d.throws[d.throws.length - 1].t : 0) * 1000);
                BP.game = d;
                BP.thrower = deriveNextThrower(d);
                setView('game');
            }
            break;
        }
        case 'discard-draft':
            if (confirm('Biztosan elveted a félbehagyott meccset?')) { clearDraft(); renderView(); }
            break;

        // Meccs közben
        case 'pick-thrower': pickThrower(btn.dataset.team, btn.dataset.name); break;
        case 'toggle-bounce':
            BP.bounceMode = !BP.bounceMode;
            btn.classList.toggle('active', BP.bounceMode);
            break;
        case 'cup': {
            if (!BP.thrower) { bpToast('Előbb válaszd ki, ki dob! 👆', 'error'); return; }
            const team = Number(btn.dataset.team);
            if (team === BP.thrower.team) { bpToast('A saját poharadba ne dobj! 😅', 'error'); return; }
            const idx = Number(btn.dataset.idx);
            const result = BP.bounceMode ? 'bounce' : 'hit';
            BP.bounceMode = false;
            recordThrow(result, team, idx);
            break;
        }
        case 'throw-miss': {
            if (!BP.thrower) { bpToast('Előbb válaszd ki, ki dob! 👆', 'error'); return; }
            recordThrow('miss', 1 - BP.thrower.team, null);
            break;
        }
        case 'undo-throw': undoThrow(); break;
        case 'abort-game': abortGame(); break;

        // Meccs vége / statisztika
        case 'show-stats': {
            closeOverlay();
            const g = BP.games.find(x => x.id === btn.dataset.id);
            if (g) {
                BP.statsGame = g;
                BP.statsBackView = g.tournamentId ? 'tournament' : 'history';
                if (g.tournamentId) BP.activeTournamentId = g.tournamentId;
                setView('stats');
            }
            break;
        }
        case 'victory-home': closeOverlay(); setView('home'); break;
        case 'back-to-tour':
            closeOverlay();
            BP.activeTournamentId = btn.dataset.id;
            setView('tournament');
            break;

        // Előzmények
        case 'open-game': {
            const g = BP.games.find(x => x.id === btn.dataset.id);
            if (g) {
                BP.statsGame = g;
                BP.statsBackView = 'home';
                setView('stats');
            }
            break;
        }
        case 'toggle-history':
            BP.historyOpenId = BP.historyOpenId === btn.dataset.id ? null : btn.dataset.id;
            renderView();
            break;
        case 'del-game': deleteGame(btn.dataset.id); break;

        // Leaderboard
        case 'lb-tab': BP.lbTab = btn.dataset.tab; renderView(); break;
        case 'lb-sort':
            BP.lbSort = { key: btn.dataset.key, dir: -1 };
            renderView();
            break;

        // Tournament
        case 'new-tour':
            BP.tourForm = { name: '', mode: 'egyeni', format: 'kieses', cups: 6, teamSize: 2, selected: [] };
            renderView();
            break;
        case 'tf-mode': BP.tourForm.mode = btn.dataset.val; renderView(); break;
        case 'tf-format': BP.tourForm.format = btn.dataset.val; renderView(); break;
        case 'tfcups-set': BP.tourForm.cups = clampCups(btn.dataset.val); renderView(); break;
        case 'tfcups-adj': BP.tourForm.cups = clampCups(BP.tourForm.cups + Number(btn.dataset.delta)); renderView(); break;
        case 'tf-teamsize': BP.tourForm.teamSize = Number(btn.dataset.val); renderView(); break;
        case 'tf-toggle': {
            const name = btn.dataset.name;
            const i = BP.tourForm.selected.indexOf(name);
            if (i === -1) BP.tourForm.selected.push(name); else BP.tourForm.selected.splice(i, 1);
            renderView();
            break;
        }
        case 'tf-cancel': BP.tourForm = null; renderView(); break;
        case 'tf-create': createTournament(); break;
        case 'open-tour':
            BP.activeTournamentId = btn.dataset.id;
            setView('tournament');
            break;
        case 'close-tour':
            BP.activeTournamentId = null;
            renderView();
            break;
        case 'play-match': playTournamentMatch(btn.dataset.tour, btn.dataset.match); break;
        case 'del-tour': deleteTournament(btn.dataset.id); break;
    }
}

})();
