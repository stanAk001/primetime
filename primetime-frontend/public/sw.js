/*
 * Primetime service worker.
 *
 * Written by hand rather than generated: the app needs exactly two caching
 * behaviours and a build plugin would add a dependency and a lot of config
 * for that.
 *
 *   1. The app shell and hashed build assets — cache-first. They are
 *      immutable, so once seen they never need the network again.
 *   2. The menu — network-first, falling back to the last copy. A guest at a
 *      table with no signal still gets the list they were reading, which is
 *      the whole point.
 *
 * Nothing else is cached. Orders, waiter calls and anything authenticated go
 * straight to the network every time; a stale order would be worse than no
 * order, and the offline queue in the app handles delivery.
 */
const VERSION = 'v1';
const SHELL_CACHE = `primetime-shell-${VERSION}`;
const DATA_CACHE = `primetime-data-${VERSION}`;

self.addEventListener('install', (event) => {
  // Take over as soon as possible; there is no old client state to protect.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('primetime-') && !k.endsWith(VERSION))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

const isMenuRequest = (url) =>
  url.pathname.includes('/facilities/') && url.pathname.endsWith('/menu');

const isShellAsset = (url, request) =>
  request.destination === 'script' ||
  request.destination === 'style' ||
  request.destination === 'font' ||
  url.pathname === '/' ||
  url.pathname.startsWith('/assets/');

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // The menu: fresh when possible, last-known-good when not.
  if (isMenuRequest(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          // Let the app show its own error state rather than a browser page.
          return new Response(
            JSON.stringify({ menu: [], offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          );
        }
      })()
    );
    return;
  }

  // Build output is content-hashed, so a hit is always correct.
  if (url.origin === self.location.origin && isShellAsset(url, request)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          // A navigation with nothing cached: fall back to the app shell so
          // the SPA can boot and show its offline state.
          if (request.mode === 'navigate') {
            const shell = await cache.match('/');
            if (shell) return shell;
          }
          throw new Error('offline and uncached');
        }
      })()
    );
  }
});
