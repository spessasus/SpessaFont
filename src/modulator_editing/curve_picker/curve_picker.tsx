import { type ModulatorCurveType, modulatorCurveTypes } from "spessasynth_core";
import "./curve_picker.css";
import { ModulatorCurvePicture } from "./curve_picture.tsx";

export interface SpessaFontModulatorCurveType {
    curveType: ModulatorCurveType;
    bipolar: boolean;
    positive: boolean;
}

const allCurveTypes: SpessaFontModulatorCurveType[] = [];

for (const key in modulatorCurveTypes) {
    const value = modulatorCurveTypes[key as keyof typeof modulatorCurveTypes];
    allCurveTypes.push(
        { curveType: value, positive: true, bipolar: false },
        { curveType: value, positive: false, bipolar: false },
        { curveType: value, positive: true, bipolar: true },
        { curveType: value, positive: false, bipolar: true }
    );
}

export function ModulatorCurvePicker({
    curveType,
    setCurveType,
    isActive,
    setActive,
    setNotActive
}: {
    curveType: SpessaFontModulatorCurveType;
    setCurveType: (c: SpessaFontModulatorCurveType) => void;
    id: string;
    isActive: boolean;
    setActive: () => void;
    setNotActive: () => void;
}) {
    const handleClick = () => {
        if (isActive) {
            setNotActive();
        } else {
            setActive();
        }
    };
    const setCurve = (c: SpessaFontModulatorCurveType) => {
        setNotActive();
        setCurveType(c);
    };
    return (
        <div className="modulator_curve_picker">
            {isActive ? (
                <>
                    <div className="modulator_curve_showcase pretty_outline">
                        {allCurveTypes.map((c, index) => (
                            <div
                                key={index}
                                className={`modulator_curve_pick pretty_outline responsive_button ${c.curveType === curveType.curveType && c.bipolar === curveType.bipolar && c.positive === curveType.positive ? "selected" : ""}`}
                                onClick={() => setCurve(c)}
                            >
                                <ModulatorCurvePicture curve={c} />
                            </div>
                        ))}
                    </div>
                    <div className="pretty_outline" onClick={handleClick}>
                        <ModulatorCurvePicture curve={curveType} />
                    </div>
                </>
            ) : (
                <div
                    className="pretty_outline hover_brightness responsive_button"
                    onClick={handleClick}
                >
                    <ModulatorCurvePicture curve={curveType} />
                </div>
            )}
        </div>
    );
}
