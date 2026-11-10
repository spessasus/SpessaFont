// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useIsLandscape } from "./use_is_landscape.ts";

/**
 * A stand-in for screen.orientation that counts its change listeners.
 */
function stubOrientation(type: string) {
    const listeners = new Set<EventListener>();
    const orientation = {
        type,
        addEventListener: (_: string, listener: EventListener) =>
            listeners.add(listener),
        removeEventListener: (_: string, listener: EventListener) =>
            listeners.delete(listener)
    };
    // jsdom has no screen.orientation
    Object.defineProperty(screen, "orientation", {
        value: orientation,
        configurable: true
    });
    return {
        orientation,
        listeners,
        change: (next: string) => {
            orientation.type = next;
            for (const listener of listeners) {
                listener(new Event("change"));
            }
        }
    };
}

function setViewport(width: number, height: number) {
    vi.spyOn(globalThis, "innerWidth", "get").mockReturnValue(width);
    vi.spyOn(globalThis, "innerHeight", "get").mockReturnValue(height);
}

describe("useIsLandscape", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        Reflect.deleteProperty(screen, "orientation");
    });

    it("updates on resize and on an orientation change, and removes its listeners", () => {
        const stub = stubOrientation("portrait-primary");
        setViewport(412, 915);
        const removeResize = vi.spyOn(globalThis, "removeEventListener");
        const { result, unmount } = renderHook(() => useIsLandscape());
        expect(result.current).toBe(false);

        setViewport(915, 412);
        act(() => stub.change("landscape-primary"));
        expect(result.current).toBe(true);

        setViewport(412, 915);
        act(() => {
            dispatchEvent(new Event("resize"));
        });
        expect(result.current).toBe(false);

        unmount();
        expect(stub.listeners.size).toBe(0);
        expect(removeResize).toHaveBeenCalledWith(
            "resize",
            expect.any(Function)
        );
    });
});
