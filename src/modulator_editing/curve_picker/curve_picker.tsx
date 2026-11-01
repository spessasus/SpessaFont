import { type ModulatorCurveType, ModulatorCurveTypes } from "spessasynth_core";
import "./curve_picker.css";
import { useTranslation } from "react-i18next";
import { ModulatorCurvePicture } from "./curve_picture.tsx";
import { getCurveLabel } from "./curve_label.ts";

export interface SpessaFontModulatorCurveType {
    curveType: ModulatorCurveType;
    bipolar: boolean;
    positive: boolean;
}

const ALL_CURVE_TYPES = Object.values(ModulatorCurveTypes).flatMap(
    (curveType) => [
        { curveType, positive: true, bipolar: false },
        { curveType, positive: false, bipolar: false },
        { curveType, positive: true, bipolar: true },
        { curveType, positive: false, bipolar: true }
    ]
);

const curveKey = (c: SpessaFontModulatorCurveType) =>
    `${c.curveType}-${c.bipolar}-${c.positive}`;

interface ModulatorCurvePickerProps {
    /**
     * Names the picker for screen readers, for example "Primary source curve".
     */
    label: string;
    curveType: SpessaFontModulatorCurveType;
    onChange: (c: SpessaFontModulatorCurveType) => void;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function ModulatorCurvePicker({
    label,
    curveType,
    onChange,
    isOpen,
    onOpenChange
}: ModulatorCurvePickerProps) {
    const { t } = useTranslation();
    const currentKey = curveKey(curveType);
    return (
        <div className="modulator_curve_picker">
            {isOpen ? (
                <div
                    className="modulator_curve_showcase pretty_outline"
                    role={"group"}
                    aria-label={label}
                >
                    {ALL_CURVE_TYPES.map((c) => {
                        const key = curveKey(c);
                        return (
                            <button
                                type={"button"}
                                key={key}
                                aria-pressed={key === currentKey}
                                aria-label={getCurveLabel(t, c)}
                                className={`plain_button modulator_curve_pick pretty_outline responsive_button ${key === currentKey ? "selected" : ""}`}
                                onClick={() => {
                                    onOpenChange(false);
                                    onChange(c);
                                }}
                            >
                                <ModulatorCurvePicture curve={c} />
                            </button>
                        );
                    })}
                </div>
            ) : null}
            <button
                type={"button"}
                className={`plain_button pretty_outline responsive_button ${isOpen ? "" : "hover_brightness"}`}
                aria-expanded={isOpen}
                aria-label={`${label}: ${getCurveLabel(t, curveType)}`}
                onClick={() => onOpenChange(!isOpen)}
            >
                <ModulatorCurvePicture curve={curveType} />
            </button>
        </div>
    );
}
