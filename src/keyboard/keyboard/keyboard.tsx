import type * as React from "react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./keyboard.css";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import type { GenericRange } from "spessasynth_core";
import { useAudioEngine } from "../../core_backend/audio_engine_context.ts";
import { usePressedNotes } from "./use_pressed_notes.ts";
import { findKey, getKeyStates, NOTES } from "./piano_keys.ts";
import { PianoKey } from "./piano_key.tsx";

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

    const keys = getKeyStates(pressedNotes, splits);

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
                    isPressed={keys.pressed[midiNote]}
                    isHighlighted={keys.highlighted[midiNote]}
                    isEnabled={keys.enabled[midiNote]}
                />
            ))}
        </div>
    );
}
