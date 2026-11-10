import { clamp } from "../../generator_table/generator_range.ts";

/**
 * The width and height of a loop handle's hit box, in CSS pixels.
 */
export const HANDLE_SIZE = 44;
/**
 * How far a hit box stays from the wave's edges, so a point at the start or the end of the
 * sample is not under Android's back gesture strip.
 */
export const EDGE_INSET = 16;
/**
 * How far each of two close handles moves away from the other.
 */
const NUDGE = 8;

export type LoopHandle = "start" | "end";

/**
 * The left of a hit box centered on the line, kept inside the edge inset.
 */
export function getHandleLeft(lineX: number, viewWidth: number) {
    return clamp(
        lineX - HANDLE_SIZE / 2,
        EDGE_INSET,
        viewWidth - EDGE_INSET - HANDLE_SIZE
    );
}

/**
 * Two handles closer than a hit box move apart sideways, so both stay reachable. The last
 * touched one is drawn on top, the start by default.
 */
export function getHandleOffsets(
    startX: number,
    endX: number,
    lastTouched: LoopHandle | null
) {
    const isClose = Math.abs(endX - startX) < HANDLE_SIZE;
    return {
        start: isClose ? -NUDGE : 0,
        end: isClose ? NUDGE : 0,
        top: lastTouched ?? "start"
    };
}

/**
 * The lefts of both hit boxes as the layer draws them: moved apart when close, then kept
 * inside the edge inset. Two boxes pinned to the same edge sit side by side from it, the
 * start first, so the clamp never stacks them.
 */
export function getHandleLefts(
    startX: number,
    endX: number,
    viewWidth: number,
    lastTouched: LoopHandle | null
) {
    const offsets = getHandleOffsets(startX, endX, lastTouched);
    const min = EDGE_INSET;
    const max = viewWidth - EDGE_INSET - HANDLE_SIZE;
    let start = getHandleLeft(startX + offsets.start, viewWidth);
    let end = getHandleLeft(endX + offsets.end, viewWidth);
    if (start === min && end === min) {
        end = min + HANDLE_SIZE;
    } else if (start === max && end === max) {
        start = max - HANDLE_SIZE;
    } else if (end - start < 2 * NUDGE) {
        // The clamp ate the offset of the handle at the edge, so the other one gives way
        if (end === max) {
            start = Math.max(min, end - 2 * NUDGE);
        } else {
            end = Math.min(max, start + 2 * NUDGE);
        }
    }
    return { start, end, top: offsets.top };
}

/**
 * The left of the readout above a dragged handle, kept inside the view.
 */
export function getReadoutLeft(
    handleCenterX: number,
    readoutWidth: number,
    viewWidth: number
) {
    return clamp(
        handleCenterX - readoutWidth / 2,
        0,
        Math.max(0, viewWidth - readoutWidth)
    );
}

/**
 * Whether a loop line is in the view. A handle of a point scrolled out is not drawn.
 */
export function isHandleVisible(lineX: number, viewWidth: number) {
    return lineX >= 0 && lineX <= viewWidth;
}
