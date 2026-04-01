// ============================================================
// offline.js – Offline állapot kezelő és UI visszajelzések
// Ezt a fájlt az index.html-be kell beilleszteni a js.js ELŐTT:
//   <script src="offline.js"></script>
// ============================================================

(function () {
  'use strict';

  // ─── Offline banner injektálása ───────────────────────────
  const BANNER_ID = 'offlineBanner';
  const BADGE_ID  = 'offlineQueueBadge';

  function injectBanner() {
    if (document.getElementById(BANNER_ID)) return;

    const banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.innerHTML = `
      <span>📡 Offline mód</span>
      <span id="${BADGE_ID}" style="display:none;" title="Queue-olt módosítások száma"></span>
      <button onclick="window.__offlineSync()" title="Szinkronizálás most">🔄 Szinkronizálás</button>
    `;
    banner.style.cssText = `
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      color: #fff;
      font-family: 'Poppins', sans-serif;
      font-size: 14px;
      font-weight: 500;
      padding: 10px 18px;
      display: none;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border-top: 2px solid #8a73ff;
      box-shadow: 0 -4px 20px rgba(138,115,255,0.3);
      animation: slideUp 0.4s ease;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(100%); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      #${BANNER_ID} button {
        background: rgba(138,115,255,0.25);
        border: 1px solid #8a73ff;
        color: #fff;
        padding: 4px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 13px;
        transition: background 0.2s;
      }
      #${BANNER_ID} button:hover {
        background: rgba(138,115,255,0.5);
      }
      #${BADGE_ID} {
        background: #e74c3c;
        border-radius: 50%;
        width: 22px;
        height: 22px;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
      }
      body.offline-mode {
        padding-bottom: 48px;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(banner);
  }

  function showBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) {
      banner.style.display = 'flex';
      document.body.classList.add('offline-mode');
    }
  }

  function hideBanner() {
    const banner = document.getElementById(BANNER_ID);
    if (banner) {
      banner.style.display = 'none';
      document.body.classList.remove('offline-mode');
    }
  }

  function updateBadge(count) {
    const badge = document.getElementById(BADGE_ID);
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-flex';
      badge.title = `${count} db mentett módosítás szinkronizálásra vár`;
    } else {
      badge.style.display = 'none';
    }
  }

  // ─── Queue számának lekérése a SW-tól ────────────────────
  function refreshQueueCount() {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_QUEUE_COUNT' });
    }
  }

  // ─── Manuális szinkronizálás ──────────────────────────────
  window.__offlineSync = function () {
    if (!navigator.onLine) {
      showToast('⚠️ Még mindig offline – a szinkronizálás megvárja az internetkapcsolatot.');
      return;
    }
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' });
      showToast('🔄 Szinkronizálás folyamatban...');
    }
  };

  // ─── Toast helper (ha az app saját showSuccess/showError nincs még kész) ──
  function showToast(msg) {
    // Megpróbáljuk az alkalmazás saját toastját használni
    if (typeof window.showSuccess === 'function' && msg.startsWith('✅')) {
      window.showSuccess(msg.slice(2).trim());
      return;
    }
    if (typeof window.showError === 'function' && msg.startsWith('⚠️')) {
      window.showError(msg.slice(3).trim());
      return;
    }
    // Fallback: egyszerű toast
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #333; color: #fff; padding: 12px 20px; border-radius: 10px;
      z-index: 100000; font-family: 'Poppins', sans-serif; font-size: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4); max-width: 90vw; text-align: center;
    `;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ─── Online / Offline eseménykezelők ─────────────────────
  function handleOffline() {
    console.log('[Offline.js] Offline állapot detektálva');
    showBanner();
    refreshQueueCount();
    showToast('📡 Nincs internetkapcsolat – az app offline módban működik, az adatok cache-ből töltődnek.');
  }

  function handleOnline() {
    console.log('[Offline.js] Online állapot visszaállt');
    hideBanner();
    showToast('✅ Internetkapcsolat helyreállt! Szinkronizálás folyamatban...');

    // Automatikus szinkronizálás, ha vannak queue-olt kérések
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' });
    }
  }

  window.addEventListener('offline', handleOffline);
  window.addEventListener('online',  handleOnline);

  // ─── SW üzenetek fogadása ────────────────────────────────
  navigator.serviceWorker?.addEventListener('message', (event) => {
    const { type, count } = event.data || {};

    if (type === 'QUEUE_COUNT') {
      updateBadge(count);
    }

    if (type === 'SYNC_SUCCESS') {
      showToast('✅ Szinkronizálás sikeres – adatok elküldve!');
      refreshQueueCount(); // Frissítjük a badge-et
    }

    if (type === 'SYNC_COMPLETE') {
      showToast('✅ Szinkronizálás befejezve!');
      updateBadge(0);
      // Adatok újra betöltése, ha az alkalmazás ezt támogatja
      if (typeof window.loadAllData === 'function')       window.loadAllData();
      if (typeof window.loadBeers === 'function')         window.loadBeers();
      if (typeof window.loadInitialData === 'function')   window.loadInitialData();
    }
  });

  // ─── Inicializálás DOM betöltés után ─────────────────────
  function init() {
    injectBanner();

    // Ha már offline vagyunk indításkor
    if (!navigator.onLine) {
      showBanner();
    }

    // Queue count lekérése indításkor
    refreshQueueCount();

    // Service Worker frissítések kezelése
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[Offline.js] Service Worker frissítve – oldal újratöltése...');
        // Csak akkor töltjük újra, ha a felhasználó nem gépel
        if (document.activeElement?.tagName !== 'INPUT' &&
            document.activeElement?.tagName !== 'TEXTAREA') {
          window.location.reload();
        }
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();