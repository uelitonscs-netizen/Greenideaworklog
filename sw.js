const CACHE_NAME = 'greenidea-v10';
const urlsToCache = [
  '/Greenideaworklog/',
  '/Greenideaworklog/index.html'
];
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(names.filter(function(n) {
        return n !== CACHE_NAME;
      }).map(function(n) { return caches.delete(n); }));
    })
  );
  self.clients.claim();
});
self.addEventListener('fetch', function(e) {
  // Never intercept FieldBid requests - let its own SW handle them
  if (e.request.url.indexOf('/fieldbid/') !== -1) {
    return;
  }
  e.respondWith(
    fetch(e.request).catch(function() {
      return caches.match(e.request);
    })
  );
});
