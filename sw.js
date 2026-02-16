const CACHE_NAME = 'beer-app-v2'; // Verziószám növelve

// Csak a KRITIKUS, SAJÁT fájlokat tesszük a telepítési listába.
// A külső linkeket (CDN, Google Fonts) kivettük innen, azokat röptében cache-eljük majd.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js.js',
  '/logo.png',
  '/manifest.json'
];

// 1. Telepítés: Csak a biztosan létező helyi fájlok cache-elése
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Azonnal aktiválódjon az új SW
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Kritikus fájlok cache-elése...');
      return cache.addAll(STATIC_ASSETS);
    }).catch((err) => {
        console.error('SW: Hiba a telepítésnél:', err);
    })
  );
});

// 2. Aktiválás: Régi cache törlése
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim()) // Azonnal átveszi az irányítást
  );
});

// 3. Lekérések kezelése (Network First stratégia HTML-re, Cache First a többire)
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // API hívásokat soha ne cache-eljünk
  if (requestUrl.pathname.includes('/api/')) {
    return;
  }

  // Ha az oldal navigációjáról van szó (HTML), próbáljuk meg a hálózatot, ha nincs, jöjjön a cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Minden más fájl (CSS, JS, Képek, Fontok, CDN-ek)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. Ha megvan cache-ben, visszaadjuk azt
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. Ha nincs, letöltjük a netről
      return fetch(event.request).then((networkResponse) => {
        // Ellenőrizzük, hogy érvényes-e a válasz
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors' && networkResponse.type !== 'opaque') {
          return networkResponse;
        }

        // 3. Ha sikeres a letöltés, elmentjük a cache-be a következő alkalomra (Dinamikus Caching)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Ha nincs net és nincs cache-ben sem (pl. egy kép), itt lehetne placeholder képet visszaadni
        console.log('Nincs hálózat és nincs cache:', event.request.url);
      });
    })
  );
});
