const CACHE_NAME = 'debtlens-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './rates.json',
  './manifest.json'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: GETのみキャッシュ対象（POST等は素通り）
self.addEventListener('fetch', event => {
  // GET以外はそのまま通す
  if (event.request.method !== 'GET') return;

  // chrome-extension等のスキームは無視
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 正常レスポンスのみキャッシュ
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
