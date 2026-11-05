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
    // C keys show their octave so the keyboard can be read, with C4 as middle C (60)
    return (
        <div className={className} data-note={midiNote}>
            {midiNote % 12 === 0 ? (
                <span className={"key_label"}>{`C${midiNote / 12 - 1}`}</span>
            ) : null}
        </div>
    );
});
