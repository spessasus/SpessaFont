import { ModulatorCurveTypes } from "spessasynth_core";
import type { SpessaFontModulatorCurveType } from "./curve_picker.tsx";

/**
 * The picture is drawn in a 100 by 100 view box.
 */
export const CURVE_VIEW_SIZE = 100;
const AXIS_MARGIN = 10;
const ARROW_HEAD_SIZE = 3;
const CURVE_MARGIN = 15;
const CURVE_SIZE = CURVE_VIEW_SIZE - CURVE_MARGIN * 2;

const concave = (v: number) => 1 - Math.sqrt(1 - v * v);
const convex = (v: number) => Math.sqrt(1 - (1 - v) * (1 - v));

/**
 * The output of a modulator source curve for an input from 0 to 1.
 * Unipolar curves output 0 to 1, bipolar ones -1 to 1.
 */
export function getCurveValue(
    { curveType, bipolar, positive }: SpessaFontModulatorCurveType,
    input: number
) {
    let value = positive ? input : 1 - input;
    switch (curveType) {
        case ModulatorCurveTypes.linear: {
            return bipolar ? value * 2 - 1 : value;
        }
        case ModulatorCurveTypes.switch: {
            value = value > 0.5 ? 1 : 0;
            return bipolar ? value * 2 - 1 : value;
        }
        case ModulatorCurveTypes.concave: {
            value = bipolar ? value * 2 - 1 : value;
            return value < 0 ? -concave(-value) : concave(value);
        }
        case ModulatorCurveTypes.convex: {
            value = bipolar ? value * 2 - 1 : value;
            return value < 0 ? -convex(-value) : convex(value);
        }
    }
}

/**
 * The curve as SVG polyline points, one per view box unit, with the output going up.
 */
export function getCurvePoints(curve: SpessaFontModulatorCurveType) {
    const points = new Array<string>();
    for (let i = 0; i <= CURVE_SIZE; i++) {
        const value = getCurveValue(curve, i / CURVE_SIZE);
        const height = curve.bipolar ? (value + 1) / 2 : value;
        const y = CURVE_MARGIN + (1 - height) * CURVE_SIZE;
        points.push(`${i + CURVE_MARGIN},${y}`);
    }
    return points.join(" ");
}

/**
 * The SVG path of the axes with arrow heads: crossing in the middle for bipolar curves, and
 * in the bottom left corner for unipolar ones.
 */
export function getAxisPath(isBipolar: boolean) {
    const end = CURVE_VIEW_SIZE - AXIS_MARGIN;
    const [originX, originY] = isBipolar
        ? [CURVE_VIEW_SIZE / 2, CURVE_VIEW_SIZE / 2]
        : [AXIS_MARGIN, end];
    const [xStart, yStart] = isBipolar
        ? [AXIS_MARGIN, end]
        : [0, CURVE_VIEW_SIZE];
    const a = ARROW_HEAD_SIZE;
    return [
        `M${xStart},${originY} H${end}`,
        `M${end - a},${originY - a} L${end},${originY} L${end - a},${originY + a}`,
        `M${originX},${yStart} V${AXIS_MARGIN}`,
        `M${originX - a},${AXIS_MARGIN + a} L${originX},${AXIS_MARGIN} L${originX + a},${AXIS_MARGIN + a}`
    ].join(" ");
}
