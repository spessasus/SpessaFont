import { useEffect, useRef } from "react";
import { modulatorCurveTypes } from "spessasynth_core";
import type { ModulatorCurveType } from "./curve_picker.tsx";

const MARGIN = 10;
const ARROW_HEAD_SIZE = 3;
const CURVE_MARGIN = 15;

function getCurveValue(curve: ModulatorCurveType, value: number): number {
    const polarity = curve.bipolar;
    if (!curve.positive) {
        value = 1 - value;
    }
    const concave = (v: number) => 1 - Math.sqrt(1 - v * v);
    const convex = (v: number) => Math.sqrt(1 - (1 - v) * (1 - v));
    switch (curve.curveType) {
        case modulatorCurveTypes.linear:
            if (polarity) {
                // bipolar curve
                return value * 2 - 1;
            }
            return value;

        case modulatorCurveTypes.switch:
            // switch
            value = value > 0.5 ? 1 : 0;
            if (polarity) {
                // multiply
                return value * 2 - 1;
            }
            return value;

        case modulatorCurveTypes.concave:
            if (polarity) {
                value = value * 2 - 1;
                if (value < 0) {
                    return -concave(-value);
                }
                return concave(value);
            }
            return concave(value);

        case modulatorCurveTypes.convex:
            // look up the value
            if (polarity) {
                value = value * 2 - 1;
                if (value < 0) {
                    return -convex(-value);
                }
                return convex(value);
            }
            return convex(value);
    }
}

export function ModulatorCurvePicture({
    curve
}: {
    curve: ModulatorCurveType;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // draw arrows
        ctx.strokeStyle = "white";
        ctx.lineCap = "round";
        ctx.lineWidth = 3;
        ctx.beginPath();
        let horizArrowStart: number[];
        let horizArrowEnd: number[];
        let vertiArrowStart: number[];
        let vertiArrowEnd: number[];
        if (curve.bipolar) {
            horizArrowStart = [MARGIN, canvas.height / 2];
            horizArrowEnd = [canvas.width - MARGIN, canvas.height / 2];
            vertiArrowStart = [canvas.width / 2, canvas.height - MARGIN];
            vertiArrowEnd = [canvas.width / 2, MARGIN];
        } else {
            horizArrowStart = [0, canvas.height - MARGIN];
            horizArrowEnd = [canvas.width - MARGIN, canvas.height - MARGIN];
            vertiArrowStart = [MARGIN, canvas.height];
            vertiArrowEnd = [MARGIN, MARGIN];
        }
        ctx.moveTo(horizArrowStart[0], horizArrowStart[1]);
        ctx.lineTo(horizArrowEnd[0], horizArrowEnd[1]);
        ctx.lineTo(
            horizArrowEnd[0] - ARROW_HEAD_SIZE,
            horizArrowEnd[1] - ARROW_HEAD_SIZE
        );
        ctx.lineTo(horizArrowEnd[0], horizArrowEnd[1]);
        ctx.lineTo(
            horizArrowEnd[0] - ARROW_HEAD_SIZE,
            horizArrowEnd[1] + ARROW_HEAD_SIZE
        );
        ctx.stroke();
        // vertical
        ctx.beginPath();
        ctx.moveTo(vertiArrowStart[0], vertiArrowStart[1]);
        ctx.lineTo(vertiArrowEnd[0], vertiArrowEnd[1]);
        ctx.lineTo(
            vertiArrowEnd[0] - ARROW_HEAD_SIZE,
            vertiArrowEnd[1] + ARROW_HEAD_SIZE
        );
        ctx.lineTo(vertiArrowEnd[0], vertiArrowEnd[1]);
        ctx.lineTo(
            vertiArrowEnd[0] + ARROW_HEAD_SIZE,
            vertiArrowEnd[1] + ARROW_HEAD_SIZE
        );
        ctx.stroke();

        // draw the curve
        const actualWidth = canvas.width - CURVE_MARGIN * 2;
        const actualHeight = canvas.height - CURVE_MARGIN * 2;
        ctx.lineWidth = 7;
        ctx.strokeStyle = "#6e00b7";
        ctx.beginPath();
        let firstVal = getCurveValue(curve, 0);
        if (curve.bipolar) {
            firstVal = (firstVal + 1) / 2;
        }
        firstVal = 1 - firstVal;
        ctx.moveTo(CURVE_MARGIN, CURVE_MARGIN + firstVal * actualHeight);
        for (let i = 0; i < actualWidth + 1; i++) {
            let v = getCurveValue(curve, i / actualWidth);
            if (curve.bipolar) {
                v = (v + 1) / 2;
            }
            v = 1 - v;
            ctx.lineTo(i + CURVE_MARGIN, CURVE_MARGIN + v * actualHeight);
        }
        ctx.stroke();
    }, [curve, curve.bipolar]);

    return (
        <canvas
            ref={canvasRef}
            className="modulator_curve"
            title={`${curve.curveType} positive: ${curve.positive} bipolar: ${curve.bipolar}`}
            width={100}
            height={100}
        />
    );
}
