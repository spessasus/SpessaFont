import { describe, expect, it, vi } from "vitest";
import source from "../public/service-worker.js?raw";

/*
 * public/service-worker.js is a plain script, so it is loaded from its source with stand-ins
 * for the service worker globals.
 */

/**
 * Cache Storage keeps entries and caches in insertion order, as the spec does.
 */
class FakeCache {
    public readonly entries = new Map<string, Response>();
    public failPut = false;

    public match(request: string | { url: string }) {
        const url = typeof request === "string" ? request : request.url;
        return Promise.resolve(this.entries.get(url)?.clone());
    }

    public async put(request: string | { url: string }, response: Response) {
        if (this.failPut) {
            throw new DOMException("Quota exceeded", "QuotaExceededError");
        }
        const url = typeof request === "string" ? request : request.url;
        this.entries.set(url, new Response(await response.text()));
    }

    public async add(url: string) {
        await this.put(url, new Response(`fetched ${url}`));
    }

    public async addAll(urls: string[]) {
        for (const url of urls) {
            await this.add(url);
        }
    }
}

class FakeCacheStorage {
    public readonly caches = new Map<string, FakeCache>();

    public open(name: string) {
        let cache = this.caches.get(name);
        if (!cache) {
            cache = new FakeCache();
            this.caches.set(name, cache);
        }
        return Promise.resolve(cache);
    }

    public async match(request: { url: string }) {
        for (const cache of this.caches.values()) {
            const hit = await cache.match(request);
            if (hit) {
                return hit;
            }
        }
        return undefined;
    }

    public keys() {
        return Promise.resolve(Array.from(this.caches.keys()));
    }

    public delete(name: string) {
        return Promise.resolve(this.caches.delete(name));
    }
}

type Handler = (event: unknown) => void;

// A different URL each time, or the module would run only once
const loads = { count: 0 };

async function loadServiceWorker(
    version: string,
    storage: FakeCacheStorage,
    fetchImpl: (request: unknown) => Promise<Response>
) {
    const handlers = new Map<string, Handler>();
    vi.stubGlobal(
        "location",
        new URL(
            `https://spessasus.github.io/SpessaFont/service-worker.js?version=${version}`
        )
    );
    vi.stubGlobal("addEventListener", (type: string, handler: Handler) =>
        handlers.set(type, handler)
    );
    vi.stubGlobal("skipWaiting", () => Promise.resolve());
    vi.stubGlobal("clients", { claim: () => Promise.resolve() });
    vi.stubGlobal("caches", storage);
    vi.stubGlobal("fetch", fetchImpl);
    loads.count += 1;
    const url = `data:text/javascript,${encodeURIComponent(`${source}\n//${loads.count}`)}`;
    await import(/* @vite-ignore */ url);
    return handlers;
}

/**
 * Sends one event and waits for everything it keeps alive.
 */
async function dispatch(handler: Handler | undefined, event: object) {
    const pending = new Array<Promise<unknown>>();
    let response: Promise<Response> | undefined;
    handler?.({
        ...event,
        waitUntil: (promise: Promise<unknown>) => {
            pending.push(promise);
        },
        respondWith: (promise: Promise<Response>) => {
            response = promise;
        }
    });
    const result = await response;
    // waitUntil can be called while the response is being made
    await Promise.all(pending);
    return result;
}

const ASSET = "https://spessasus.github.io/SpessaFont/assets/x.js";
const ASSET_REQUEST = { request: { url: ASSET, method: "GET", mode: "cors" } };

describe("service worker", () => {
    it("answers with the network response when writing the cache fails", async () => {
        const storage = new FakeCacheStorage();
        const old = await storage.open("spessafont-1.0.0");
        await old.put(ASSET, new Response("old body"));
        const current = await storage.open("spessafont-2.0.0");
        current.failPut = true;
        const handlers = await loadServiceWorker("2.0.0", storage, () =>
            Promise.resolve(new Response("fresh body"))
        );
        const response = await dispatch(handlers.get("fetch"), ASSET_REQUEST);
        expect(await response?.text()).toBe("fresh body");
    });

    it("answers before the cache write is done", async () => {
        const storage = new FakeCacheStorage();
        const cache = await storage.open("spessafont-2.0.0");
        // A write that never finishes
        cache.put = () => new Promise<undefined>(() => undefined);
        const handlers = await loadServiceWorker("2.0.0", storage, () =>
            Promise.resolve(new Response("fresh body"))
        );
        let response: Promise<Response> | undefined;
        handlers.get("fetch")?.({
            ...ASSET_REQUEST,
            waitUntil: (promise: Promise<unknown>) => promise,
            respondWith: (promise: Promise<Response>) => {
                response = promise;
            }
        });
        const answered = await response;
        expect(await answered?.text()).toBe("fresh body");
    });

    it("caches the fresh response for offline use", async () => {
        const storage = new FakeCacheStorage();
        let isOnline = true;
        const handlers = await loadServiceWorker("2.0.0", storage, () =>
            isOnline
                ? Promise.resolve(new Response("fresh body"))
                : Promise.reject(new TypeError("Failed to fetch"))
        );
        await dispatch(handlers.get("fetch"), ASSET_REQUEST);
        isOnline = false;
        const response = await dispatch(handlers.get("fetch"), ASSET_REQUEST);
        expect(await response?.text()).toBe("fresh body");
    });

    it("caches every built file from precache.json on install", async () => {
        const storage = new FakeCacheStorage();
        const handlers = await loadServiceWorker("2.0.0", storage, (url) =>
            url === "precache.json"
                ? Promise.resolve(
                      Response.json([
                          "assets/encode_vorbis-a.js",
                          "assets/ogg-b.wasm"
                      ])
                  )
                : Promise.reject(new TypeError("Unexpected fetch"))
        );
        await dispatch(handlers.get("install"), {});
        const cache = await storage.open("spessafont-2.0.0");
        expect(Array.from(cache.entries.keys())).toEqual([
            "./",
            "index.html",
            "manifest.webmanifest",
            "assets/encode_vorbis-a.js",
            "assets/ogg-b.wasm"
        ]);
    });

    it("keeps the newest old cache and deletes the older ones on activate", async () => {
        const storage = new FakeCacheStorage();
        await storage.open("spessafont-cache");
        await storage.open("spessafont-1.0.0");
        await storage.open("spessafont-1.1.0");
        await storage.open("other-app");
        const handlers = await loadServiceWorker("1.2.0", storage, () =>
            Promise.resolve(new Response("x"))
        );
        await storage.open("spessafont-1.2.0");
        await dispatch(handlers.get("activate"), {});
        expect(await storage.keys()).toEqual([
            "spessafont-1.1.0",
            "other-app",
            "spessafont-1.2.0"
        ]);
    });
});
