/*
This is a very slightly modified version of Ethan Marcotte's service worker (https://ethanmarcotte.com/theworkerofservices.js),
which is itself based off of Jeremy Keith's service worker (https://adactio.com/serviceworker.js)
with a few additional edits borrowed from Filament Group's. (https://www.filamentgroup.com/sw.js)

Thanks to Ethan and Jeremy and Filament Group for this

https://ethanmarcotte.com
https://adactio.com/about/
https://www.filamentgroup.com/
*/

(function() {
  'use strict';

  const version = '<%= ENV['HEROKU_RELEASE_VERSION'] || 'v1' %>';
  const cacheName = version + '/acadia/sw/';

  const staticCacheName = cacheName + 'static';
  const pagesCacheName = cacheName + 'pages';
  const imagesCacheName = cacheName + 'images';

  const offlinePages = [
    '/offline.html'
  ];

  const staticAssets = [
  ];

  function updateStaticCache() {
    // These items won't block the installation of the Service Worker
    caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(offlinePages.map(url => new Request(url, { credentials: 'include' })));
    });

    // These items must be cached for the Service Worker to complete installation
    return caches.open(staticCacheName)
    .then(cache => {
      return cache.addAll(staticAssets.map(url => new Request(url, { credentials: 'include' })));
    });
  }

  function stashInCache(cacheName, request, response) {
    caches.open(cacheName)
    .then(cache => cache.put(request, response));
  }

  // Limit the number of items in a specified cache.
  function trimCache(cacheName, maxItems) {
    caches.open(cacheName)
    .then(cache => {
      cache.keys()
      .then(keys => {
        if (keys.length > maxItems) {
          cache.delete(keys[ 0 ])
          .then(trimCache(cacheName, maxItems));
        }
      });
    });
  }

  // Remove caches whose name is no longer valid
  function clearOldCaches() {
    return caches.keys()
    .then(keys => {
      return Promise.all(keys
        .filter(key => key.indexOf(version) !== 0)
        .map(key => caches.delete(key))
      );
    });
  }

  // Events!
  self.addEventListener('message', event => {
    if (event.data.command == 'trimCaches') {
      trimCache(pagesCacheName, 35);
      trimCache(imagesCacheName, 20);
    }
  });

  self.addEventListener('install', event => {
      event.waitUntil(updateStaticCache()
      .then(() => self.skipWaiting())
    );
  });

  self.addEventListener('activate', event => {
    event.waitUntil(clearOldCaches()
      .then(() => self.clients.claim())
    );
  });

  self.addEventListener('message', event => {
    if (event.data.command == 'trimCaches') {
      trimCache(pagesCacheName, 35);
      trimCache(imagesCacheName, 20);
    }
  });

  self.addEventListener('fetch', event => {
    let request = event.request;
    let url = new URL(request.url);

    // Ignore non-GET requests
    if (request.method !== 'GET') {
      return;
    }

    // For HTML requests, try the network first, or go straight to the offline page
    if (request.headers.get('Accept').indexOf('text/html') !== -1) {
      event.respondWith(
        fetch(request)
        .then(response => {
          // NETWORK
          return response;
        } )
        .catch(() => {
          // FALLBACK
          return caches.match('/offline.html')
        })
      );
      return;
    }

    // For non-HTML requests, look in the cache first, fall back to the network
    event.respondWith(
      caches.match(request)
      .then(response => {
        // CACHE
        return response || fetch(request)
        .then(response => {
          // NETWORK
          // If the request is for an image, stash a copy of this image in the images cache
          if (request.headers.get('Accept').indexOf('image') !== -1 ) {
            let copy = response.clone();
            stashInCache(imagesCacheName, request, copy);
          }
          return response;
        })
        .catch(() => {
          // OFFLINE
          // If the request is for an image, show an offline placeholder
          if (request.headers.get('Accept').indexOf('image') !== -1) {
            return new Response('<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><title>Offline</title><path d="M55.14 52.86l-2.28 2.28c-.2.2-.52.2-.72 0L50 53l-2.14 2.14c-.2.2-.52.2-.72 0l-2.28-2.28c-.2-.2-.2-.52 0-.72L47 50l-2.14-2.14c-.2-.2-.2-.52 0-.72l2.28-2.28c.2-.2.52-.2.72 0L50 47l2.14-2.14c.2-.2.52-.2.72 0l2.28 2.28c.2.2.2.52 0 .72L53 50l2.14 2.14c.2.2.2.52 0 .72zM58.5 50c0-4.7-3.8-8.5-8.5-8.5s-8.5 3.8-8.5 8.5 3.8 8.5 8.5 8.5 8.5-3.8 8.5-8.5zm3.5 0c0 6.63-5.38 12-12 12-6.63 0-12-5.38-12-12 0-6.63 5.38-12 12-12 6.63 0 12 5.38 12 12z" fill="#CCC"/></svg>', { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' } });
          }
        });
      })
    );
  });
})();
