// ══════════════════════════════════════════════
//  HYDROSISTEM — Service Worker v1.0
//  • Shell (HTML/manifest) → Cache First
//  • API Apps Script       → Network First + fallback cache
//  • Imagens Google Drive  → Stale-While-Revalidate
//  • Fontes Google         → Cache First
// ══════════════════════════════════════════════

const CACHE_SHELL  = "hyd-shell-v4";
const CACHE_IMG    = "hyd-images-v1";
const CACHE_API    = "hyd-api-v1";

const SHELL_FILES  = [
  "./",
  "./index.html",
  "./manifest.json"
];

// ── INSTALL ───────────────────────────────────
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE_SHELL)
      .then(function(cache) { return cache.addAll(SHELL_FILES); })
      .then(function() { return self.skipWaiting(); })
  );
});

// ── ACTIVATE ──────────────────────────────────
self.addEventListener("activate", function(e) {
  var keep = [CACHE_SHELL, CACHE_IMG, CACHE_API];
  e.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys.filter(function(k) { return !keep.includes(k); })
              .map(function(k)   { return caches.delete(k);   })
        );
      })
      .then(function() { return self.clients.claim(); })
  );
});

// ── FETCH ─────────────────────────────────────
self.addEventListener("fetch", function(e) {
  var url = e.request.url;

  // Apps Script → Network First
  if (url.includes("script.google.com")) {
    e.respondWith(networkFirst(e.request, CACHE_API));
    return;
  }

  // Google Drive / fotos → Stale-While-Revalidate
  if (url.includes("drive.google.com") || url.includes("lh3.googleusercontent.com")) {
    e.respondWith(staleWhileRevalidate(e.request, CACHE_IMG));
    return;
  }

  // Fontes Google → Cache First
  if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
    e.respondWith(cacheFirst(e.request, CACHE_SHELL));
    return;
  }

  // Shell / navegação → Cache First
  if (e.request.mode === "navigate" || url.startsWith(self.location.origin)) {
    e.respondWith(cacheFirst(e.request, CACHE_SHELL));
    return;
  }

  // Demais → apenas rede
  e.respondWith(fetch(e.request));
});

// ── ESTRATÉGIAS ───────────────────────────────

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const res = await fetch(req);

    if (res && res.status === 200) {
      cache.put(req, res.clone()); // ✔ clone correto
    }

    return res;

  } catch (err) {
    const cached = await cache.match(req);
    if (cached) return cached;

    return new Response(
      JSON.stringify([]),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  if (cached) return cached;

  try {
    const res = await fetch(req);

    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }

    return res;

  } catch (err) {
    if (req.mode === "navigate") {
      return cache.match("./index.html");
    }
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req).then(res => {
    if (res && res.status === 200) {
      cache.put(req, res.clone());
    }
    return res;
  });

  return cached || fetchPromise;
}
