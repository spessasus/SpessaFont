/**
 * Frames per block in the finest level.
 */
const BASE_BLOCK = 64;
/**
 * Blocks of one level that make one block of the next.
 */
const LEVEL_FACTOR = 8;

export interface PeakLevel {
    readonly blockSize: number;
    readonly min: Float32Array;
    readonly max: Float32Array;
}

/**
 * The lowest and highest value of the audio per block, in levels of growing block size. Built
 * once per audio, it lets the wave view find the peaks of a pixel's frames without visiting
 * them all, so a redraw costs about the canvas width, not the frames in view.
 */
export function buildPeaks(data: Float32Array) {
    const levels = new Array<PeakLevel>();
    let blockSize = BASE_BLOCK;
    let count = Math.ceil(data.length / blockSize);
    let min = new Float32Array(count);
    let max = new Float32Array(count);
    for (let block = 0; block < count; block++) {
        const end = Math.min(data.length, (block + 1) * blockSize);
        let low = Infinity;
        let high = -Infinity;
        for (let i = block * blockSize; i < end; i++) {
            low = Math.min(low, data[i]);
            high = Math.max(high, data[i]);
        }
        min[block] = low;
        max[block] = high;
    }
    levels.push({ blockSize, min, max });

    while (count > 1) {
        const previous = { min, max, count };
        blockSize *= LEVEL_FACTOR;
        count = Math.ceil(previous.count / LEVEL_FACTOR);
        min = new Float32Array(count);
        max = new Float32Array(count);
        for (let block = 0; block < count; block++) {
            const end = Math.min(previous.count, (block + 1) * LEVEL_FACTOR);
            let low = Infinity;
            let high = -Infinity;
            for (let i = block * LEVEL_FACTOR; i < end; i++) {
                low = Math.min(low, previous.min[i]);
                high = Math.max(high, previous.max[i]);
            }
            min[block] = low;
            max[block] = high;
        }
        levels.push({ blockSize, min, max });
    }
    return levels;
}

export interface Peak {
    min: number;
    max: number;
}

/**
 * Widens `peak` to the frames from `start` to `end` (exclusive): whole blocks of the level,
 * the frames around them from the finer levels, and the frames themselves below the finest.
 */
function addRange(
    data: Float32Array,
    levels: readonly PeakLevel[],
    level: number,
    start: number,
    end: number,
    peak: Peak
) {
    if (start >= end) {
        return;
    }
    if (level < 0) {
        for (let i = start; i < end; i++) {
            peak.min = Math.min(peak.min, data[i]);
            peak.max = Math.max(peak.max, data[i]);
        }
        return;
    }
    const { blockSize, min, max } = levels[level];
    const first = Math.ceil(start / blockSize);
    const last = Math.floor(end / blockSize);
    if (first >= last) {
        addRange(data, levels, level - 1, start, end, peak);
        return;
    }
    addRange(data, levels, level - 1, start, first * blockSize, peak);
    for (let block = first; block < last; block++) {
        peak.min = Math.min(peak.min, min[block]);
        peak.max = Math.max(peak.max, max[block]);
    }
    addRange(data, levels, level - 1, last * blockSize, end, peak);
}

/**
 * Widens `peak` to the lowest and highest value of the frames from `start` to `end` (exclusive).
 */
export function addPeak(
    data: Float32Array,
    levels: readonly PeakLevel[],
    start: number,
    end: number,
    peak: Peak
) {
    // The coarsest level whose blocks fit in the range, finer ones fill its edges
    let level = levels.length - 1;
    while (level >= 0 && levels[level].blockSize > end - start) {
        level--;
    }
    addRange(data, levels, level, start, end, peak);
}
