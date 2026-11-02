import type * as React from "react";
import { memo, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./keyboard.css";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import type { GenericRange } from "spessasynth_core";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { getPressedNote, usePressedNotes } from "./use_pressed_notes.ts";

const KEY_COUNT = 128;
const MAX_VELOCITY = 127;
const NOTES = Array.from({ length: KEY_COUNT }, (_, i) => i);

function isBlackNoteNumber(midiNote: number) {
    return [1, 3, 6, 8, 10].includes(midiNote % 12);
}

function getKeyClassName(midiNote: number) {
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
function findKey(e: React.PointerEvent<HTMLDivElement>) {
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

interface PianoKeyProps {
    midiNote: number;
    isPressed: boolean;
    isHighlighted: boolean;
    isEnabled: boolean;
}

/**
 * Memoized because MIDI playback re-renders the keyboard on every note.
 */
const PianoKey = memo(function PianoKey({
    midiNote,
    isPressed,
    isHighlighted,
    isEnabled
}: PianoKeyProps) {
    let className = getKeyClassName(midiNote);
    if (!isEnabled) {
        className += " disabled";
    }
    if (isHighlighted) {
        className += " zone_highlight";
    }
    if (isPressed) {
        className += " pressed";
    }
    return <div className={className} data-note={midiNote} />;
});

interface KeyboardProps {
    /**
     * Key ranges of the shown element. Keys outside all of them are dimmed, and pressing a key
     * highlights the ranges that contain it.
     */
    splits: readonly GenericRange[];
    /**
     * Called with the key under the pointer and the velocity a press there would have.
     */
    onKeyHover: (midiNote: number, velocity: number) => void;
}

// most of this code is ported over from spessasynth web app
export function Keyboard({ splits, onKeyHover }: KeyboardProps) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const pressedNotes = usePressedNotes();
    // The note each pointer holds, so several fingers can play at once
    const heldNotes = useRef(new Map<number, number>());

    // Hiding the keyboard while a key is held would leave the note playing
    useEffect(() => {
        const held = heldNotes.current;
        return () => {
            for (const note of held.values()) {
                audioEngine.noteOffRealTime(KEYBOARD_TARGET_CHANNEL, note);
            }
            held.clear();
        };
    }, [audioEngine]);

    const pressedKeys = new Array<boolean>(KEY_COUNT).fill(false);
    const highlightedKeys = new Array<boolean>(KEY_COUNT).fill(false);
    for (const id of pressedNotes) {
        const { channel, midiNote } = getPressedNote(id);
        pressedKeys[midiNote] = true;
        if (channel !== KEYBOARD_TARGET_CHANNEL) {
            continue;
        }
        for (const split of splits) {
            if (split.min <= midiNote && split.max >= midiNote) {
                highlightedKeys.fill(true, split.min, split.max + 1);
            }
        }
    }
    const enabledKeys = new Array<boolean>(KEY_COUNT).fill(splits.length === 0);
    for (const split of splits) {
        enabledKeys.fill(true, split.min, split.max + 1);
    }

    const releasePointer = (pointerId: number) => {
        const note = heldNotes.current.get(pointerId);
        if (note === undefined) {
            return;
        }
        heldNotes.current.delete(pointerId);
        audioEngine.noteOffRealTime(KEYBOARD_TARGET_CHANNEL, note);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const key = findKey(e);
        if (key) {
            onKeyHover(key.midiNote, key.velocity);
        }
        // The keyboard holds the capture while the button or finger is down, so leaving the
        // keyboard releases the note and coming back plays again
        if (
            !e.currentTarget.hasPointerCapture(e.pointerId) ||
            key?.midiNote === heldNotes.current.get(e.pointerId)
        ) {
            return;
        }
        releasePointer(e.pointerId);
        if (!key) {
            return;
        }
        heldNotes.current.set(e.pointerId, key.midiNote);
        audioEngine.noteOnRealTime(
            KEYBOARD_TARGET_CHANNEL,
            key.midiNote,
            key.velocity
        );
    };

    return (
        <div
            className="keyboard"
            role={"group"}
            aria-label={t("keyboardLocale.keyboard")}
            onPointerDown={(e) => {
                if (e.pointerType === "mouse" && e.button !== 0) {
                    return;
                }
                e.currentTarget.setPointerCapture(e.pointerId);
                handlePointerMove(e);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={(e) => releasePointer(e.pointerId)}
            onPointerCancel={(e) => releasePointer(e.pointerId)}
            onLostPointerCapture={(e) => releasePointer(e.pointerId)}
        >
            {NOTES.map((midiNote) => (
                <PianoKey
                    // 128 fixed keys, never reordered
                    key={midiNote}
                    midiNote={midiNote}
                    isPressed={pressedKeys[midiNote]}
                    isHighlighted={highlightedKeys[midiNote]}
                    isEnabled={enabledKeys[midiNote]}
                />
            ))}
        </div>
    );
}
