// Every release registers the worker with its version, so each gets its own cache
const VERSION =
    new URL(self.location.href).searchParams.get("version") ?? "dev";
const CACHE_NAME = `spessafont-${VERSION}`;
// A tab that stayed open since the last release still loads its old files
const KEPT_OLD_CACHES = 1;

/**
 * JSDoc so tsc is happy
 * @type {ServiceWorkerGlobalScope}
 */
const service = /** @type {ServiceWorkerGlobalScope} */ self;

// Relative, so they resolve inside the app's folder (GitHub Pages serves it from a subfolder)
const PRECACHED = [
    "./",
    "index.html",
    "manifest.webmanifest"
];

service.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHED))
    );
    void service.skipWaiting();
});

service.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // caches.keys() lists caches in the order they were created
            const old = (await caches.keys()).filter(
                (key) => key.startsWith("spessafont-") && key !== CACHE_NAME
            );
            const removed = old.slice(
                0,
                Math.max(0, old.length - KEPT_OLD_CACHES)
            );
            await Promise.all(removed.map((key) => caches.delete(key)));
            // The previous worker used one unversioned cache
            await caches.delete("spessafont-cache");
            await service.clients.claim();
        })()
    );
});

// The page sends what it loaded before this worker controlled it (the first visit)
service.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.type !== "cache" || !Array.isArray(data.urls)) {
        return;
    }
    const urls = data.urls.filter(
        (url) =>
            typeof url === "string" &&
            new URL(url).origin === self.location.origin
    );
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.all(
                urls.map(async (url) => {
                    if (!(await cache.match(url))) {
                        // A file that fails here is cached on its next fetch instead
                        await cache.add(url).catch((error) => {
                            console.warn(`Could not cache ${url}:`, error);
                        });
                    }
                })
            )
        )
    );
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
 * Network first. The cache answers when the network fails, and also when it answers with an
 * error (a file of an older release that the server no longer has).
 * @param request {Request}
 * @return {Promise<Response>}
 */
async function tryCacheRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    // A reload with "?samplerate=" is still the same page
    const matchOptions = { ignoreSearch: request.mode === "navigate" };
    let networkResponse;
    try {
        networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
            return networkResponse;
        }
    } catch {
        // Offline, the cache answers below
    }
    // Searches every cache, the kept old one included
    const cachedResponse = await caches.match(request, matchOptions);
    if (cachedResponse) {
        return cachedResponse;
    }
    return (
        networkResponse ??
        new Response("503", {
            status: 503,
            statusText: "Service Unavailable"
        })
    );
}
