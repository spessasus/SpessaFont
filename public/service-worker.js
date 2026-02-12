const CACHE_NAME = "spessafont-cache";

/**
 * JSDoc so tsc is happy
 * @type {ServiceWorkerGlobalScope}
 */
const service = /** @type {ServiceWorkerGlobalScope} */ self;

// Install and activate
service.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(["/"]))
    );
    void service.skipWaiting();
});

// Clean up old cache
service.addEventListener("activate", async (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            )
        )
    );
    await service.clients.claim();
});

service.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    if (
        url.origin !== self.location.origin ||
        url.protocol !== self.location.protocol
    ) {
        return;
    }

    event.respondWith(tryCacheRequest(event.request));
});

/**
 * @param request {Request}
 * @return {Promise<Response|*>}
 */
async function tryCacheRequest(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        // Try network first
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
            await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // No network, try cache
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        return new Response("503", {
            status: 503,
            statusText: "Service Unavailable"
        });
    }
}
