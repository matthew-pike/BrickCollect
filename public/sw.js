/* BrickCollect offline helper.
   - Pages, scripts and data: always fetched fresh from the network first (so new releases show straight away);
     the last good copy is kept and used only when there's no connection.
   - Sign-in, the database and Sync Prices are never cached (Firebase keeps its own offline copy of your collection). */
const VERSION = 'v1';
const PAGES = `bc-pages-${VERSION}`;
const SHELL = ['/', '/config.js', '/backend-firebase.js', '/analytics.js', '/pwa.js', '/catalog.json', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(PAGES).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('bc-') && k !== PAGES).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const isLib = u => u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/') || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';

// Fresh from the network; the saved copy only when offline. `fallback` is used when nothing is saved for this address.
// `opaqueOk` lets the few library files from Google (loaded without CORS) be kept too.
async function networkFirst(req, { key, fallback, opaqueOk } = {}) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok || (opaqueOk && res.type === 'opaque')) cache.put(key || req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(key || req, { ignoreSearch: true }) || (fallback && await cache.match(fallback));
    if (hit) return hit;
    throw err;
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === self.location.origin) {
    if (u.pathname.startsWith('/api/') || u.pathname.startsWith('/__/')) return; // Sync Prices and Firebase sign-in helpers
    if (req.mode === 'navigate') { e.respondWith(networkFirst(req, { key: u.pathname, fallback: '/' })); return; }
    e.respondWith(networkFirst(req));
    return;
  }
  if (isLib(u)) { e.respondWith(networkFirst(req, { opaqueOk: true })); return; }
  // Everything else (set pictures, Google sign-in, Firestore, Analytics, shops) goes straight to the network.
});
