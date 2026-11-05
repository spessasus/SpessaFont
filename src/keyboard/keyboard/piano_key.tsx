import { memo } from "react";
import { getKeyClassName, getNoteName } from "./piano_keys.ts";

interface PianoKeyProps {
    midiNote: number;
    isPressed: boolean;
    isHighlighted: boolean;
    isEnabled: boolean;
    /**
     * The key the computer keyboard plays, outlined while the piano has the focus.
     */
    isFocused: boolean;
}

/**
 * Memoized because MIDI playback re-renders the keyboard on every note.
 */
export const PianoKey = memo(function PianoKey({
    midiNote,
    isPressed,
    isHighlighted,
    isEnabled,
    isFocused
}: PianoKeyProps) {
    let className = getKeyClassName(midiNote);
    if (!isEnabled) {
        className += " key_disabled";
    }
    if (isHighlighted) {
        className += " zone_highlight";
    }
    if (isPressed) {
        className += " pressed";
    }
    if (isFocused) {
        className += " focused";
    }
    // C keys show their octave so the keyboard can be read, with C4 as middle C (60)
    return (
        <div className={className} data-note={midiNote}>
            {midiNote % 12 === 0 ? (
                <span className={"key_label"}>{getNoteName(midiNote)}</span>
            ) : null}
        </div>
    );
});
