import { clamp } from "../generator_table/generator_range.ts";

/**
 * A loop point moved to `point`, rounded and kept on its side of the other point and inside
 * the sample. The steppers, the desktop clicks and the phone's loop handles all fit with it.
 * @param property which point moves
 * @param point the wanted sample index
 * @param loop the sample's loop as it is
 * @param sampleLength the sample's length in sample points
 */
export function fitLoopPoint(
    property: "loopStart" | "loopEnd",
    point: number,
    loop: { loopStart: number; loopEnd: number },
    sampleLength: number
) {
    const rounded = Math.round(point);
    return property === "loopStart"
        ? clamp(rounded, 0, Math.min(loop.loopEnd, sampleLength - 1))
        : clamp(rounded, Math.max(loop.loopStart, 0), sampleLength);
}
