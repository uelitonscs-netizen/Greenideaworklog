// WorkLog service worker — makes the app open every day, also with weak or no signal.
// - The app page: network first, but if the network takes more than 4 s (one bar at a job site) the saved copy opens
//   at once and the network copy is saved for next time. Any ?helper=… link opens the same saved page.
// - Firebase / map / QR libraries (fixed versions): saved on the first visit, then opened from the phone.
// - Firestore data, sign-in and anything that is not a plain GET: never touched here (the app handles its own offline queue).
// - Only WorkLog's own caches are cleaned: FieldBid / Fazenda live on the same site and keep theirs.
var VERSION = 'wl-v11';
var PAGE = VERSION + '-page', LIBS = 'wl-libs-v1', MINE = /^(wl-|greenidea-)/;
var BASE = '/Greenideaworklog/';
var PAGE_KEY = BASE + 'index.html';
var CORE = [BASE + 'index.html', BASE + 'manifest.json', BASE + 'icon-192.png', BASE + 'icon-512.png'];
var LIB_URLS = [
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];
var LIB_HOSTS = /^https:\/\/(www\.gstatic\.com\/firebasejs\/|cdnjs\.cloudflare\.com\/ajax\/libs\/|fonts\.googleapis\.com\/|fonts\.gstatic\.com\/)/;

self.addEventListener('install', function (e) {
  e.waitUntil(Promise.all([
    caches.open(PAGE).then(function (c) {
      return Promise.all(CORE.map(function (u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (r.ok) return c.put(u, r); }).catch(function () {}); }));
    }),
    caches.open(LIBS).then(function (c) {
      return Promise.all(LIB_URLS.map(function (u) {
        return c.match(u).then(function (hit) { if (hit) return; return fetch(u, { mode: 'no-cors' }).then(function (r) { return c.put(u, r); }).catch(function () {}); });
      }));
    })
  ]));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (names) {
    return Promise.all(names.filter(function (n) { return MINE.test(n) && n !== PAGE && n !== LIBS; }).map(function (n) { return caches.delete(n); }));
  }).then(function () { return self.clients.claim(); }));
});

function isAppPage(url) {
  return url.origin === self.location.origin && (url.pathname === BASE || url.pathname === BASE + 'index.html');
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/fieldbid/') !== -1) return;   // FieldBid has its own service worker

  // The app page (any ?helper=… / ?action=… address): network first, saved copy after 4 s or offline
  if (req.mode === 'navigate' && isAppPage(url)) {
    var net = fetch(req).then(function (r) {
      if (r && r.ok) { var cp = r.clone(); caches.open(PAGE).then(function (c) { c.put(PAGE_KEY, cp); }); }
      return r;
    });
    e.waitUntil(net.catch(function () {}));
    e.respondWith(new Promise(function (resolve) {
      var done = false;
      function fromCache() {
        caches.open(PAGE).then(function (c) { return c.match(PAGE_KEY); }).then(function (hit) {
          if (done) return;
          if (hit) { done = true; resolve(hit); }
        });
      }
      var t = setTimeout(fromCache, 4000);
      net.then(function (r) { if (done) return; done = true; clearTimeout(t); resolve(r); })
        .catch(function () {
          clearTimeout(t);
          caches.open(PAGE).then(function (c) { return c.match(PAGE_KEY); }).then(function (hit) {
            if (done) return; done = true;
            resolve(hit || new Response('<h3 style="font-family:sans-serif;padding:30px">WorkLog: no internet. Connect and try again.</h3>', { headers: { 'Content-Type': 'text/html' } }));
          });
        });
    }));
    return;
  }

  // Libraries and fonts (fixed versions): saved copy first, network fills it
  if (LIB_HOSTS.test(req.url)) {
    e.respondWith(caches.open(LIBS).then(function (c) {
      return c.match(req.url).then(function (hit) {
        var go = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req.url, r.clone()); return r; });
        if (hit) { e.waitUntil(go.catch(function () {})); return hit; }
        return go;
      });
    }));
    return;
  }

  // Other WorkLog files (icons, manifest, other pages): network, saved copy when offline
  if (url.origin === self.location.origin && url.pathname.indexOf(BASE) === 0) {
    e.respondWith(fetch(req).then(function (r) {
      if (r && r.ok && CORE.indexOf(url.pathname) >= 0) { var cp = r.clone(); caches.open(PAGE).then(function (c) { c.put(url.pathname, cp); }); }
      return r;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || Response.error(); });
    }));
  }
  // Everything else (Firestore, sign-in, other sites): not touched
});
