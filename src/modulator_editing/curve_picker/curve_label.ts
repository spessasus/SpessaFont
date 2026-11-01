import type { TFunction } from "i18next";
import { ModulatorCurveTypes } from "spessasynth_core";
import type { SpessaFontModulatorCurveType } from "./curve_picker.tsx";

const SHAPE_KEYS = {
    [ModulatorCurveTypes.linear]: "modulatorLocale.curves.linear",
    [ModulatorCurveTypes.concave]: "modulatorLocale.curves.concave",
    [ModulatorCurveTypes.convex]: "modulatorLocale.curves.convex",
    [ModulatorCurveTypes.switch]: "modulatorLocale.curves.switch"
} as const;

/**
 * A readable name for a curve, since the curve itself is only drawn on a canvas.
 */
export function getCurveLabel(
    t: TFunction,
    { curveType, bipolar, positive }: SpessaFontModulatorCurveType
) {
    return t("modulatorLocale.curves.label", {
        shape: t(SHAPE_KEYS[curveType]),
        polarity: t(
            bipolar
                ? "modulatorLocale.curves.bipolar"
                : "modulatorLocale.curves.unipolar"
        ),
        direction: t(
            positive
                ? "modulatorLocale.curves.positive"
                : "modulatorLocale.curves.negative"
        )
    });
}
