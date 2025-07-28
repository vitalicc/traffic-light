
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('traffic-light').then(cache =>
      cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './sw.js',
        './icon-192.png',
        './icon-512.png'
      ])
    )
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});
