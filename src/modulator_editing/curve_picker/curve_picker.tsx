import { modulatorCurveTypes } from "spessasynth_core";
import "./curve_picker.css";
import { ModulatorCurvePicture } from "./curve_picture.tsx";

export type ModulatorCurveType = {
    curveType: modulatorCurveTypes;
    bipolar: boolean;
    positive: boolean;
};

const allCurveTypes: ModulatorCurveType[] = [];

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
    curveType: ModulatorCurveType;
    setCurveType: (c: ModulatorCurveType) => void;
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
    const setCurve = (c: ModulatorCurveType) => {
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
