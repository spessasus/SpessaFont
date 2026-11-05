// Node lacks the browser globals that some modules read at import time.
// These are minimal stand-ins, not full implementations.

if (typeof location === "undefined") {
    Object.defineProperty(globalThis, "location", {
        value: new URL("http://localhost:5173/"),
        configurable: true
    });
}

// Node 25+ defines a localStorage getter that warns and returns undefined
// unless started with --localstorage-file, so it is always replaced.
{
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
        value: {
            getItem: (key: string) => store.get(key) ?? null,
            setItem: (key: string, value: string) => {
                store.set(key, value);
            },
            removeItem: (key: string) => {
                store.delete(key);
            },
            clear: () => {
                store.clear();
            }
        },
        configurable: true
    });
}
