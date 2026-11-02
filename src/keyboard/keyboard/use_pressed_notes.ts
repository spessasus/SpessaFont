import { useState } from "react";
import { useSynthEvent } from "../../hooks/use_synth_event.ts";

const NOTES_PER_CHANNEL = 128;

/**
 * Pressed notes on every channel as `channel * 128 + note`, so a note held on two channels stays
 * lit until both release it. Notes held before the keyboard mounted are not shown.
 */
export function usePressedNotes() {
    const [pressed, setPressed] = useState<ReadonlySet<number>>(new Set());
    useSynthEvent((e) => {
        switch (e.type) {
            case "noteOn": {
                const id = e.data.channel * NOTES_PER_CHANNEL + e.data.midiNote;
                setPressed((prev) =>
                    prev.has(id) ? prev : new Set(prev).add(id)
                );
                break;
            }

            case "noteOff": {
                const id = e.data.channel * NOTES_PER_CHANNEL + e.data.midiNote;
                setPressed((prev) => {
                    if (!prev.has(id)) {
                        return prev;
                    }
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                break;
            }

            case "stopAll": {
                const { channel } = e.data;
                setPressed((prev) => {
                    const next = new Set(
                        [...prev].filter(
                            (id) =>
                                Math.floor(id / NOTES_PER_CHANNEL) !== channel
                        )
                    );
                    return next.size === prev.size ? prev : next;
                });
                break;
            }
        }
    });
    return pressed;
}

export function getPressedNote(id: number) {
    return {
        channel: Math.floor(id / NOTES_PER_CHANNEL),
        midiNote: id % NOTES_PER_CHANNEL
    };
}
