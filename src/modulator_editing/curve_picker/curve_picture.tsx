import { useEffect, useRef } from "react";
import { modulatorCurveTypes } from "spessasynth_core";
import type { ModulatorCurveType } from "./curve_picker.tsx";

const MARGIN = 10;
const ARROW_HEAD_SIZE = 3;
const CURVE_MARGIN = 15;
const WIDTH = 100;
const HEIGHT = 100;

const curveKey = (c: ModulatorCurveType) =>
    `${c.curveType}-${c.bipolar}-${c.positive}`;

// Cache map
const curveCanvasCache: Record<string, HTMLCanvasElement> = {};

function getCurveValue(curve: ModulatorCurveType, value: number): number {
    const polarity = curve.bipolar;
    if (!curve.positive) {
        value = 1 - value;
    }
    const concave = (v: number) => 1 - Math.sqrt(1 - v * v);
    const convex = (v: number) => Math.sqrt(1 - (1 - v) * (1 - v));
    switch (curve.curveType) {
        case modulatorCurveTypes.linear:
            return polarity ? value * 2 - 1 : value;
        case modulatorCurveTypes.switch:
            value = value > 0.5 ? 1 : 0;
            return polarity ? value * 2 - 1 : value;
        case modulatorCurveTypes.concave:
            value = polarity ? value * 2 - 1 : value;
            return value < 0 ? -concave(-value) : concave(value);
        case modulatorCurveTypes.convex:
            value = polarity ? value * 2 - 1 : value;
            return value < 0 ? -convex(-value) : convex(value);
    }
}

// Renders and caches an offscreen canvas
function getOrCreateCurveCanvas(curve: ModulatorCurveType): HTMLCanvasElement {
    if (curveCanvasCache[curveKey(curve)]) {
        return curveCanvasCache[curveKey(curve)];
    }

    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = WIDTH;
    offscreenCanvas.height = HEIGHT;
    const ctx = offscreenCanvas.getContext("2d");
    if (!ctx) {
        return offscreenCanvas;
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw axis arrows
    ctx.strokeStyle = "#555";
    ctx.lineCap = "round";
    ctx.lineWidth = 3;

    ctx.beginPath();
    if (curve.bipolar) {
        ctx.moveTo(MARGIN, HEIGHT / 2);
        ctx.lineTo(WIDTH - MARGIN, HEIGHT / 2);
        ctx.moveTo(WIDTH - MARGIN, HEIGHT / 2);
        ctx.lineTo(
            WIDTH - MARGIN - ARROW_HEAD_SIZE,
            HEIGHT / 2 - ARROW_HEAD_SIZE
        );
        ctx.moveTo(WIDTH - MARGIN, HEIGHT / 2);
        ctx.lineTo(
            WIDTH - MARGIN - ARROW_HEAD_SIZE,
            HEIGHT / 2 + ARROW_HEAD_SIZE
        );

        ctx.moveTo(WIDTH / 2, HEIGHT - MARGIN);
        ctx.lineTo(WIDTH / 2, MARGIN);
        ctx.moveTo(WIDTH / 2, MARGIN);
        ctx.lineTo(WIDTH / 2 - ARROW_HEAD_SIZE, MARGIN + ARROW_HEAD_SIZE);
        ctx.moveTo(WIDTH / 2, MARGIN);
        ctx.lineTo(WIDTH / 2 + ARROW_HEAD_SIZE, MARGIN + ARROW_HEAD_SIZE);
    } else {
        ctx.moveTo(0, HEIGHT - MARGIN);
        ctx.lineTo(WIDTH - MARGIN, HEIGHT - MARGIN);
        ctx.moveTo(WIDTH - MARGIN, HEIGHT - MARGIN);
        ctx.lineTo(
            WIDTH - MARGIN - ARROW_HEAD_SIZE,
            HEIGHT - MARGIN - ARROW_HEAD_SIZE
        );
        ctx.moveTo(WIDTH - MARGIN, HEIGHT - MARGIN);
        ctx.lineTo(
            WIDTH - MARGIN - ARROW_HEAD_SIZE,
            HEIGHT - MARGIN + ARROW_HEAD_SIZE
        );

        ctx.moveTo(MARGIN, HEIGHT);
        ctx.lineTo(MARGIN, MARGIN);
        ctx.moveTo(MARGIN, MARGIN);
        ctx.lineTo(MARGIN - ARROW_HEAD_SIZE, MARGIN + ARROW_HEAD_SIZE);
        ctx.moveTo(MARGIN, MARGIN);
        ctx.lineTo(MARGIN + ARROW_HEAD_SIZE, MARGIN + ARROW_HEAD_SIZE);
    }
    ctx.stroke();

    // Draw the curve
    const actualWidth = WIDTH - CURVE_MARGIN * 2;
    const actualHeight = HEIGHT - CURVE_MARGIN * 2;
    ctx.globalAlpha = 1;
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

    curveCanvasCache[curveKey(curve)] = offscreenCanvas;
    return offscreenCanvas;
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

        const cached = getOrCreateCurveCanvas(curve);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);
        ctx.drawImage(cached, 0, 0);
    }, [curve]);

    return (
        <canvas
            ref={canvasRef}
            className="modulator_curve"
            title={`${curve.curveType} positive: ${curve.positive} bipolar: ${curve.bipolar}`}
            width={WIDTH}
            height={HEIGHT}
        />
    );
}
