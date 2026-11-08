import { useRef } from "react";
import { useSynthEvent } from "../hooks/use_synth_event.ts";
import { KEYBOARD_TARGET_CHANNEL } from "./target_channel.ts";

/**
 * Collects the keys played on the keyboard's channel (the drawer or the MIDI input) and calls
 * `onPlayed` with them every `count` notes, then starts over.
 */
export function useNextPlayedKeys(
    count: number,
    onPlayed: (keys: readonly number[]) => void
) {
    const keys = useRef(new Array<number>());
    useSynthEvent((event) => {
        if (
            event.type !== "noteOn" ||
            event.data.channel !== KEYBOARD_TARGET_CHANNEL
        ) {
            return;
        }
        keys.current.push(event.data.midiNote);
        if (keys.current.length < count) {
            return;
        }
        const played = keys.current;
        keys.current = [];
        onPlayed(played);
    });
}
