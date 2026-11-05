// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    findKey,
    getKeyClassName,
    getKeyStates,
    getNoteName,
    getSteppedNote
} from "./piano_keys.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";

const noteId = (channel: number, midiNote: number) => channel * 128 + midiNote;
const FULL = { min: 0, max: 127 };
function trueKeys(keys: boolean[]) {
    const notes = new Array<number>();
    for (const [note, isSet] of keys.entries()) {
        if (isSet) {
            notes.push(note);
        }
    }
    return notes;
}
function keysOnly(...ranges: { min: number; max: number }[]) {
    return ranges.map((keys) => ({ keys, velocities: FULL }));
}
const NOTHING_PRESSED = new Map<number, number>();

describe("getKeyStates", () => {
    it("enables every key when no ranges apply", () => {
        const { enabled, highlighted } = getKeyStates(
            NOTHING_PRESSED,
            undefined
        );
        expect(enabled.every(Boolean)).toBe(true);
        expect(highlighted.some(Boolean)).toBe(false);
    });

    it("enables no key for an element without zones", () => {
        const { enabled } = getKeyStates(NOTHING_PRESSED, []);
        expect(enabled.some(Boolean)).toBe(false);
    });

    it("enables only the keys inside the ranges", () => {
        const { enabled } = getKeyStates(
            NOTHING_PRESSED,
            keysOnly({ min: 60, max: 62 })
        );
        expect(trueKeys(enabled)).toEqual([60, 61, 62]);
    });

    it("highlights the ranges that hold a key pressed on the keyboard channel", () => {
        const splits = keysOnly(
            { min: 0, max: 10 },
            { min: 60, max: 61 },
            { min: 61, max: 63 }
        );
        const { pressed, highlighted } = getKeyStates(
            new Map([[noteId(KEYBOARD_TARGET_CHANNEL, 61), 100]]),
            splits
        );
        expect(trueKeys(pressed)).toEqual([61]);
        expect(trueKeys(highlighted)).toEqual([60, 61, 62, 63]);
    });

    it("highlights only the layers that play at the pressed velocity", () => {
        const splits = [
            { keys: { min: 60, max: 61 }, velocities: { min: 0, max: 63 } },
            { keys: { min: 61, max: 62 }, velocities: { min: 64, max: 127 } }
        ];
        const soft = getKeyStates(
            new Map([[noteId(KEYBOARD_TARGET_CHANNEL, 61), 20]]),
            splits
        );
        expect(trueKeys(soft.highlighted)).toEqual([60, 61]);
        const loud = getKeyStates(
            new Map([[noteId(KEYBOARD_TARGET_CHANNEL, 61), 120]]),
            splits
        );
        expect(trueKeys(loud.highlighted)).toEqual([61, 62]);
    });

    it("shows notes from other channels as pressed without highlighting", () => {
        const otherChannel = KEYBOARD_TARGET_CHANNEL === 0 ? 1 : 0;
        const { pressed, highlighted } = getKeyStates(
            new Map([[noteId(otherChannel, 5), 100]]),
            keysOnly({ min: 0, max: 10 })
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

describe("getNoteName", () => {
    it("names notes with their octave, middle C as C4", () => {
        expect(getNoteName(60)).toBe("C4");
        expect(getNoteName(61)).toBe("C#4");
        expect(getNoteName(0)).toBe("C-1");
        expect(getNoteName(127)).toBe("G9");
    });
});

describe("getSteppedNote", () => {
    it("moves by a key, an octave, or to the ends, and stays on the keyboard", () => {
        expect(getSteppedNote(60, "ArrowRight")).toBe(61);
        expect(getSteppedNote(60, "ArrowDown")).toBe(59);
        expect(getSteppedNote(60, "PageUp")).toBe(72);
        expect(getSteppedNote(60, "Home")).toBe(0);
        expect(getSteppedNote(60, "End")).toBe(127);
        expect(getSteppedNote(0, "ArrowLeft")).toBe(0);
        expect(getSteppedNote(120, "PageUp")).toBe(127);
        expect(getSteppedNote(60, "a")).toBeUndefined();
    });
});

/**
 * A key whose box is the visible key (with the transform), as `getBoundingClientRect`
 * gives it, and a press at a height ratio of that box.
 */
function pressAt(midiNote: number, ratio: number) {
    const keyboard = document.createElement("div");
    const key = document.createElement("div");
    key.dataset.note = midiNote.toString();
    keyboard.append(key);
    // A black key is drawn at 0.7 of the keyboard's 100 px
    const height = getKeyClassName(midiNote).includes("sharp_key") ? 70 : 100;
    vi.spyOn(key, "getBoundingClientRect").mockReturnValue(
        new DOMRect(0, 0, 10, height)
    );
    document.elementFromPoint = () => key;
    return findKey({
        clientX: 5,
        clientY: height * ratio,
        currentTarget: keyboard
    })?.velocity;
}

describe("findKey", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("spans the velocity over the visible key, black or white", () => {
        expect(pressAt(61, 0.5)).toBe(64);
        expect(pressAt(60, 0.5)).toBe(64);
        // Two thirds down a black key is not full velocity yet
        expect(pressAt(61, 0.69)).toBeLessThan(127);
    });
});
