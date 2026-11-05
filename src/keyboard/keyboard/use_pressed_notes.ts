import { useState } from "react";
import { useSynthEvent } from "../../hooks/use_synth_event.ts";

const NOTES_PER_CHANNEL = 128;

/**
 * Pressed notes on every channel as `channel * 128 + note`, so a note held on two channels stays
 * lit until both release it, each with the velocity it was pressed with. Notes held before the
 * keyboard mounted are not shown.
 */
export function usePressedNotes() {
    const [pressed, setPressed] = useState<ReadonlyMap<number, number>>(
        new Map()
    );
    useSynthEvent((e) => {
        switch (e.type) {
            case "noteOn": {
                const id = e.data.channel * NOTES_PER_CHANNEL + e.data.midiNote;
                const { velocity } = e.data;
                setPressed((prev) =>
                    prev.get(id) === velocity
                        ? prev
                        : new Map(prev).set(id, velocity)
                );
                break;
            }

            case "noteOff": {
                const id = e.data.channel * NOTES_PER_CHANNEL + e.data.midiNote;
                setPressed((prev) => {
                    if (!prev.has(id)) {
                        return prev;
                    }
                    const next = new Map(prev);
                    next.delete(id);
                    return next;
                });
                break;
            }

            case "stopAll": {
                const { channel } = e.data;
                setPressed((prev) => {
                    const next = new Map(
                        [...prev].filter(
                            ([id]) =>
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
