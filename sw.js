const CACHE_NAME = 'beer-app-v3'; // Frissítettem a verziót
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',    // Ez a legfontosabb a kinézet miatt!
  '/js.js',
  '/logo.png',
  '/manifest.json'
  '/icon-192.png'
  '/icon-512.png'
  '/screenshot-mobile.png'
  '/screenshot-desktop.png'
  '/sorkurzor.png'
  
];

// 1. TELEPÍTÉS
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Stilusok és szkriptek mentése...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. AKTIVÁLÁS
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. LEKÉRÉSEK KEZELÉSE
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // A) API HÍVÁSOK: Ha nincs net, azonnal dobjunk hibát, NE VÁRAKOZZUNK!
  // Ez akadályozza meg a "kifagyást"
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Ha nincs net, egy üres JSON választ küldünk vissza, nem fagyunk le
        return new Response(JSON.stringify({ error: "Offline mód" }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // B) MINDEN MÁS (HTML, CSS, Képek): Cache First stratégia
  // Ha megvan cache-ben, onnan adjuk, ha nincs, letöltjük és elmentjük
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Dinamikus cache-elés (pl. Google Fonts, külső ikonok)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
           const responseToCache = networkResponse.clone();
           caches.open(CACHE_NAME).then((cache) => {
             cache.put(event.request, responseToCache);
           });
        }
        return networkResponse;
      });
    })
  );
});
