// The service worker (public/service-worker.js) writes the shared files here. Keep both in sync
const SHARED_FILES_CACHE = "spessafont_shared_files";
const FILE_NAME_HEADER = "X-File-Name";

/**
 * Reads the files the share sheet sent to the app and deletes them from the cache, so they
 * are opened once.
 */
export async function takeSharedFiles() {
    if (typeof caches === "undefined") {
        return new Array<File>();
    }
    const cache = await caches.open(SHARED_FILES_CACHE);
    const files = new Array<File>();
    const requests = await cache.keys();
    for (const request of requests) {
        const response = await cache.match(request);
        if (!response) {
            continue;
        }
        const name = decodeURIComponent(
            response.headers.get(FILE_NAME_HEADER) ?? "shared"
        );
        const blob = await response.blob();
        files.push(new File([blob], name, { type: blob.type }));
    }
    await caches.delete(SHARED_FILES_CACHE);
    return files;
}
