// WorkLog SW v4 - GitHub Pages
const CACHE = 'worklog-v4';
const ASSETS = [
  '/Greenideaworklog/',
  '/Greenideaworklog/index.html',
  '/Greenideaworklog/manifest.json',
  '/Greenideaworklog/icon-192.png',
  '/Greenideaworklog/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate' ||
      e.request.url.endsWith('.html') ||
      e.request.url.endsWith('/')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
