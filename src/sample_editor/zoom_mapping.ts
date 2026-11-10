const ZOOM_PER_SAMPLE = 50_000 / 6_000_000;
const MIN_MAX_ZOOM = 5;
/**
 * Browsers cap the size of an element (Firefox near 17.9 million pixels), and the scroll range
 * is the view's width times the zoom. This keeps it below that on a 4K wide view.
 */
const MAX_ZOOM = 4000;
/**
 * The zoom slider maps to the zoom exponentially, so small zooms get most of its range.
 */
const ZOOM_CURVE = 5;

/**
 * How far a sample can zoom in. Longer samples can zoom in further.
 */
export function getMaxZoom(sampleLength: number) {
    return Math.min(
        MAX_ZOOM,
        Math.max(MIN_MAX_ZOOM, ZOOM_PER_SAMPLE * sampleLength + 1)
    );
}

/**
 * The zoom of a zoom slider value (100 is no zoom).
 */
export function getSliderZoom(value: number, maxZoom: number) {
    const mapped = (value / 100 - 1) / (maxZoom - 1);
    return Math.pow(mapped, ZOOM_CURVE) * (maxZoom - 1) + 1;
}

/**
 * The zoom slider value of a zoom, the inverse of `getSliderZoom`, so the slider follows a
 * zoom made elsewhere (a pinch).
 */
export function getSliderValue(zoom: number, maxZoom: number) {
    const mapped = Math.pow((zoom - 1) / (maxZoom - 1), 1 / ZOOM_CURVE);
    return (mapped * (maxZoom - 1) + 1) * 100;
}

/**
 * The largest zoom a pinch may reach: the slider's top. The slider's mapping stops short of
 * `getMaxZoom` (near 2x for short samples), and a pinch past it would push the slider off its track.
 */
export function getPinchMaxZoom(sampleLength: number) {
    const maxZoom = getMaxZoom(sampleLength);
    return getSliderZoom((maxZoom - 1) * 100, maxZoom);
}
