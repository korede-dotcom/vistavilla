'use strict';
const CACHE = 'vistavilla-public-v13';
// Only static, public files belong in offline storage.
const FILES = ['/css/app-tools.css?v=1', '/js/app-tools.js?v=1', '/offline.html', '/css/theme.css?v=5', '/css/pwa.css?v=2', '/js/theme.js?v=1', '/js/pwa.js?v=4', '/images/vistavilla-app-180.png', '/images/vistavilla-app-192.png', '/images/vistavilla-app-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vistavilla-public-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (FILES.includes(url.pathname + url.search)) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(() => caches.match(event.request)));
  } else if (event.request.mode === 'navigate') {
    // Entire app, including the portal: always fetch live, never cache HTML.
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
