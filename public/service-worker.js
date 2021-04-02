// The Service Worker API enables the creation of effective offline experiences, intercepts network requests and take appropriate action based on whether the network is available, and update assets residing on the server

const FILES_TO_CACHE = [
    "/",
    "/index.html",
    "/index.js",
    "/manifest.webmanifest",
    "/styles.css",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png"
];

const CACHE_NAME = "static-cache-v2";
const DATA_CACHE_NAME = "data-cache-v1";

// Service Worker lifecycle has 3 phases: Download, Install, and Activate

// Installation is attempted when the downloaded file is found to be new - either different to an existing service worker, or the first service worker encountered for the page/site
self.addEventListener("install", function(evt) {
    // Because install/activate events could take a while to complete, the service worker spec provides a waitUntil() method
    evt.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log("Your files have been pre-cached successfully!");
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
})

// The new service worker is only activated when there are no longer any pages loaded that are still using the old service worker. As soon as there are no more pages to be loaded, the new service worker activates (becoming the active worker)
self.addEventListener("activate", function (evt) {
    evt.waitUntil(
        caches.keys().then(keyList => {
            return Promise.all(
                keyList.map(key => {
                    if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                        console.log("Removing old cache data", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Enable the service worker to intercept network requests
self.addEventListener("fetch", function (evt) {
    // Cache successful requests to the API
    if(evt.request.url.includes("/api/transaction")) {
        console.log("[Service Worker] Fetch (data)", evt.request.url);
        evt.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(evt.request)
                    .then(response => {
                        // If response was good, clone it and store it in cache
                        if (response.status === 200) {
                            cache.put(evt.request.url, response.clone());
                        }
                        return response;
                    })
                    .catch(err => {
                        // Network request failed, try to get it from the cache
                        return cache.match(evt.request);
                    });
            })
        );
        return;
    }

    // This code allows the page to be accessible offline. If the request is not for the API, serve static assets using "offline-first" approach. 
    evt.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(evt.request).then(response => {
                return response || fetch(evt.request);
            });
        })
    )
})