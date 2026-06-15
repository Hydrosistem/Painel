// ═══════════════════════════════════════
//  HYDROSISTEM SW — AUTO UPDATE
// ═══════════════════════════════════════
const CACHE = "hyd-v1.3.7";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-96.png"
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE && caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Requisições externas — NÃO intercepta, deixa o browser resolver
  if (url.hostname.includes("script.google.com") ||
      url.hostname.includes("googleapis.com") ||
      url.hostname.includes("lh3.googleusercontent.com") ||
      url.hostname.includes("drive.google.com") ||
      url.hostname.includes("fonts.googleapis.com") ||
      url.hostname.includes("fonts.gstatic.com")) {
    return; // ← não chama e.respondWith(), browser trata normalmente
  }

  // Navegação e HTML — Network First
  if (e.request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname === "/") {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Assets estáticos — Cache First
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
