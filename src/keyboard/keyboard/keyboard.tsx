import {
    type RefObject,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef
} from "react";
import "./keyboard.css";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";
import type { SoundFontRange } from "spessasynth_core";

function isBlackNoteNumber(midiNote: number) {
    const pitchClass = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(pitchClass);
}

export type KeyboardRef = {
    clearAll: () => void;
    pressNote: (midiNote: number) => void;
    releaseNote: (midiNote: number) => void;
} | null;

const pressedKeys: Set<number> = new Set();
let mouseHeld = false;

// most of this code is ported over from spessasynth web app
export function Keyboard({
    engine,
    ref,
    keyDisplay,
    velocityDisplay,
    splits
}: {
    engine: AudioEngine;
    ref: RefObject<KeyboardRef | null>;
    keyDisplay: RefObject<HTMLSpanElement | null>;
    velocityDisplay: RefObject<HTMLSpanElement | null>;
    splits: SoundFontRange[];
}) {
    const keysRef = useRef<HTMLDivElement[]>([]);
    const keyboardRef = useRef<HTMLDivElement | null>(null);

    const matchingSplits = useMemo(() => {
        const map: SoundFontRange[][] = [];
        for (let midiNote = 0; midiNote < 128; midiNote++) {
            // find all splits tha this key belongs to
            map.push(
                splits.reduce((matched: SoundFontRange[], split) => {
                    if (split.min <= midiNote && split.max >= midiNote) {
                        matched.push(split);
                    }
                    return matched;
                }, [])
            );
        }
        return map;
    }, [splits]);

    useImperativeHandle(ref, () => ({
        clearAll() {
            pressedKeys.clear();
            for (const key of keysRef.current) {
                key.classList.remove("pressed");
            }
        },

        pressNote(midiNote: number) {
            pressedKeys.add(midiNote);
            keysRef?.current?.[midiNote]?.classList?.add("pressed");
        },

        releaseNote(midiNote: number) {
            pressedKeys.delete(midiNote);
            keysRef?.current?.[midiNote]?.classList?.remove("pressed");
        }
    }));

    useEffect(() => {
        const userNoteOff = (note: number) => {
            // processor callback will trigger the note release
            engine.processor.noteOff(KEYBOARD_TARGET_CHANNEL, note);
            // find all splits tha this key belongs to
            matchingSplits[note].forEach((split) => {
                for (let i = split.min; i <= split.max; i++) {
                    keysRef?.current?.[i]?.classList?.remove("zone_highlight");
                }
            });
        };

        const userNoteOn = (note: number, velocity: number) => {
            engine.processor.noteOn(KEYBOARD_TARGET_CHANNEL, note, velocity);
            matchingSplits[note].forEach((split) => {
                for (let i = split.min; i <= split.max; i++) {
                    keysRef?.current?.[i]?.classList?.add("zone_highlight");
                }
            });
        };

        const moveHandler = (e: MouseEvent) => {
            const touches = [e];

            const newTouchedKeys = new Set<number>();
            const toUserOn: { k: number; v: number }[] = [];

            touches.forEach((touch) => {
                const target = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                );

                if (!target || !target.id.startsWith("note")) {
                    return;
                }

                const midiNote = parseInt(target.id.replace("note", ""));
                if (isNaN(midiNote) || midiNote < 0) {
                    return;
                }

                const keyElement = keysRef.current[0]; // All keys same top
                if (!keyElement) {
                    return;
                }

                const rect = keyElement.getBoundingClientRect();

                const relativeMouseY = touch.clientY - rect.top;
                const keyHeight = isBlackNoteNumber(midiNote)
                    ? rect.height * 0.7
                    : rect.height;
                const velocity = Math.min(
                    127,
                    Math.floor((relativeMouseY / keyHeight) * 128)
                );
                if (keyDisplay.current) {
                    keyDisplay.current.textContent = midiNote
                        .toString()
                        .padStart(3, " ");
                }
                if (velocityDisplay.current) {
                    velocityDisplay.current.textContent = velocity
                        .toString()
                        .padStart(3, " ");
                }

                if (!mouseHeld) {
                    return;
                }

                newTouchedKeys.add(midiNote);

                if (!pressedKeys.has(midiNote)) {
                    toUserOn.push({ k: midiNote, v: velocity });
                }
            });

            if (!mouseHeld) {
                return;
            }

            // only release keys that are no longer being touched
            pressedKeys.forEach((note) => {
                if (!newTouchedKeys.has(note)) {
                    userNoteOff(note);
                }
            });

            // press the keys after
            toUserOn.forEach((n) => {
                userNoteOn(n.k, n.v);
            });
        };

        const onMouseDown = (e: MouseEvent) => {
            mouseHeld = true;
            moveHandler(e);
        };

        const onMouseUp = () => {
            mouseHeld = false;
            pressedKeys.forEach((note) => userNoteOff(note));
        };

        const onMouseMove = (e: MouseEvent) => {
            moveHandler(e);
        };

        const onMouseLeave = () => {
            pressedKeys.forEach((note) => userNoteOff(note));
        };

        const kb = keyboardRef.current;
        if (!kb) {
            return;
        }

        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("mouseup", onMouseUp);
        kb.addEventListener("mousemove", onMouseMove);
        kb.addEventListener("mouseleave", onMouseLeave);

        // cleanup
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("mouseup", onMouseUp);
            kb.removeEventListener("mousemove", onMouseMove);
            kb.removeEventListener("mouseleave", onMouseLeave);
        };
    }, [engine.processor, keyDisplay, matchingSplits, velocityDisplay]);

    const keys: number[] = Array.from({ length: 128 }, (_, i) => i);

    const enabledKeys: boolean[] = useMemo(() => {
        if (splits.length === 0) {
            return Array(128).fill(true);
        }
        const e: boolean[] = Array(128).fill(false);

        splits.forEach((s) => {
            for (let i = s.min; i <= s.max; i++) {
                e[i] ||= true;
            }
        });
        return e;
    }, [splits]);

    return (
        <div className="keyboard" ref={keyboardRef}>
            {keys.map((midiNote) => {
                let className = "key";
                if (!enabledKeys[midiNote]) {
                    className += " disabled";
                }
                if (isBlackNoteNumber(midiNote)) {
                    className += " sharp_key";
                } else {
                    className += " flat_key";
                    let blackNoteLeft = false;
                    let blackNoteRight = false;
                    if (midiNote >= 0) {
                        blackNoteLeft = isBlackNoteNumber(midiNote - 1);
                    }
                    if (midiNote < 127) {
                        blackNoteRight = isBlackNoteNumber(midiNote + 1);
                    }

                    if (blackNoteLeft && blackNoteRight) {
                        className += " between_sharps";
                    } else if (blackNoteLeft) {
                        className += " left_sharp";
                    } else if (blackNoteRight) {
                        className += " right_sharp";
                    }
                }
                return (
                    <div
                        className={className}
                        id={`note${midiNote}`}
                        key={midiNote}
                        ref={(el) => {
                            if (el) {
                                keysRef.current[midiNote] = el;
                            }
                        }}
                    />
                );
            })}
        </div>
    );
}
