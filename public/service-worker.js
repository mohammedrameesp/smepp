// Service Worker - Unregister and clean up all caches
self.addEventListener('install', (event) => {
  console.log('[SW] Uninstalling service worker and clearing all caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] All caches cleared');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating - unregistering service worker');
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[SW] Service worker unregistered');
      return self.clients.claim();
    })
  );
});

// No fetch interception - always use network
self.addEventListener('fetch', (event) => {
  // Do nothing - let all requests go directly to network
  return;
});
