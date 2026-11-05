import { describe, expect, it } from "vitest";
import { routeToKeyboardChannel } from "./use_midi_input.ts";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";

describe("routeToKeyboardChannel", () => {
    it("moves channel messages to the keyboard's channel", () => {
        // Note on, channel 3
        expect([
            ...routeToKeyboardChannel(Uint8Array.of(0x92, 60, 100))
        ]).toEqual([0x90 | KEYBOARD_TARGET_CHANNEL, 60, 100]);
        // Pitch wheel, channel 16
        expect([...routeToKeyboardChannel(Uint8Array.of(0xef, 0, 64))]).toEqual(
            [0xe0 | KEYBOARD_TARGET_CHANNEL, 0, 64]
        );
    });

    it("leaves system messages alone", () => {
        const sysex = Uint8Array.of(0xf0, 0x7e, 0x7f, 0x09, 0x01, 0xf7);
        expect(routeToKeyboardChannel(sysex)).toBe(sysex);
        const clock = Uint8Array.of(0xf8);
        expect(routeToKeyboardChannel(clock)).toBe(clock);
    });
});
