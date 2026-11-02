import { memo } from "react";
import { getKeyClassName } from "./piano_keys.ts";

interface PianoKeyProps {
    midiNote: number;
    isPressed: boolean;
    isHighlighted: boolean;
    isEnabled: boolean;
}

/**
 * Memoized because MIDI playback re-renders the keyboard on every note.
 */
export const PianoKey = memo(function PianoKey({
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
