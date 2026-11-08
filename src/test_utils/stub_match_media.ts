import { vi } from "vitest";

/**
 * Replaces `matchMedia` with one fake list that every query shares.
 * `set` changes `matches` and calls the `change` listeners. Call
 * `vi.unstubAllGlobals()` afterwards.
 */
export function stubMatchMedia(isInitiallyMatching: boolean) {
    const media = {
        matches: isInitiallyMatching,
        listeners: new Set<() => void>(),
        addEventListener: (_type: string, listener: () => void) => {
            media.listeners.add(listener);
        },
        removeEventListener: (_type: string, listener: () => void) => {
            media.listeners.delete(listener);
        },
        set: (isNowMatching: boolean) => {
            media.matches = isNowMatching;
            for (const listener of media.listeners) {
                listener();
            }
        }
    };
    vi.stubGlobal("matchMedia", () => media);
    return media;
}
