import type * as React from "react";
import type { KeySplit } from "../../utils/zone_splits.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { getPressedNote } from "./use_pressed_notes.ts";

export const KEY_COUNT = 128;
const MAX_VELOCITY = 127;
export const NOTES = Array.from({ length: KEY_COUNT }, (_, i) => i);

const NOTE_NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B"
];

/**
 * How far each key moves the keyboard's focused key, one key or an octave.
 */
const KEY_STEPS: Partial<Record<string, number>> = {
    ArrowLeft: -1,
    ArrowDown: -1,
    ArrowRight: 1,
    ArrowUp: 1,
    PageDown: -12,
    PageUp: 12,
    Home: -KEY_COUNT,
    End: KEY_COUNT
};

/**
 * The note's name with its octave, with C4 as middle C (60).
 */
export function getNoteName(midiNote: number) {
    return `${NOTE_NAMES[midiNote % 12]}${Math.floor(midiNote / 12) - 1}`;
}

/**
 * The key the focus moves to for a pressed key (`KeyboardEvent.key`), or undefined when the
 * key does not move it.
 */
export function getSteppedNote(midiNote: number, key: string) {
    const step = KEY_STEPS[key];
    return step === undefined
        ? undefined
        : Math.max(0, Math.min(KEY_COUNT - 1, midiNote + step));
}

function isBlackNoteNumber(midiNote: number) {
    return [1, 3, 6, 8, 10].includes(midiNote % 12);
}

export function getKeyClassName(midiNote: number) {
    if (isBlackNoteNumber(midiNote)) {
        return "key sharp_key";
    }
    const hasBlackNoteLeft = isBlackNoteNumber(midiNote - 1);
    const hasBlackNoteRight =
        midiNote < KEY_COUNT - 1 && isBlackNoteNumber(midiNote + 1);
    if (hasBlackNoteLeft && hasBlackNoteRight) {
        return "key flat_key between_sharps";
    }
    if (hasBlackNoteLeft) {
        return "key flat_key left_sharp";
    }
    return hasBlackNoteRight ? "key flat_key right_sharp" : "key flat_key";
}

/**
 * Touch pointers are captured by the element they started on, so the key under the pointer
 * is found by position, which also makes sliding across keys work.
 */
export function findKey(
    e: Pick<
        React.PointerEvent<HTMLDivElement>,
        "clientX" | "clientY" | "currentTarget"
    >
) {
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (
        !(element instanceof HTMLElement) ||
        element.parentElement !== e.currentTarget
    ) {
        return undefined;
    }
    const midiNote = Number(element.dataset.note);
    if (!Number.isSafeInteger(midiNote)) {
        return undefined;
    }
    // The box includes the black keys' shorter scale, so it is the visible key for both
    const rect = element.getBoundingClientRect();
    const velocity = Math.max(
        1,
        Math.min(
            MAX_VELOCITY,
            Math.floor(((e.clientY - rect.top) / rect.height) * 128)
        )
    );
    return { midiNote, velocity };
}

/**
 * Which keys are pressed, highlighted (in a range that plays a note pressed on the keyboard's
 * channel at its velocity), and enabled (in any range of the shown element at any velocity,
 * or every key when no ranges apply).
 */
export function getKeyStates(
    pressedNotes: ReadonlyMap<number, number>,
    splits: readonly KeySplit[] | undefined
) {
    const ranges = splits ?? [];
    const pressed = new Array<boolean>(KEY_COUNT).fill(false);
    const highlighted = new Array<boolean>(KEY_COUNT).fill(false);
    for (const [id, velocity] of pressedNotes) {
        const { channel, midiNote } = getPressedNote(id);
        pressed[midiNote] = true;
        if (channel !== KEYBOARD_TARGET_CHANNEL) {
            continue;
        }
        for (const { keys, velocities } of ranges) {
            if (
                keys.min <= midiNote &&
                keys.max >= midiNote &&
                velocities.min <= velocity &&
                velocities.max >= velocity
            ) {
                highlighted.fill(true, keys.min, keys.max + 1);
            }
        }
    }
    const enabled = new Array<boolean>(KEY_COUNT).fill(splits === undefined);
    for (const { keys } of ranges) {
        enabled.fill(true, keys.min, keys.max + 1);
    }
    return { pressed, highlighted, enabled };
}
