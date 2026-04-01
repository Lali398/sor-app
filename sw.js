const CACHE_NAME        = 'beer-app-v5';
const API_CACHE_NAME    = 'beer-api-cache-v1';
const SYNC_QUEUE_DB     = 'beer-sync-queue';
const SYNC_TAG          = 'beer-sync-offline';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/js.js',
  '/offline.js',
  '/logo.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/sorkurzor.png'
];

// ─────────────────────────────────────────────
// 1. TELEPÍTÉS – statikus fájlok előzetes cache-elése
// ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Statikus fájlok cache-elése...');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// ─────────────────────────────────────────────
// 2. AKTIVÁLÁS – régi cache-ek törlése
// ─────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map(key => {
            console.log('[SW] Régi cache törölve:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────
// 3. FETCH – kérések kezelése
// ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // ✅ CSAK http/https kéréseket kezelünk
  if (!url.startsWith('http')) return;

  // API hívásokat ne cache-eljük
  if (url.includes('/api/')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    }).catch(() => {
      // Ha offline és nincs cache - csend
      return new Response('Offline', { status: 503 });
    })
  );
});

// ─────────────────────────────────────────────
// STRATÉGIÁK
// ─────────────────────────────────────────────

/** Cache First – statikus assetekhez */
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const networkResponse = await fetch(request);
    // Csak érvényes, saját origin válaszokat mentjük el
    if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Ha egyáltalán nincs válasz és HTML-t kértek, adjuk vissza az index-et
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/index.html');
    }
    return new Response('Offline – fájl nem érhető el', { status: 503 });
  }
}

/** Network First + Cache fallback – API GET kérésekhez */
async function networkFirstWithCache(request) {
  const cache = await caches.open(API_CACHE_NAME);

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.ok) {
      // Sikeres válasz → elmentjük frissítésként
      cache.put(request, networkResponse.clone());
      console.log('[SW] API válasz frissítve a cache-ben:', request.url);
    }

    return networkResponse;
  } catch {
    // Nincs net → visszaadjuk a cached adatot, ha van
    const cached = await cache.match(request);
    if (cached) {
      console.log('[SW] Offline mód: cache-ből töltve:', request.url);
      // Hozzáadunk egy fejlécet, hogy a JS tudja, offline adatot kap
      const offlineResponse = new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          'X-Served-From': 'cache',
          'X-Offline-Mode': 'true'
        }
      });
      return offlineResponse;
    }

    // Nincs cache sem → üres, de érthető hibaválasz (nem fagyunk le)
    return new Response(
      JSON.stringify({ error: 'Offline mód – nincs mentett adat', offline: true }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Mode': 'true'
        }
      }
    );
  }
}

/** Mutáció queue-olással – API POST/PATCH/DELETE kérésekhez */
async function mutationWithQueue(request) {
  try {
    // Megpróbáljuk hálózaton keresztül elküldeni
    const networkResponse = await fetch(request.clone());
    return networkResponse;
  } catch {
    // Nincs net → elmentjük a kérést offline queue-ba
    console.log('[SW] Offline mutáció queue-olva:', request.url, request.method);
    await queueRequest(request);

    // Background Sync regisztrálása (ha a böngésző támogatja)
    if (self.registration.sync) {
      try {
        await self.registration.sync.register(SYNC_TAG);
        console.log('[SW] Background Sync regisztrálva:', SYNC_TAG);
      } catch (e) {
        console.warn('[SW] Background Sync nem támogatott:', e);
      }
    }

    // Visszaadjuk a "queued" választ – a JS ezt kezeli
    return new Response(
      JSON.stringify({
        success: false,
        queued: true,
        offline: true,
        message: 'Offline mód: a módosítás el lett mentve és automatikusan szinkronizálódik, amikor visszatér az internetkapcsolat.'
      }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Mode': 'true',
          'X-Queued': 'true'
        }
      }
    );
  }
}

// ─────────────────────────────────────────────
// INDEXEDDB QUEUE – offline kérések tárolása
// ─────────────────────────────────────────────

function openQueueDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SYNC_QUEUE_DB, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess  = (e) => resolve(e.target.result);
    req.onerror    = (e) => reject(e.target.error);
  });
}

async function queueRequest(request) {
  // A kérés body-ját el kell olvasni (stream, csak egyszer olvasható)
  let bodyText = null;
  try {
    bodyText = await request.clone().text();
  } catch { /* body nélküli kérés */ }

  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    const entry = {
      url:       request.url,
      method:    request.method,
      headers:   Object.fromEntries(request.headers.entries()),
      body:      bodyText,
      timestamp: Date.now()
    };
    const req = store.add(entry);
    req.onsuccess = () => {
      console.log('[SW] Kérés elmentve queue-ba, ID:', req.result);
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getAllQueuedRequests() {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('requests', 'readonly');
    const store = tx.objectStore('requests');
    const req   = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function deleteQueuedRequest(id) {
  const db = await openQueueDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────
// 4. BACKGROUND SYNC – queue feldolgozása online állapotban
// ─────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[SW] Background Sync indítva...');
    event.waitUntil(processQueue());
  }
});

async function processQueue() {
  const queued = await getAllQueuedRequests();
  console.log(`[SW] ${queued.length} db queue-olt kérés feldolgozása...`);

  for (const entry of queued) {
    try {
      const response = await fetch(entry.url, {
        method:  entry.method,
        headers: entry.headers,
        body:    entry.body || undefined
      });

      if (response.ok) {
        await deleteQueuedRequest(entry.id);
        console.log('[SW] Szinkronizált és törölve:', entry.id, entry.url);

        // Értesítjük az összes nyitott klienst
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => client.postMessage({
          type:   'SYNC_SUCCESS',
          method: entry.method,
          url:    entry.url
        }));
      } else {
        console.warn('[SW] Szinkronizálás sikertelen (szerver hiba):', response.status, entry.url);
      }
    } catch (err) {
      console.warn('[SW] Szinkronizálás sikertelen (hálózati hiba):', err, entry.url);
      // Ne töröljük – majd újra próbáljuk legközelebb
    }
  }
}

// ─────────────────────────────────────────────
// 5. ÜZENETEK A KLIENSTŐL (pl. manuális szinkron kérés)
// ─────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'FORCE_SYNC') {
    console.log('[SW] Manuális szinkron kérve...');
    processQueue().then(() => {
      event.source?.postMessage({ type: 'SYNC_COMPLETE' });
    });
  }

  if (event.data?.type === 'GET_QUEUE_COUNT') {
    getAllQueuedRequests().then(items => {
      event.source?.postMessage({ type: 'QUEUE_COUNT', count: items.length });
    });
  }
});
