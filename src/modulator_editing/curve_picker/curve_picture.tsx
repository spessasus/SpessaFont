import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";
import { CURVE_VIEW_SIZE, getAxisPath, getCurvePoints } from "./curve_shape.ts";

interface CurvePictureProps {
    curve: SpessaFontModulatorCurveType;
}

/**
 * Decorative: the button around it names the curve.
 */
export function CurvePicture({ curve }: CurvePictureProps) {
    return (
        <svg
            className="modulator_curve"
            viewBox={`0 0 ${CURVE_VIEW_SIZE} ${CURVE_VIEW_SIZE}`}
            aria-hidden={true}
        >
            <path
                className="modulator_curve_axis"
                d={getAxisPath(curve.bipolar)}
            />
            <polyline
                className="modulator_curve_line"
                points={getCurvePoints(curve)}
            />
        </svg>
    );
}
