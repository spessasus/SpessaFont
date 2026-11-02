import { describe, expect, it } from "vitest";
import { getKeyClassName, getKeyStates } from "./piano_keys.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";

const noteId = (channel: number, midiNote: number) => channel * 128 + midiNote;
function trueKeys(keys: boolean[]) {
    const notes = new Array<number>();
    for (const [note, isSet] of keys.entries()) {
        if (isSet) {
            notes.push(note);
        }
    }
    return notes;
}

describe("getKeyStates", () => {
    it("enables every key when the element has no ranges", () => {
        const { enabled, highlighted } = getKeyStates([], []);
        expect(enabled.every(Boolean)).toBe(true);
        expect(highlighted.some(Boolean)).toBe(false);
    });

    it("enables only the keys inside the ranges", () => {
        const { enabled } = getKeyStates([], [{ min: 60, max: 62 }]);
        expect(trueKeys(enabled)).toEqual([60, 61, 62]);
    });

    it("highlights the ranges that hold a key pressed on the keyboard channel", () => {
        const splits = [
            { min: 0, max: 10 },
            { min: 60, max: 61 },
            { min: 61, max: 63 }
        ];
        const { pressed, highlighted } = getKeyStates(
            [noteId(KEYBOARD_TARGET_CHANNEL, 61)],
            splits
        );
        expect(trueKeys(pressed)).toEqual([61]);
        expect(trueKeys(highlighted)).toEqual([60, 61, 62, 63]);
    });

    it("shows notes from other channels as pressed without highlighting", () => {
        const otherChannel = KEYBOARD_TARGET_CHANNEL === 0 ? 1 : 0;
        const { pressed, highlighted } = getKeyStates(
            [noteId(otherChannel, 5)],
            [{ min: 0, max: 10 }]
        );
        expect(trueKeys(pressed)).toEqual([5]);
        expect(highlighted.some(Boolean)).toBe(false);
    });
});

describe("getKeyClassName", () => {
    it("names the shape of each key in an octave", () => {
        expect(getKeyClassName(60)).toBe("key flat_key right_sharp");
        expect(getKeyClassName(61)).toBe("key sharp_key");
        expect(getKeyClassName(62)).toBe("key flat_key between_sharps");
        expect(getKeyClassName(64)).toBe("key flat_key left_sharp");
    });

    it("gives the last key no sharp on its right", () => {
        expect(getKeyClassName(127)).toBe("key flat_key left_sharp");
    });
});
