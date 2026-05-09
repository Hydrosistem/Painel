// ═══════════════════════════════════════
//  HYDROSISTEM SW — AUTO UPDATE
// ═══════════════════════════════════════
const CACHE = "hyd-v111"; // ← sobe a versão também
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

  // Requisições de API (Google Apps Script) — sempre rede, sem cache
  if (url.hostname.includes("script.google.com") ||
      url.hostname.includes("googleapis.com")) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Navegação e HTML — Network First (sempre tenta buscar versão nova)
  if (e.request.mode === "navigate" ||
      url.pathname.endsWith(".html") ||
      url.pathname === "/" ) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Atualiza o cache com a versão nova
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Ícones e assets estáticos — Cache First (ok, mudam raramente)
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
