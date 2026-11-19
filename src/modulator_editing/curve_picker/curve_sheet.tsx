import type { CustomCurveView } from "../../core_backend/entity_views.ts";
import { BottomSheet } from "../../phone_shell/bottom_sheet.tsx";
import { CurveChooser } from "./curve_chooser.tsx";
import { curveKey } from "./curve_shape.ts";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import { StandardCurves } from "./standard_curves.tsx";
import "./curve_sheet_phone.css";

const PICK_CLASS =
    "plain_button pretty_outline modulator_curve_pick curve_sheet_pick";

interface CurveSheetProps {
    label: string;
    current: SpessaFontModulatorCurveType;
    isSFe: boolean;
    customCurves: readonly CustomCurveView[];
    onPick: (c: SpessaFontModulatorCurveType) => void;
    onChange: (c: SpessaFontModulatorCurveType) => void;
    onClose: () => void;
}

/**
 * The phone's curve options in a bottom sheet: the 16 standard curves, and in SFe mode the
 * bank's custom ones too.
 */
export function CurveSheet({
    label,
    current,
    isSFe,
    customCurves,
    onPick,
    onChange,
    onClose
}: CurveSheetProps) {
    return (
        <BottomSheet title={label} onClose={onClose}>
            {isSFe ? (
                <div role="group" aria-label={label}>
                    <CurveChooser
                        current={current}
                        customCurves={customCurves}
                        gridClassName="curve_sheet_grid"
                        pickClassName={PICK_CLASS}
                        onPick={onPick}
                        onChange={onChange}
                    />
                </div>
            ) : (
                <div
                    className="curve_sheet_grid"
                    role="group"
                    aria-label={label}
                >
                    <StandardCurves
                        currentKey={curveKey(current)}
                        pickClassName={PICK_CLASS}
                        onPick={onPick}
                    />
                </div>
            )}
        </BottomSheet>
    );
}
