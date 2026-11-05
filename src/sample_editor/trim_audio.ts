/**
 * Audio quieter than this (-60 dBFS) counts as silence before the sound starts.
 */
export const SILENCE_THRESHOLD = 0.001;

/**
 * How far back from the start of the sound a cut may move to reach a zero crossing.
 */
const ZERO_CROSSING_SECONDS = 0.002;

/**
 * Frames kept after the loop end, as some players read a few past it to interpolate.
 */
export const LOOP_TAIL_FRAMES = 8;

/**
 * Where the sound starts: the first frame at the threshold or louder, moved back to the closest
 * zero crossing within 2 ms so the cut does not click. Undefined for silent audio.
 */
export function findSoundStart(data: Float32Array, sampleRate: number) {
    const start = data.findIndex((v) => Math.abs(v) >= SILENCE_THRESHOLD);
    if (start === -1) {
        return undefined;
    }
    const limit = Math.max(
        0,
        start - Math.round(ZERO_CROSSING_SECONDS * sampleRate)
    );
    for (let i = start; i > limit; i--) {
        const previous = data[i - 1];
        if (previous === 0 || Math.sign(previous) !== Math.sign(data[i])) {
            // The frame before the sign change is the one nearer to zero
            return Math.abs(previous) <= Math.abs(data[i]) ? i - 1 : i;
        }
    }
    return start;
}

export interface LoopPoints {
    loopStart: number;
    loopEnd: number;
}

/**
 * Whether the loop is a real one, not empty and not just the whole sample (what imported
 * audio gets), which a trim may cut into.
 */
function isRealLoop({ loopStart, loopEnd }: LoopPoints, length: number) {
    return loopEnd > loopStart && !(loopStart === 0 && loopEnd >= length);
}

/**
 * How many frames to remove from the start of channels that play together, so both lose the
 * same amount: up to the earliest start of the sound, and never past a loop start.
 * Undefined when all channels are silent.
 */
export function getSilenceCut(
    channels: readonly Float32Array[],
    sampleRate: number,
    loops: readonly LoopPoints[]
) {
    const starts = channels
        .map((data) => findSoundStart(data, sampleRate))
        .filter((start) => start !== undefined);
    if (starts.length === 0) {
        return undefined;
    }
    let cut = Math.min(...starts);
    for (const [i, loop] of loops.entries()) {
        if (isRealLoop(loop, channels[i].length)) {
            cut = Math.min(cut, loop.loopStart);
        }
    }
    return cut;
}

/**
 * The loop points after removing frames from the start. A loop of the whole sample keeps
 * covering it, an empty loop stays empty at the start.
 */
export function shiftLoop(loop: LoopPoints, length: number, cut: number) {
    const newLength = length - cut;
    if (!isRealLoop(loop, length)) {
        return {
            loopStart: 0,
            loopEnd: loop.loopEnd > loop.loopStart ? newLength : 0
        };
    }
    return { loopStart: loop.loopStart - cut, loopEnd: loop.loopEnd - cut };
}

/**
 * The length that keeps the loop and a short tail after it, or undefined when there is no loop
 * or nothing past the tail to remove.
 */
export function getTrimmedLength(
    { loopStart, loopEnd }: LoopPoints,
    length: number
) {
    return loopEnd <= loopStart || loopEnd + LOOP_TAIL_FRAMES >= length
        ? undefined
        : loopEnd + LOOP_TAIL_FRAMES;
}
