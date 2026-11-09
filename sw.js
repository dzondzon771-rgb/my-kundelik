/* Smart Starosta PWA v6 — network-first app shell so old account prompts stay gone.
 * Old cache versions are removed without clearing the user's localStorage data.
 */
const CACHE = 'smart-starosta-v6-no-account-transfer-prompts';
const SHELL = ['./index.html', './cloud-v6.js', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('smart-starosta-') && k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const critical = request.mode === 'navigate' || /\.(?:html|js)$/.test(url.pathname);
  if (critical) {
    event.respondWith((async () => {
      try {
        // Do not reuse the browser HTTP cache for account/login logic.
        const response = await fetch(new Request(request, {cache: 'no-store'}));
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || (request.mode === 'navigate' && await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
