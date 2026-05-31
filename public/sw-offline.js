/* Ditax Offline Service Worker
 * Scope: Despia native WebView running against http://localhost only.
 * Strategy:
 *   - CacheFirst for hashed static assets (/assets/*), OCR worker bundle,
 *     logos and a small allowlist of static files.
 *   - NetworkOnly for everything dynamic: Supabase REST/Realtime, Edge
 *     Functions, Despia manifest, HTML navigations.
 *   - No HTML navigation cache → OTA updates land instantly.
 */

const VERSION = 'ditax-offline-v1';
const STATIC_CACHE = `${VERSION}-static`;

const STATIC_ALLOW_PATTERNS = [
  /^\/assets\//,
  /^\/ocr\//,
  /^\/ditax-logo/,
  /^\/favicon\.ico$/,
  /^\/bot-avatar\.webp$/,
  /^\/admin-profile-avatar\.png$/,
  /^\/sphere-animation\.(mp4|webp)$/,
  /^\/placeholder\.svg$/,
];

const NETWORK_ONLY_HOST_PATTERNS = [
  /\.supabase\.co$/,
  /\.supabase\.in$/,
];

const NETWORK_ONLY_PATH_PATTERNS = [
  /^\/functions\/v1\//,
  /^\/despia\//,
  /^\/auth\//,
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((n) => n.startsWith('ditax-offline-') && !n.startsWith(VERSION))
        .map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil((async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    })());
  }
});

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  return STATIC_ALLOW_PATTERNS.some((re) => re.test(url.pathname));
}

function isNetworkOnly(url) {
  if (NETWORK_ONLY_HOST_PATTERNS.some((re) => re.test(url.hostname))) return true;
  if (url.origin === self.location.origin) {
    return NETWORK_ONLY_PATH_PATTERNS.some((re) => re.test(url.pathname));
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Never cache navigations — let OTA / local server own HTML.
  if (req.mode === 'navigate') return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  if (isNetworkOnly(url)) return;
  if (!isStaticAsset(url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    if (cached) {
      // Refresh in background.
      event.waitUntil((async () => {
        try {
          const fresh = await fetch(req);
          if (fresh && fresh.ok) await cache.put(req, fresh.clone());
        } catch { /* offline – keep cached */ }
      })());
      return cached;
    }
    try {
      const fresh = await fetch(req);
      if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch (err) {
      return cached || Response.error();
    }
  })());
});
