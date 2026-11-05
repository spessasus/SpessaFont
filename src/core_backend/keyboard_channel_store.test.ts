import { describe, expect, it, vi } from "vitest";
import { KeyboardChannelStore } from "./keyboard_channel_store.ts";

describe("KeyboardChannelStore", () => {
    it("keeps its snapshot and stays quiet when nothing changed", () => {
        const store = new KeyboardChannelStore();
        const listener = vi.fn();
        store.subscribe(listener);
        store.update({ controllers: [0, 5], pitchWheel: 8192, pressure: 0 });
        const snapshot = store.getSnapshot();

        store.update({ controllers: [0, 5], pitchWheel: 8192, pressure: 0 });

        expect(store.getSnapshot()).toBe(snapshot);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it("publishes a changed controller", () => {
        const store = new KeyboardChannelStore();
        store.update({ controllers: [0, 5], pitchWheel: 8192, pressure: 0 });
        const listener = vi.fn();
        store.subscribe(listener);

        store.update({ controllers: [0, 6], pitchWheel: 8192, pressure: 0 });

        expect(store.getSnapshot().controllers[1]).toBe(6);
        expect(listener).toHaveBeenCalledTimes(1);
    });
});
