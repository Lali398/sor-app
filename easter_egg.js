/**
 * 🗝️ "A Pince Titka" – Titkos Easter Egg Rendszer
 * 10 lépéses lánc az Eredmények tab-tól a végső unlock-ig
 */
(function () {
  'use strict';

  /* ─────────────────── KONFIGURÁCIÓ ─────────────────── */
  const PROGRESS_KEY   = 'pince_titka_step';
  const DONE_KEY       = 'pince_titka_done';
  const ACH_ID         = 'easter_pince_titka';

  const HINTS = [
    // [0] step 1 lépés után megjelenik
    'Minden nagy utazás egy első kortyal kezdődik... melyik volt a tied? 🍺',
    // [1] step 2 után
    'Az idő megáll egy pillanatra... de te messzebbre jutottál. Mi volt a csúcsod? ⭐',
    // [2] step 3 után
    'Az arany megvan. De a mélység is tanít... mi volt a legnagyobb csalódásod? 💀',
    // [3] step 4 után
    'Végletek közt az egyensúly... hol látod magad egészben? 🕷️',
    // [4] step 5 után
    'Az érzékeid feltérképezve. De mikor vagy a legszenvedélyesebb? 📅',
    // [5] step 6 után
    'Az idő kerekét nem lehet visszaforgatni... bízd a véletlenre! 🎲',
    // [6] step 7 után
    'A véletlen szólt. Most te szólj... ajánlj valamit a közösségnek! 📢',
    // [7] step 8 után
    'Az ajánlásod megvan. Van még egy üzeneted... küldj egyet a jövőnek! 💡',
    // [8] step 9 után
    'A dicsőség örök. Már csak egy titkot őrzöl... nézz a tükörbe! 👤',
  ];

  /* ─────────────────── ÁLLAPOT ─────────────────── */
  function getStep()  { try { return parseInt(localStorage.getItem(PROGRESS_KEY) || '0'); } catch { return 0; } }
  function setStep(n) { try { localStorage.setItem(PROGRESS_KEY, String(n)); } catch {} }
  function isDone()   { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return false; } }
  function markDone() { try { localStorage.setItem(DONE_KEY, '1'); } catch {} }

  /* ─────────────────── LÉPÉS ELŐREHALADÁS ─────────────────── */
  function tryAdvance(expectedStep) {
    if (isDone() && expectedStep === 1) return;   // már teljesítve
    const cur = getStep();
    if (cur !== expectedStep - 1) return;          // nem a helyes sorrend

    setStep(expectedStep);

    if (expectedStep < 10) {
      showEggToast(HINTS[expectedStep - 1]);
    } else {
      triggerFinalUnlock();
    }
  }

  /* ─────────────────── TOAST ÜZENET ─────────────────── */
  function showEggToast(msg) {
    let old = document.getElementById('pinceToast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.id = 'pinceToast';
    t.innerHTML = `<span style="font-size:1.3rem;margin-right:10px;">🗝️</span><span>${msg}</span>`;
    Object.assign(t.style, {
      position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%) translateY(30px)',
      background: 'linear-gradient(135deg,#2c003e,#1a0030)', border: '1px solid #8a73ff',
      color: '#fff', padding: '14px 22px', borderRadius: '14px', zIndex: '99999',
      maxWidth: '90vw', boxShadow: '0 8px 30px rgba(138,115,255,0.4)',
      display: 'flex', alignItems: 'center', fontFamily: 'Poppins,sans-serif',
      fontSize: '0.92rem', opacity: '0', transition: 'all 0.4s ease',
      backdropFilter: 'blur(10px)'
    });
    document.body.appendChild(t);
    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(30px)';
      setTimeout(() => t.remove(), 500);
    }, 6000);
  }

  /* ─────────────────── VÉGSŐ UNLOCK ─────────────────── */
  function triggerFinalUnlock() {
    markDone();

    // 1) Confetti robbanás
    if (typeof confetti === 'function') {
      const burst = (origin) => confetti({
        particleCount: 150, spread: 100, origin,
        colors: ['#8a73ff','#ffd700','#ff6384','#00b09b','#fff']
      });
      burst({ y: 0.7, x: 0.3 });
      setTimeout(() => burst({ y: 0.5, x: 0.7 }), 300);
      setTimeout(() => burst({ y: 0.6, x: 0.5 }), 600);
    }

    // 2) Achievement unlock (az app belső rendszerén keresztül)
    unlockEasterAchievement();

    // 3) Üdvözlő modal
    setTimeout(() => showUnlockModal(), 800);
  }

  function unlockEasterAchievement() {
    try {
      let userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData) return;
      if (!userData.achievements) userData.achievements = { unlocked: [] };
      if (!userData.achievements.unlocked) userData.achievements.unlocked = [];

      const alreadyUnlocked = userData.achievements.unlocked.some(a => a.id === ACH_ID);
      if (!alreadyUnlocked) {
        userData.achievements.unlocked.push({ id: ACH_ID, unlockedAt: new Date().toISOString() });
        localStorage.setItem('userData', JSON.stringify(userData));

        // Mentés a cloudba az app saját függvényével
        if (typeof saveAchievementsToCloud === 'function') {
          saveAchievementsToCloud(userData.achievements, userData.badge).catch(() => {});
        }
      }

      // Frissíti az achievement gridet
      if (typeof renderAchievements === 'function') {
        renderAchievements();
      }
    } catch (e) {
      console.warn('Pince Titka – achievement save hiba:', e);
    }
  }

  function showUnlockModal() {
    let old = document.getElementById('pinceModal');
    if (old) old.remove();

    const m = document.createElement('div');
    m.id = 'pinceModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
    m.innerHTML = `
      <div style="background:linear-gradient(135deg,#1a0030,#0d001a);border:2px solid #ffd700;border-radius:20px;padding:40px 30px;max-width:420px;width:90%;text-align:center;box-shadow:0 0 60px rgba(255,215,0,0.3);animation:pincePopIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both;font-family:Poppins,sans-serif;color:#fff;">
        <div style="font-size:4rem;margin-bottom:10px;animation:pinceSpin 1s ease-out;">🗝️</div>
        <h2 style="color:#ffd700;font-size:1.6rem;margin:0 0 8px;">A Pince Titka</h2>
        <p style="color:#a29bfe;font-size:0.9rem;margin:0 0 20px;">Titkos achievement kinyitva!</p>
        <p style="color:#e0e0e0;font-size:0.88rem;line-height:1.6;margin-bottom:25px;">
          Végigjártad a pince összes titkát. A sörmester útja nem mindig egyenes – de te kitartottál a végéig. 🏆
        </p>
        <button onclick="document.getElementById('pinceModal').remove()" style="background:linear-gradient(135deg,#ffd700,#f39c12);color:#000;font-weight:800;border:none;padding:12px 30px;border-radius:12px;font-size:1rem;cursor:pointer;font-family:Poppins,sans-serif;">
          ✨ Köszönöm, büszke vagyok!
        </button>
      </div>
      <style>
        @keyframes pincePopIn { from{opacity:0;transform:scale(0.5)} to{opacity:1;transform:scale(1)} }
        @keyframes pinceSpin  { from{transform:rotate(-360deg)} to{transform:rotate(0)} }
      </style>
    `;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target === m) m.remove(); });
  }

  /* ═══════════════════════════════════════════════
       ACHIEVEMENT KÁRTYA INJEKTÁLÁS
  ═══════════════════════════════════════════════ */
  function injectSecretCard() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;
    if (grid.querySelector(`[data-egg-card="1"]`)) return; // már benne van

    const done = isDone();
    const card = document.createElement('div');
    card.setAttribute('data-egg-card', '1');
    card.style.cssText = `
      background: ${done ? 'linear-gradient(135deg,#1a0030,#2c0050)' : 'linear-gradient(135deg,#0d0d0d,#1a1a1a)'};
      border: 2px solid ${done ? '#ffd700' : '#444'};
      border-radius: 15px; padding: 18px; cursor: pointer;
      transition: all 0.3s; position: relative; overflow: hidden;
      box-shadow: ${done ? '0 0 20px rgba(255,215,0,0.3)' : 'none'};
    `;
    card.innerHTML = done
      ? `<div style="font-size:2.2rem;text-align:center;margin-bottom:8px;">🗝️</div>
         <div style="font-weight:700;text-align:center;color:#ffd700;font-size:0.95rem;">A Pince Titka</div>
         <div style="font-size:0.78rem;color:#aaa;text-align:center;margin-top:5px;">Végigjártad a pince titkát</div>
         <div style="font-size:0.7rem;color:#ffd700;text-align:center;margin-top:4px;">🏆 KINYITVA</div>`
      : `<div style="font-size:2.2rem;text-align:center;margin-bottom:8px;filter:grayscale(1) brightness(0.4);">🔒</div>
         <div style="font-weight:700;text-align:center;color:#555;font-size:0.95rem;">????</div>
         <div style="font-size:0.78rem;color:#333;text-align:center;margin-top:5px;">Titok rejtezik itt...</div>
         <div style="font-size:0.7rem;color:#444;text-align:center;margin-top:4px;">Fedezd fel a pincét!</div>`;

    card.addEventListener('click', () => {
      if (isDone()) {
        showEggToast('Már teljesítetted a Pince Titkát! 🗝️');
        return;
      }
      tryAdvance(1);
    });

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-3px)';
      if (!isDone()) card.style.border = '2px solid #8a73ff';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      if (!isDone()) card.style.border = '2px solid #444';
    });

    // Mindig az első helyre kerül a gridben
    grid.insertBefore(card, grid.firstChild);
  }

  /* ═══════════════════════════════════════════════
       STEP 2 – Legrégebbi bejegyzés dátumcellájára kattintás
       STEP 3 – Legjobb pontszám cellájára kattintás
       STEP 4 – Legrosszabb pontszám cellájára kattintás
  ═══════════════════════════════════════════════ */
  function markSpecialCells() {
    // Összegyűjtjük a globális adatokat
    const beers  = (typeof currentUserBeers  !== 'undefined' ? currentUserBeers  : []) || [];
    const drinks = (typeof currentUserDrinks !== 'undefined' ? currentUserDrinks : []) || [];
    const all    = [...beers, ...drinks];
    if (all.length === 0) return;

    // Legrégebbi (step 2)
    const oldest = all.reduce((a, b) => {
      const da = a.date ? new Date(a.date) : new Date(0);
      const db = b.date ? new Date(b.date) : new Date(0);
      return da < db ? a : b;
    });
    // Legjobb avg (step 3)
    const best   = all.reduce((a, b) => (parseFloat(a.avg) > parseFloat(b.avg) ? a : b));
    // Legrosszabb avg (legalább > 0) (step 4)
    const worstPool = all.filter(x => parseFloat(x.avg) > 0);
    const worst  = worstPool.length ? worstPool.reduce((a, b) => (parseFloat(a.avg) < parseFloat(b.avg) ? a : b)) : null;

    // Jelöljük a cellákat mindkét táblában
    [
      document.getElementById('userBeerTableBody'),
      document.getElementById('userDrinkTableBody')
    ].forEach(tbody => {
      if (!tbody) return;
      const rows = tbody.querySelectorAll('tr');
      rows.forEach(row => {
        // Dátumcella: első <td>
        const dateTd   = row.querySelector('td:first-child');
        // Átlagcella: 9. vagy 11. <td> (sör: 9, ital: 11)
        const avgTd    = row.querySelector('td.average-cell');

        if (!dateTd || !avgTd) return;

        const rowAvg   = parseFloat(avgTd.textContent);
        const rowDate  = dateTd.textContent.trim();
        const oldestFmt = oldest.date ? new Date(oldest.date).toLocaleDateString('hu-HU') : '';
        const bestFmt  = parseFloat(best.avg || 0).toFixed(2);
        const worstFmt = worst ? parseFloat(worst.avg || 0).toFixed(2) : null;

        // STEP 2 marker
        if (rowDate === oldestFmt && !dateTd.dataset.eggMarked) {
          dateTd.dataset.eggMarked = 'oldest';
          dateTd.style.cursor = 'pointer';
          dateTd.style.userSelect = 'none';
          dateTd.title = '🗝️ Kattints ide...';
          dateTd.addEventListener('click', () => tryAdvance(2), { once: false });
        }

        // STEP 3 marker
        if (avgTd.textContent.trim() === bestFmt && !avgTd.dataset.eggStep3) {
          avgTd.dataset.eggStep3 = '1';
          avgTd.style.cursor = 'pointer';
          avgTd.style.userSelect = 'none';
          avgTd.title = '⭐ Kattints a csúcsra...';
          avgTd.addEventListener('click', () => tryAdvance(3), { once: false });
        }

        // STEP 4 marker
        if (worstFmt && avgTd.textContent.trim() === worstFmt && !avgTd.dataset.eggStep4) {
          avgTd.dataset.eggStep4 = '1';
          avgTd.style.cursor = 'pointer';
          avgTd.style.userSelect = 'none';
          avgTd.title = '💀 Kattints a mélypontra...';
          avgTd.addEventListener('click', () => tryAdvance(4), { once: false });
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════
       STEP 5 – Radar chart kattintás (Ízvilág)
       STEP 6 – Activity chart kattintás (Idővonal)
  ═══════════════════════════════════════════════ */
  function attachChartListeners() {
    const radar    = document.getElementById('statRadarChart');
    const activity = document.getElementById('statActivityChart');

    if (radar && !radar.dataset.eggBound) {
      radar.dataset.eggBound = '1';
      radar.style.cursor = 'pointer';
      radar.addEventListener('click', () => tryAdvance(5));
    }
    if (activity && !activity.dataset.eggBound) {
      activity.dataset.eggBound = '1';
      activity.style.cursor = 'pointer';
      activity.addEventListener('click', () => tryAdvance(6));
    }
  }

  /* ═══════════════════════════════════════════════
       STEP 7 – Sorsoló pörgetés
  ═══════════════════════════════════════════════ */
  function hookRoulette() {
    if (typeof window.startRoulette !== 'function') return;
    if (window._eggRouletteHooked) return;
    window._eggRouletteHooked = true;

    const original = window.startRoulette;
    window.startRoulette = function (...args) {
      tryAdvance(7);
      return original.apply(this, args);
    };
  }

  /* ═══════════════════════════════════════════════
       STEP 8 – Új Ajánlás modal megnyitása
  ═══════════════════════════════════════════════ */
  function hookRecModal() {
    if (typeof window.openRecModal !== 'function') return;
    if (window._eggRecHooked) return;
    window._eggRecHooked = true;

    const original = window.openRecModal;
    window.openRecModal = function (...args) {
      tryAdvance(8);
      return original.apply(this, args);
    };
  }

  /* ═══════════════════════════════════════════════
       STEP 9 – Dicsőségfal cím kattintás
  ═══════════════════════════════════════════════ */
  function attachHallOfFameListener() {
    const hall = document.querySelector('.hall-header h2');
    if (!hall || hall.dataset.eggBound) return;
    hall.dataset.eggBound = '1';
    hall.style.cursor = 'pointer';
    hall.addEventListener('click', () => tryAdvance(9));
  }

  /* ═══════════════════════════════════════════════
       STEP 10 – Avatar / Iniciálé kattintás (Fiókom tab)
  ═══════════════════════════════════════════════ */
  function injectAvatarIntoAccount() {
    const accountPanel = document.getElementById('user-account-content');
    if (!accountPanel) return;
    if (accountPanel.querySelector('#eggAvatarCard')) return;

    try {
      const userData = JSON.parse(localStorage.getItem('userData'));
      if (!userData) return;

      const name   = userData.name || '?';
      const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
      const email  = userData.email || '';

      const card = document.createElement('div');
      card.id = 'eggAvatarCard';
      card.style.cssText = 'display:flex;align-items:center;gap:18px;background:rgba(255,255,255,0.05);border-radius:16px;padding:20px 25px;margin-bottom:25px;border:1px solid rgba(255,255,255,0.1);';
      card.innerHTML = `
        <div id="eggAvatarBubble" style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#8a73ff,#6c5ce7);display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:#fff;cursor:pointer;flex-shrink:0;box-shadow:0 4px 15px rgba(138,115,255,0.4);transition:transform 0.2s,box-shadow 0.2s;user-select:none;" title="🗝️ Nézz a tükörbe...">
          ${initials}
        </div>
        <div>
          <div style="font-size:1rem;font-weight:600;color:#fff;">${escapeHtmlLocal(name)}</div>
          <div style="font-size:0.82rem;color:#aaa;">${escapeHtmlLocal(email)}</div>
        </div>
      `;

      const bubble = card.querySelector('#eggAvatarBubble');
      bubble.addEventListener('mouseenter', () => {
        bubble.style.transform = 'scale(1.1)';
        bubble.style.boxShadow = '0 6px 25px rgba(138,115,255,0.6)';
      });
      bubble.addEventListener('mouseleave', () => {
        bubble.style.transform = '';
        bubble.style.boxShadow = '0 4px 15px rgba(138,115,255,0.4)';
      });
      bubble.addEventListener('click', () => tryAdvance(10));

      // Első gyerekként szúrjuk be a section-ba
      const firstSection = accountPanel.querySelector('section');
      if (firstSection) {
        const cardHeader = firstSection.querySelector('.card-header');
        if (cardHeader && cardHeader.nextSibling) {
          firstSection.insertBefore(card, cardHeader.nextSibling);
        } else {
          firstSection.prepend(card);
        }
      } else {
        accountPanel.prepend(card);
      }
    } catch (e) {
      console.warn('Pince Titka – avatar inject hiba:', e);
    }
  }

  function escapeHtmlLocal(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ═══════════════════════════════════════════════
       RENDERACHIEVEMENTS HOOK
  ═══════════════════════════════════════════════ */
  function hookRenderAchievements() {
    if (typeof window.renderAchievements !== 'function') return;
    if (window._eggAchHooked) return;
    window._eggAchHooked = true;

    const original = window.renderAchievements;
    window.renderAchievements = function (...args) {
      original.apply(this, args);
      // Kis delay, hogy a grid biztosan ki legyen töltve
      setTimeout(injectSecretCard, 50);
    };
  }

  /* ═══════════════════════════════════════════════
       MEGFIGYELŐK ÉS PERIÓDIKUS ELLENŐRZÉSEK
  ═══════════════════════════════════════════════ */

  // MutationObserver – table-k frissülésére reagál
  const tableObserver = new MutationObserver(() => {
    markSpecialCells();
  });

  function startObservers() {
    const beerBody  = document.getElementById('userBeerTableBody');
    const drinkBody = document.getElementById('userDrinkTableBody');
    if (beerBody)  tableObserver.observe(beerBody,  { childList: true, subtree: true });
    if (drinkBody) tableObserver.observe(drinkBody, { childList: true, subtree: true });
  }

  // Navigáció figyelése (tab váltáskor újra hoookoljuk a dolgokat)
  function onTabSwitch() {
    setTimeout(() => {
      hookRoulette();
      hookRecModal();
      attachChartListeners();
      attachHallOfFameListener();
      injectAvatarIntoAccount();
      markSpecialCells();
    }, 200);
  }

  // Nav item klikk megfigyelés
  function watchNavClicks() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', onTabSwitch);
    });
  }

  /* ═══════════════════════════════════════════════
       INDÍTÁS
  ═══════════════════════════════════════════════ */
  function init() {
    hookRenderAchievements();
    hookRoulette();
    hookRecModal();
    startObservers();
    watchNavClicks();
    attachChartListeners();
    attachHallOfFameListener();
    injectAvatarIntoAccount();
    markSpecialCells();

    // Achievements grid folyamatos figyelése
    const achGrid = document.getElementById('achievementsGrid');
    if (achGrid) {
      new MutationObserver(() => {
        injectSecretCard();
      }).observe(achGrid, { childList: true });
    }

    // Chart-ok utólagos beillesztésének figyelése
    new MutationObserver(() => {
      attachChartListeners();
      attachHallOfFameListener();
      injectAvatarIntoAccount();
    }).observe(document.body, { childList: true, subtree: true });

    console.log('🗝️ Pince Titka – Easter egg aktív. Haladás:', getStep(), '/ 10');
  }

  // DOM kész után indul
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Ha már kész, kis delay hogy a js.js is betöltődjön
    setTimeout(init, 300);
  }

})();
