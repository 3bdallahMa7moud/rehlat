/* Journey of Change — deliberately small, same-origin PWA shell. */
const CACHE_VERSION = "journey-of-change-v2";
const OFFLINE_URL = "/offline.html";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/brand/journey-mark.png",
  "/brand/journey-logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

function isCacheableAsset(url) {
  return url.origin === self.location.origin
    && (url.pathname.startsWith("/brand/") || url.pathname.startsWith("/images/"));
}

async function navigationRequest(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match(OFFLINE_URL);
    return fallback || Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_VERSION);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Next.js chunks must always be handled by the browser/network. Caching them
  // here can mix runtime and module versions after a deployment or dev rebuild.
  if (url.pathname.startsWith("/_next/")) return;
  if (request.mode === "navigate") {
    event.respondWith(navigationRequest(request));
    return;
  }
  if (isCacheableAsset(url)) event.respondWith(cacheFirst(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
