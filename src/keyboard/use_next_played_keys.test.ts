// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { useNextPlayedKeys } from "./use_next_played_keys.ts";

const handlers = vi.hoisted(() => ({
    current: undefined as ((event: ForwardedSynthEvent) => void) | undefined
}));

vi.mock("../hooks/use_synth_event.ts", () => ({
    useSynthEvent: (handler: (event: ForwardedSynthEvent) => void) => {
        handlers.current = handler;
    }
}));

function noteOn(channel: number, midiNote: number) {
    handlers.current?.({
        type: "noteOn",
        data: { channel, midiNote, velocity: 100 }
    });
}

describe("useNextPlayedKeys", () => {
    beforeEach(() => {
        handlers.current = undefined;
    });

    it("collects note-ons on the keyboard channel and starts over", () => {
        const onPlayed = vi.fn();
        renderHook(() => useNextPlayedKeys(2, onPlayed));
        noteOn(0, 38);
        noteOn(3, 50);
        noteOn(0, 42);
        expect(onPlayed).toHaveBeenCalledTimes(1);
        expect(onPlayed).toHaveBeenCalledWith([38, 42]);
        noteOn(0, 44);
        expect(onPlayed).toHaveBeenCalledTimes(1);
    });
});
