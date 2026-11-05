/**
 * Which part of the sample the wave view shows. The whole sample spans `width * zoom` CSS
 * pixels, scrolled left by `scrollX` pixels.
 */
export interface WaveViewport {
    sampleCount: number;
    width: number;
    zoom: number;
    scrollX: number;
}

/**
 * The x coordinate of a sample index in the view.
 */
export function sampleToX(
    { sampleCount, width, zoom, scrollX }: WaveViewport,
    sample: number
) {
    return (sample / Math.max(sampleCount, 1)) * width * zoom - scrollX;
}

/**
 * The nearest sample index to an x coordinate in the view, inside the sample.
 */
export function xToSample(
    { sampleCount, width, zoom, scrollX }: WaveViewport,
    x: number
) {
    const sample = Math.round(((x + scrollX) / (width * zoom)) * sampleCount);
    return Math.max(0, Math.min(sampleCount, sample));
}

export interface PlayheadOptions {
    /**
     * Seconds of the sample played so far.
     */
    elapsed: number;
    isLooped: boolean;
    loopStart: number;
    loopEnd: number;
    sampleRate: number;
    /**
     * The sample's length in sample points.
     */
    sampleCount: number;
}

/**
 * The sample index being played after `elapsed` seconds. Looped playback wraps at the loop end.
 */
export function getPlayheadSample({
    elapsed,
    isLooped,
    loopStart,
    loopEnd,
    sampleRate,
    sampleCount
}: PlayheadOptions) {
    const played = Math.max(0, elapsed) * sampleRate;
    if (!isLooped) {
        return played;
    }
    // Web Audio's loop rules: an end past the sample (or none) is the sample's end,
    // and a loop that is empty or backwards loops the whole sample
    let start = Math.max(0, loopStart);
    let end = loopEnd <= 0 || loopEnd > sampleCount ? sampleCount : loopEnd;
    if (start >= end) {
        start = 0;
        end = sampleCount;
    }
    const loopLength = end - start;
    return loopLength > 0 && played >= end
        ? start + ((played - start) % loopLength)
        : played;
}
