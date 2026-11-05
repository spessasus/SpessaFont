import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./keyboard.css";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { useEventListener } from "../../hooks/use_event_listener.ts";
import type { KeySplit } from "../../utils/zone_splits.ts";
import { usePressedNotes } from "./use_pressed_notes.ts";
import {
    findKey,
    getKeyStates,
    getNoteName,
    getSteppedNote,
    KEY_COUNT,
    NOTES
} from "./piano_keys.ts";
import { PianoKey } from "./piano_key.tsx";

/**
 * Where the computer keyboard's note is kept among the pointers' notes. Pointer ids are
 * never negative.
 */
const COMPUTER_KEYBOARD = -1;
const COMPUTER_KEYBOARD_VELOCITY = 100;
const MIDDLE_C = 60;

function isPlayKey(key: string) {
    return key === " " || key === "Enter";
}

interface KeyboardProps {
    /**
     * Ranges of the shown element. Keys outside all of them are dimmed, and pressing a key
     * highlights the ranges that play it. Undefined when no ranges apply.
     */
    splits: readonly KeySplit[] | undefined;
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
    // The key that Space and Enter play
    const [focusedNote, setFocusedNote] = useState(MIDDLE_C);

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

    const keys = getKeyStates(pressedNotes, splits);

    const releasePointer = (pointerId: number) => {
        const note = heldNotes.current.get(pointerId);
        if (note === undefined) {
            return;
        }
        heldNotes.current.delete(pointerId);
        audioEngine.noteOffRealTime(KEYBOARD_TARGET_CHANNEL, note);
    };

    const play = (pointerId: number, midiNote: number, velocity: number) => {
        releasePointer(pointerId);
        heldNotes.current.set(pointerId, midiNote);
        audioEngine.noteOnRealTime(KEYBOARD_TARGET_CHANNEL, midiNote, velocity);
    };

    // A button released in another window never reaches the page, so the notes would stick
    const releaseAll = () => {
        for (const pointerId of heldNotes.current.keys()) {
            releasePointer(pointerId);
        }
    };
    useEventListener(globalThis, "blur", releaseAll);
    useEventListener(document, "visibilitychange", () => {
        if (document.hidden) {
            releaseAll();
        }
    });

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const key = findKey(e);
        if (key) {
            onKeyHover(key.midiNote, key.velocity);
        }
        // The keyboard holds the capture while the button or finger is down, so leaving the
        // keyboard releases the note and coming back plays again. No buttons means the release
        // happened where the page could not see it
        if (
            !e.currentTarget.hasPointerCapture(e.pointerId) ||
            e.buttons === 0
        ) {
            releasePointer(e.pointerId);
            return;
        }
        if (key?.midiNote === heldNotes.current.get(e.pointerId)) {
            return;
        }
        if (key) {
            play(e.pointerId, key.midiNote, key.velocity);
        } else {
            releasePointer(e.pointerId);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.ctrlKey || e.altKey || e.metaKey) {
            return;
        }
        if (isPlayKey(e.key)) {
            e.preventDefault();
            if (!e.repeat) {
                play(
                    COMPUTER_KEYBOARD,
                    focusedNote,
                    COMPUTER_KEYBOARD_VELOCITY
                );
            }
            return;
        }
        const next = getSteppedNote(focusedNote, e.key);
        if (next === undefined) {
            return;
        }
        e.preventDefault();
        setFocusedNote(next);
        onKeyHover(next, COMPUTER_KEYBOARD_VELOCITY);
        e.currentTarget.children
            .item(next)
            ?.scrollIntoView({ block: "nearest", inline: "nearest" });
        // A held key follows the focus, like a finger sliding across the keys
        if (heldNotes.current.has(COMPUTER_KEYBOARD)) {
            play(COMPUTER_KEYBOARD, next, COMPUTER_KEYBOARD_VELOCITY);
        }
    };

    return (
        <div
            className="keyboard"
            role={"slider"}
            tabIndex={0}
            aria-label={t("keyboardLocale.keyboard")}
            aria-orientation={"horizontal"}
            aria-valuemin={0}
            aria-valuemax={KEY_COUNT - 1}
            aria-valuenow={focusedNote}
            aria-valuetext={getNoteName(focusedNote)}
            aria-keyshortcuts={"Space Enter"}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => {
                if (isPlayKey(e.key)) {
                    releasePointer(COMPUTER_KEYBOARD);
                }
            }}
            onBlur={() => releasePointer(COMPUTER_KEYBOARD)}
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
                    isPressed={keys.pressed[midiNote]}
                    isHighlighted={keys.highlighted[midiNote]}
                    isEnabled={keys.enabled[midiNote]}
                    isFocused={midiNote === focusedNote}
                />
            ))}
        </div>
    );
}
