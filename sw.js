const CACHE_NAME = 'beer-app-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/js.js',
  '/logo.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js'
];

// 1. Telepítés: Fájlok cache-elése
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Fájlok cache-elése...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. Aktiválás: Régi cache törlése (ha frissíted a verziót)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. Lekérések elfogása (Fetch)
self.addEventListener('fetch', (event) => {
  // Ha API hívás (pl. mentés), azt NE cache-eld, engedd át a hálózaton
  if (event.request.url.includes('/api/')) {
    return; 
  }

  // Minden más (HTML, CSS, Képek) jöjjön cache-ből, ha nincs net
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});