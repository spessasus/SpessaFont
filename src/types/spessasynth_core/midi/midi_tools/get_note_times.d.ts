/**
 * Calculates all note times in seconds.
 * @this {BasicMIDI}
 * @param minDrumLength {number} the shortest a drum note (channel 10) can be, in seconds.
 * @returns {{
 *          midiNote: number,
 *          start: number,
 *          length: number,
 *          velocity: number,
 *      }[][]} an array of 16 channels, each channel containing its notes,
 *      with their key number, velocity, absolute start time and length in seconds.
 */
export function getNoteTimes(this: BasicMIDI, minDrumLength?: number): {
    midiNote: number;
    start: number;
    length: number;
    velocity: number;
}[][];
