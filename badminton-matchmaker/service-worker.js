const CACHE_NAME = 'bbmm-shell-v1';
const APP_SHELL = [
  'index.html',
  'app.js',
  'styles.css',
  'manifest.json',
  'icons/icon-192.svg',
  'icons/icon-512.svg'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); return null; }))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (ev) => {
  // Network-first for navigation requests, cache-first for others
  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(ev.request, copy));
        return res;
      }).catch(() => caches.match('index.html')),
    );
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then((cached) => cached || fetch(ev.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(ev.request, copy));
      return res;
    })).catch(() => {
      // fallback if needed
      return cached;
    })),
  );
});
