import { useTranslation } from "react-i18next";
import { CurvePicture } from "./curve_picture.tsx";
import { getCurveLabel } from "./curve_label.ts";
import { ALL_CURVE_TYPES, curveKey } from "./curve_shape.ts";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";

interface StandardCurvesProps {
    currentKey: string;
    /**
     * The layout's classes of one curve button.
     */
    pickClassName: string;
    onPick: (c: SpessaFontModulatorCurveType) => void;
}

/**
 * The 16 standard curves as buttons, for the desktop options and the phone sheet.
 */
export function StandardCurves({
    currentKey,
    pickClassName,
    onPick
}: StandardCurvesProps) {
    const { t } = useTranslation();
    return (
        <>
            {ALL_CURVE_TYPES.map((c) => {
                const key = curveKey(c);
                const curveLabel = getCurveLabel(t, c);
                return (
                    <button
                        type={"button"}
                        key={key}
                        aria-pressed={key === currentKey}
                        aria-label={curveLabel}
                        title={curveLabel}
                        className={`${pickClassName} ${key === currentKey ? "selected" : ""}`}
                        onClick={() => onPick(c)}
                    >
                        <CurvePicture curve={c} />
                    </button>
                );
            })}
        </>
    );
}
