import type * as React from "react";
import type { GenericRange } from "spessasynth_core";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { getPressedNote } from "./use_pressed_notes.ts";

export const KEY_COUNT = 128;
const MAX_VELOCITY = 127;
export const NOTES = Array.from({ length: KEY_COUNT }, (_, i) => i);

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
export function findKey(e: React.PointerEvent<HTMLDivElement>) {
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
    const rect = element.getBoundingClientRect();
    const keyHeight = isBlackNoteNumber(midiNote)
        ? rect.height * 0.7
        : rect.height;
    const velocity = Math.max(
        1,
        Math.min(
            MAX_VELOCITY,
            Math.floor(((e.clientY - rect.top) / keyHeight) * 128)
        )
    );
    return { midiNote, velocity };
}

/**
 * Which keys are pressed, highlighted (in a range that holds a key pressed on the keyboard's
 * channel), and enabled (in any range of the shown element, or all keys without ranges).
 */
export function getKeyStates(
    pressedNotes: Iterable<number>,
    splits: readonly GenericRange[]
) {
    const pressed = new Array<boolean>(KEY_COUNT).fill(false);
    const highlighted = new Array<boolean>(KEY_COUNT).fill(false);
    for (const id of pressedNotes) {
        const { channel, midiNote } = getPressedNote(id);
        pressed[midiNote] = true;
        if (channel !== KEYBOARD_TARGET_CHANNEL) {
            continue;
        }
        for (const split of splits) {
            if (split.min <= midiNote && split.max >= midiNote) {
                highlighted.fill(true, split.min, split.max + 1);
            }
        }
    }
    const enabled = new Array<boolean>(KEY_COUNT).fill(splits.length === 0);
    for (const split of splits) {
        enabled.fill(true, split.min, split.max + 1);
    }
    return { pressed, highlighted, enabled };
}
