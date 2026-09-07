const CACHE_NAME = 'amanah-id-shell-v1';
const SHELL = [
    './',
    './index.html',
    './User/dashboard.html',
    './app.js',
    './style.css',
    './manifest.json'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(SHELL);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(key) {
                return key === CACHE_NAME ? Promise.resolve() : caches.delete(key);
            }));
        }).then(function() {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            return cached || fetch(event.request).then(function(response) {
                var copy = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    return cache.put(event.request, copy);
                }).catch(function(error) {
                    console.warn('[Amanah PWA] Gagal menyimpan cache:', error);
                });
                return response;
            });
        })
    );
});
