var CACHE = 'fieldbid-v2';
var URLS = [
  '/Greenideaworklog/fieldbid/',
  '/Greenideaworklog/fieldbid/index.html',
  '/Greenideaworklog/fieldbid/manifest.json',
  '/Greenideaworklog/fieldbid/icon-192.png',
  '/Greenideaworklog/fieldbid/icon-512.png'
];
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(URLS); }));
});
self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);}));
  }));
});
self.addEventListener('fetch', function(e) {
  e.respondWith(caches.match(e.request).then(function(r) { return r || fetch(e.request); }));
});
