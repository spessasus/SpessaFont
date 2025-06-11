import { type Ref, useEffect, useImperativeHandle, useRef } from "react";
import "./keyboard.css";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { KEYBOARD_TARGET_CHANNEL } from "../target_channel.ts";

function isBlackNoteNumber(midiNote: number) {
    const pitchClass = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(pitchClass);
}

export type KeyboardPressRef = {
    clearAll: () => void;
    pressNote: (midiNote: number) => void;
    releaseNote: (midiNote: number) => void;
};

const pressedKeys: Set<number> = new Set();
let mouseHeld = false;

// most of this code is ported over from spessasynth web app
export function Keyboard({
    engine,
    ref
}: {
    engine: AudioEngine;
    ref: Ref<KeyboardPressRef>;
}) {
    const keysRef = useRef<HTMLDivElement[]>([]);
    const keyboardRef = useRef<HTMLDivElement | null>(null);

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
        };

        const userNoteOn = (note: number, touch: Touch | MouseEvent) => {
            const keyElement = keysRef.current[0]; // All keys same top
            if (!keyElement) {
                return;
            }

            const rect = keyElement.getBoundingClientRect();

            const relativeMouseY = touch.clientY - rect.top;
            const keyHeight = isBlackNoteNumber(note)
                ? rect.height * 0.7
                : rect.height;
            const velocity = Math.floor((relativeMouseY / keyHeight) * 127);

            engine.processor.noteOn(KEYBOARD_TARGET_CHANNEL, note, velocity);
        };

        const moveHandler = (e: MouseEvent) => {
            const touches = [e];

            const newTouchedKeys = new Set<number>();

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

                newTouchedKeys.add(midiNote);

                if (!pressedKeys.has(midiNote)) {
                    userNoteOn(midiNote, touch);
                }
            });

            // only release keys that are no longer being touched
            [...pressedKeys].forEach((note) => {
                if (!newTouchedKeys.has(note)) {
                    userNoteOff(note);
                }
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
            if (mouseHeld) {
                moveHandler(e);
            }
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
    }, [engine.processor]);

    const keys: number[] = Array.from({ length: 128 }, (_, i) => i);

    return (
        <div className="keyboard" ref={keyboardRef}>
            {keys.map((midiNote) => {
                let className = "key";
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
