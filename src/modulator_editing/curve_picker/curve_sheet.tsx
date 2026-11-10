import { useTranslation } from "react-i18next";
import { BottomSheet } from "../../phone_shell/bottom_sheet.tsx";
import { CurvePicture } from "./curve_picture.tsx";
import { getCurveLabel } from "./curve_label.ts";
import { ALL_CURVE_TYPES, curveKey } from "./curve_shape.ts";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import "./curve_sheet_phone.css";

interface CurveSheetProps {
    label: string;
    currentKey: string;
    onPick: (c: SpessaFontModulatorCurveType) => void;
    onClose: () => void;
}

/**
 * The phone's curve options, the 16 curves in a bottom sheet.
 */
export function CurveSheet({
    label,
    currentKey,
    onPick,
    onClose
}: CurveSheetProps) {
    const { t } = useTranslation();
    return (
        <BottomSheet title={label} onClose={onClose}>
            <div className="curve_sheet_grid" role="group" aria-label={label}>
                {ALL_CURVE_TYPES.map((c) => {
                    const key = curveKey(c);
                    const curveLabel = getCurveLabel(t, c);
                    return (
                        <button
                            type="button"
                            key={key}
                            aria-pressed={key === currentKey}
                            aria-label={curveLabel}
                            title={curveLabel}
                            className={`plain_button pretty_outline modulator_curve_pick curve_sheet_pick ${key === currentKey ? "selected" : ""}`}
                            onClick={() => onPick(c)}
                        >
                            <CurvePicture curve={c} />
                        </button>
                    );
                })}
            </div>
        </BottomSheet>
    );
}
