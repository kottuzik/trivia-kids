// Trivia Kids service worker (ADR-12). Caches static files only: build output, fonts and icons.
// Pages, API answers and reports are never stored, so a new question always needs the network.
const CACHE = "trivia-kids-static-v1";

const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/icons/maskable-512.png", "/apple-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/apple-icon.png" ||
    url.pathname === "/favicon.ico"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isStaticAsset(url)) return;

  // Cache-first: these files never change under the same name (Next.js hashes build files).
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === "basic") void cache.put(request, response.clone());
      return response;
    }),
  );
});
