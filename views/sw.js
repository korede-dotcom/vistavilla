'use strict';
const CACHE = 'vistavilla-public-v8';
const FILES = ['/offline.html', '/css/theme.css?v=5', '/js/theme.js?v=1', '/js/pwa.js', '/images/pwa-192.png', '/images/pwa-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('vistavilla-public-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only public landing assets are stored. Never store HTML, APIs or sessions.
  if (FILES.includes(url.pathname + url.search)) {
    event.respondWith(fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
      }
      return response;
    }).catch(() => caches.match(event.request)));
  } else if (event.request.mode === 'navigate' && ['/', '/rooms', '/gallery', '/page-contact', '/terms-and-conditions'].includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  }
});
