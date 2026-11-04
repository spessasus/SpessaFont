const PITCH_CLASSES: Record<string, number> = {
    c: 0,
    d: 2,
    e: 4,
    f: 5,
    g: 7,
    a: 9,
    b: 11
};

/**
 * A note name like "C4", "F#2", "Bb3", "Cs4" or "A-1" as its own word, so "Bass" or "Echo" do not
 * match. C4 is 60, as in scientific pitch notation.
 */
const NOTE_NAME = /(?:^|[^a-z0-9])([a-g])(#|♯|s|b|♭)?(-?\d)(?![0-9])/gi;

/**
 * A MIDI note number as its own word. Only 21 to 108 (the piano's keys), so a take number like
 * "Violin 01" is not read as a key.
 */
const NOTE_NUMBER = /(?:^|[^a-z0-9])(\d{2,3})(?![0-9])/gi;
const SHARPS = new Set(["#", "♯", "s"]);
const FLATS = new Set(["b", "♭"]);
const MIN_NUMBER_KEY = 21;
const MAX_NUMBER_KEY = 108;

/**
 * The MIDI key a sample name gives, or undefined when it has none. A note name wins over a
 * number, and the last one in the name wins, as a name like "Grand C4 v2" ends with the note.
 */
export function getRootKeyFromName(name: string) {
    const notes = Array.from(name.matchAll(NOTE_NAME));
    const note = notes.at(-1);
    if (note) {
        const [, letter, accidental = "", octave] = note;
        let key =
            PITCH_CLASSES[letter.toLowerCase()] + (Number(octave) + 1) * 12;
        if (SHARPS.has(accidental)) {
            key++;
        } else if (FLATS.has(accidental)) {
            key--;
        }
        return key >= 0 && key <= 127 ? key : undefined;
    }
    const numbers = Array.from(name.matchAll(NOTE_NUMBER), (m) =>
        Number(m[1])
    ).filter((n) => n >= MIN_NUMBER_KEY && n <= MAX_NUMBER_KEY);
    return numbers.at(-1);
}
