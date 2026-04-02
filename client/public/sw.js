const CACHE_NAME = 'fidanx-v2';
const STATIC_CACHE = 'fidanx-static-v2';
const API_CACHE = 'fidanx-api-v1';

const STATIC_ASSETS = [
    '/',
    '/uretim',
    '/satislar',
    '/scanner',
    '/operasyon',
    '/receteler',
    '/stoklar',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME && k !== STATIC_CACHE && k !== API_CACHE)
                    .map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method === 'POST') {
        if (url.pathname.includes('/api/') && url.pathname.includes('offline-queue')) {
            return;
        }
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    if (response.ok && event.request.method === 'GET') {
                        const clone = response.clone();
                        caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('/')))
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return fetch(event.request).then((response) => {
                if (response.ok && url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, clone));
                }
                return response;
            }).catch(() => new Response('Offline', { status: 503 }));
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
