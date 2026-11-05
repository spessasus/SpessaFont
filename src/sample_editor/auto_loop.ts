/**
 * The audio around both loop points that has to match, in seconds on each side.
 */
const MATCH_SECONDS = 0.01;
/**
 * The shortest loop, in seconds and as a part of the sample. Short loops buzz.
 */
const MIN_LOOP_SECONDS = 0.05;
const MIN_LOOP_PART = 0.2;
/**
 * The loop starts after the attack and ends near the end of the sample.
 */
const START_FROM_PART = 0.15;
const END_FROM_PART = 0.7;
const MAX_END_CANDIDATES = 16;
const MAX_START_CANDIDATES = 1500;
/**
 * Among loops that match about as well, a longer loop wins by up to this part of the cost.
 */
const LENGTH_PREFERENCE = 0.3;
const MAX_FADE_SECONDS = 0.1;

export interface LoopPoints {
    start: number;
    end: number;
}

/**
 * Rising zero crossings in [from, to), at most `max` of them, evenly picked.
 * Audio without crossings (silence, DC) gets evenly spaced positions instead.
 */
function getCandidates(
    data: Float32Array,
    from: number,
    to: number,
    max: number
) {
    const crossings = new Array<number>();
    for (let i = Math.max(from, 1); i < to; i++) {
        if (data[i - 1] < 0 && data[i] >= 0) {
            crossings.push(i);
        }
    }
    const positions =
        crossings.length > 0
            ? crossings
            : Array.from({ length: to - from }, (_, i) => from + i);
    return positions.length <= max
        ? positions
        : Array.from(
              { length: max },
              (_, i) => positions[Math.floor((positions.length * i) / max)]
          );
}

/**
 * How different the audio around the two points is, from 0 (the same) up. Scaled by the
 * energy, so quiet and loud samples compare alike.
 */
function getMismatch(
    data: Float32Array,
    start: number,
    end: number,
    window: number
) {
    let difference = 0;
    let energy = 1e-12;
    for (let k = -window; k < window; k++) {
        const a = data[start + k];
        const b = data[end + k];
        difference += (a - b) * (a - b);
        energy += a * a + b * b;
    }
    return difference / energy;
}

/**
 * Finds loop points where the audio continues smoothly from the end back to the start.
 * The start is a sample that follows the end well. Returns undefined when the audio is too
 * short to hold a loop.
 */
export function findLoopPoints(
    data: Float32Array,
    sampleRate: number
): LoopPoints | undefined {
    const length = data.length;
    const window = Math.max(16, Math.round(sampleRate * MATCH_SECONDS));
    const minLoop = Math.max(
        Math.round(sampleRate * MIN_LOOP_SECONDS),
        Math.round(length * MIN_LOOP_PART)
    );
    const startFrom = Math.max(window, Math.round(length * START_FROM_PART));
    const endTo = length - window;
    const endFrom = Math.max(
        Math.round(length * END_FROM_PART),
        startFrom + minLoop
    );
    if (endFrom >= endTo) {
        return undefined;
    }
    const longest = endTo - startFrom;

    let best: LoopPoints | undefined;
    let bestCost = Infinity;
    for (const end of getCandidates(data, endFrom, endTo, MAX_END_CANDIDATES)) {
        const starts = getCandidates(
            data,
            startFrom,
            end - minLoop + 1,
            MAX_START_CANDIDATES
        );
        for (const start of starts) {
            const shortness = 1 - (end - start) / longest;
            const cost =
                getMismatch(data, start, end, window) *
                (1 + LENGTH_PREFERENCE * shortness);
            if (cost >= bestCost) {
                continue;
            }
            bestCost = cost;
            best = { start, end };
        }
    }
    return best;
}

/**
 * The crossfade fits before the start and inside the loop.
 */
export function getFadeLength({ start, end }: LoopPoints, sampleRate: number) {
    return Math.min(
        Math.round(sampleRate * MAX_FADE_SECONDS),
        Math.floor((end - start) / 2),
        start
    );
}

/**
 * Blends the end of the loop into the audio just before its start, so the jump from the end
 * back to the start continues the audio without a click. Returns new audio.
 */
export function crossfadeLoop(
    data: Float32Array,
    { start, end }: LoopPoints,
    fadeLength: number
) {
    const out = data.slice();
    for (let i = 0; i < fadeLength; i++) {
        // Raised cosine, which keeps the level of matching audio
        const fade = 0.5 - 0.5 * Math.cos((Math.PI * (i + 1)) / fadeLength);
        const at = end - fadeLength + i;
        out[at] = data[at] * (1 - fade) + data[start - fadeLength + i] * fade;
    }
    return out;
}
