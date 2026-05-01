// ══════════════════════════════════════════════
//  HYDROSISTEM — Service Worker (SIMPLES)
// ══════════════════════════════════════════════

const CACHE_SHELL = "hyd-shell-v7";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json"
];

// ── INSTALL ───────────────────────────────────
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE ──────────────────────────────────
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (k !== CACHE_SHELL) return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH ─────────────────────────────────────
self.addEventListener("fetch", function(e) {
  const url = e.request.url;

  // Navegação (HTML)
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Arquivos do próprio site
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
    return;
  }

  // API → só rede
  e.respondWith(fetch(e.request));
});
