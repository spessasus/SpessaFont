import { describe, expect, it, vi } from "vitest";
import { getWaveClickHandlers } from "./wave_click_handlers.ts";

function createSetters(isLoaded = true) {
    return {
        isLoaded,
        getSampleAt: () => 42,
        onLoopStartChange: vi.fn(),
        onLoopEndChange: vi.fn()
    };
}

const event = (preventDefault = vi.fn()) => ({ preventDefault });

describe("getWaveClickHandlers", () => {
    it("sets the loop start on a click and the end on a right click on desktop", () => {
        const setters = createSetters();
        const handlers = getWaveClickHandlers("desktop", setters);
        handlers.onClick?.(event());
        expect(setters.onLoopStartChange).toHaveBeenCalledWith(42);
        const preventDefault = vi.fn();
        handlers.onContextMenu?.(event(preventDefault));
        expect(preventDefault).toHaveBeenCalled();
        expect(setters.onLoopEndChange).toHaveBeenCalledWith(42);
    });

    it("sets nothing before the audio is read on desktop", () => {
        const setters = createSetters(false);
        const handlers = getWaveClickHandlers("desktop", setters);
        handlers.onClick?.(event());
        const preventDefault = vi.fn();
        handlers.onContextMenu?.(event(preventDefault));
        expect(preventDefault).toHaveBeenCalled();
        expect(setters.onLoopStartChange).not.toHaveBeenCalled();
        expect(setters.onLoopEndChange).not.toHaveBeenCalled();
    });

    it("attaches no loop setters on a phone", () => {
        expect(getWaveClickHandlers("phone", createSetters())).toEqual({});
    });
});
