/**
 * Typed through JSDoc and checked by tsconfig.sw.json
 * @type {ServiceWorkerGlobalScope}
 */
const service = /** @type {ServiceWorkerGlobalScope} */ (globalThis);

// Every release registers the worker with its version, so each gets its own cache
const VERSION =
    new URL(service.location.href).searchParams.get("version") ?? "dev";
const CACHE_NAME = `spessafont-${VERSION}`;
// A tab that stayed open since the last release still loads its old files
const KEPT_OLD_CACHES = 1;

// Relative, so they resolve inside the app's folder (GitHub Pages serves it from a subfolder)
const PRECACHED = ["./", "index.html", "manifest.webmanifest"];

/**
 * Caches a file unless it is cached already. A file that fails here is cached on its next fetch
 * instead.
 * @param cache {Cache}
 * @param url {string}
 * @return {Promise<void>}
 */
async function addToCache(cache, url) {
    try {
        if (!(await cache.match(url))) {
            await cache.add(url);
        }
    } catch (error) {
        console.warn(`Could not cache ${url}:`, error);
    }
}

/**
 * Caches the page and every built file. The build lists them in precache.json, so the files
 * loaded only later (the Worker's own copy of the encoder for SF3 saves) work offline too.
 * @return {Promise<void>}
 */
async function precache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHED);
    /**
     * @type {unknown}
     */
    let files;
    try {
        const response = await fetch("precache.json");
        files = await response.json();
    } catch (error) {
        console.warn("Could not read the list of built files:", error);
        return;
    }
    if (!Array.isArray(files)) {
        return;
    }
    await Promise.all(
        files
            .filter((file) => typeof file === "string")
            .map((file) => addToCache(cache, file))
    );
}

service.addEventListener("install", (event) => {
    event.waitUntil(precache());
    void service.skipWaiting();
});

service.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            // caches.keys() lists caches in the order they were created
            const keys = await caches.keys();
            const old = keys.filter(
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
    /**
     * @type {string[]}
     */
    const urls = data.urls.filter(
        (/** @type {unknown} */ url) =>
            typeof url === "string" &&
            new URL(url).origin === service.location.origin
    );
    event.waitUntil(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            await Promise.all(urls.map((url) => addToCache(cache, url)));
        })()
    );
});

/**
 * Writes a fresh response to the cache. A failed write (a full disk) is only logged.
 * @param request {Request}
 * @param response {Response}
 * @return {Promise<void>}
 */
async function putInCache(request, response) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response);
    } catch (error) {
        console.warn(`Could not cache ${request.url}:`, error);
    }
}

/**
 * Network first. The cache answers when the network fails, and also when it answers with an
 * error (a file of an older release that the server no longer has).
 * @param event {FetchEvent}
 * @return {Promise<Response>}
 */
async function tryCacheRequest(event) {
    const { request } = event;
    // A reload with "?samplerate=" is still the same page
    const matchOptions = { ignoreSearch: request.mode === "navigate" };
    let networkResponse;
    try {
        networkResponse = await fetch(request);
    } catch {
        // Offline, the cache answers below
    }
    if (networkResponse?.ok) {
        // The page gets the response while it downloads, the copy is written beside it
        event.waitUntil(putInCache(request, networkResponse.clone()));
        return networkResponse;
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

service.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    const url = new URL(event.request.url);
    if (
        url.origin !== service.location.origin ||
        url.protocol !== service.location.protocol
    ) {
        return;
    }

    event.respondWith(tryCacheRequest(event));
});
