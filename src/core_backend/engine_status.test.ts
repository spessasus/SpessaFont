import { describe, expect, it, vi } from "vitest";
import { type EngineStatus, EngineStatusStore } from "./engine_status.ts";
import { ListenerSet } from "./listener_set.ts";

const STATUS: EngineStatus = {
    voiceCount: 3,
    time: 12,
    duration: 60,
    isPaused: false,
    hasSong: true,
    songName: "Test"
};

describe("EngineStatusStore", () => {
    it("publishes only when a value changes", () => {
        const store = new EngineStatusStore();
        const listener = vi.fn();
        store.subscribe(listener);

        store.update(STATUS);
        const snapshot = store.getSnapshot();
        store.update({ ...STATUS });
        expect(listener).toHaveBeenCalledTimes(1);
        expect(store.getSnapshot()).toBe(snapshot);

        store.update({ ...STATUS, voiceCount: 4 });
        expect(listener).toHaveBeenCalledTimes(2);
        expect(store.getSnapshot().voiceCount).toBe(4);
    });

    it("stops notifying after unsubscribe", () => {
        const store = new EngineStatusStore();
        const listener = vi.fn();
        const unsubscribe = store.subscribe(listener);
        unsubscribe();
        store.update(STATUS);
        expect(listener).not.toHaveBeenCalled();
    });
});

describe("ListenerSet", () => {
    it("passes the value to every listener", () => {
        const set = new ListenerSet<number>();
        const first = vi.fn();
        const second = vi.fn();
        set.subscribe(first);
        set.subscribe(second);
        set.emit(5);
        expect(first).toHaveBeenCalledWith(5);
        expect(second).toHaveBeenCalledWith(5);
    });
});
