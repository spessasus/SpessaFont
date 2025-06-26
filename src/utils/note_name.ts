export function midiNoteToPitchClass(noteNumber: number): string {
    return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][
        noteNumber % 12
    ];
}
