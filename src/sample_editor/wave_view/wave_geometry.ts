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
}

/**
 * The sample index being played after `elapsed` seconds. Looped playback wraps at the loop end.
 */
export function getPlayheadSample({
    elapsed,
    isLooped,
    loopStart,
    loopEnd,
    sampleRate
}: PlayheadOptions) {
    const played = Math.max(0, elapsed) * sampleRate;
    const loopLength = loopEnd - loopStart;
    const isWrapping = isLooped && loopLength > 0 && played >= loopEnd;
    return isWrapping
        ? loopStart + ((played - loopStart) % loopLength)
        : played;
}
