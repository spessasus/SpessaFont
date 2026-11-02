import type { CanvasSize } from "../../hooks/use_canvas.ts";
import { sampleToX, type WaveViewport } from "./wave_geometry.ts";

const SCALE_LINES_COUNT = 8;
/**
 * Lines between samples show up when samples are at least this many pixels apart.
 */
const SAMPLE_LINES_MIN_SPACING = 6;
/**
 * Above this many samples per pixel the wave is drawn as a min and max per pixel.
 */
const MIN_MAX_THRESHOLD = 7;
const MIN_WAVE_THICKNESS = 1;
const MAX_WAVE_THICKNESS = 10;
const WAVE_THICKNESS_PER_PIXEL = 0.9;
const LOOP_PREVIEW_POINTS = 32;
const DASH = [15, 15];

export interface LoopPoints {
    loopStart: number;
    loopEnd: number;
}

export interface WaveformColors {
    grid: string;
    wave: string;
    loopStart: string;
    loopEnd: string;
}

export interface OverlayColors {
    loopStart: string;
    loopEnd: string;
    cursor: string;
}

function drawVerticalLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    height: number
) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
}

function drawGrid(
    ctx: CanvasRenderingContext2D,
    { width, height }: CanvasSize,
    view: WaveViewport,
    color: string
) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    const step = height / SCALE_LINES_COUNT;
    for (let i = 1; i < SCALE_LINES_COUNT; i++) {
        ctx.beginPath();
        ctx.moveTo(0, step * i);
        ctx.lineTo(width, step * i);
        ctx.stroke();
    }

    const pixelsPerSample = (width * view.zoom) / view.sampleCount;
    if (pixelsPerSample <= SAMPLE_LINES_MIN_SPACING) {
        return;
    }
    ctx.lineWidth = 1;
    const firstSample = Math.ceil(view.scrollX / pixelsPerSample);
    for (
        let x = sampleToX(view, firstSample);
        x < width;
        x += pixelsPerSample
    ) {
        drawVerticalLine(ctx, x, height);
    }
}

function drawWave(
    ctx: CanvasRenderingContext2D,
    { width, height }: CanvasSize,
    view: WaveViewport,
    data: Float32Array
) {
    const halfHeight = height / 2;
    const samplesPerPixel = data.length / (width * view.zoom);
    ctx.lineWidth = Math.min(
        Math.max(
            MIN_WAVE_THICKNESS,
            WAVE_THICKNESS_PER_PIXEL / samplesPerPixel
        ),
        MAX_WAVE_THICKNESS
    );
    ctx.beginPath();
    if (samplesPerPixel >= MIN_MAX_THRESHOLD) {
        for (let x = 0; x < width; x++) {
            const start = Math.floor((x + view.scrollX) * samplesPerPixel);
            const end = Math.min(
                Math.floor(start + samplesPerPixel),
                data.length
            );
            if (start >= end) {
                break;
            }
            let min = 1;
            let max = -1;
            for (let i = start; i < end; i++) {
                min = Math.min(min, data[i]);
                max = Math.max(max, data[i]);
            }
            ctx.lineTo(x, halfHeight - min * halfHeight);
            ctx.lineTo(x, halfHeight - max * halfHeight);
        }
    } else {
        for (let x = 0; x < width; x++) {
            const index = (x + view.scrollX) * samplesPerPixel;
            const lowerIndex = Math.floor(index);
            if (lowerIndex >= data.length) {
                break;
            }
            const lower = data[lowerIndex];
            const upper = data[Math.min(lowerIndex + 1, data.length - 1)];
            const value = lower + (upper - lower) * (index - lowerIndex);
            ctx.lineTo(x, halfHeight - value * halfHeight);
        }
    }
    ctx.stroke();
}

/**
 * Draws the samples from `from` to `to`, shifted by `shift` samples, as a dashed line.
 */
function drawLoopPreview(
    ctx: CanvasRenderingContext2D,
    height: number,
    view: WaveViewport,
    data: Float32Array,
    from: number,
    to: number,
    shift: number
) {
    const halfHeight = height / 2;
    ctx.beginPath();
    for (let i = Math.max(0, from); i < Math.min(data.length, to); i++) {
        ctx.lineTo(
            sampleToX(view, i + shift),
            halfHeight - data[i] * halfHeight
        );
    }
    ctx.stroke();
}

/**
 * The static layer: scale lines, the wave, and dashed previews of how the wave continues
 * across the loop (the end of the loop drawn before its start and the start after its end).
 */
export function drawWaveform(
    ctx: CanvasRenderingContext2D,
    size: CanvasSize,
    view: WaveViewport,
    data: Float32Array,
    { loopStart, loopEnd }: LoopPoints,
    colors: WaveformColors
) {
    if (data.length === 0) {
        return;
    }
    drawGrid(ctx, size, view, colors.grid);
    ctx.strokeStyle = colors.wave;
    drawWave(ctx, size, view, data);

    const loopLength = loopEnd - loopStart;
    ctx.setLineDash(DASH);
    ctx.strokeStyle = colors.loopStart;
    drawLoopPreview(
        ctx,
        size.height,
        view,
        data,
        loopEnd - LOOP_PREVIEW_POINTS,
        loopEnd + LOOP_PREVIEW_POINTS,
        -loopLength
    );
    ctx.strokeStyle = colors.loopEnd;
    drawLoopPreview(
        ctx,
        size.height,
        view,
        data,
        loopStart - LOOP_PREVIEW_POINTS,
        loopStart + LOOP_PREVIEW_POINTS,
        loopLength
    );
}

export interface OverlayMarkers extends LoopPoints {
    /**
     * The sample under the pointer, if any.
     */
    hoveredSample: number | null;
    /**
     * The sample being played, if any.
     */
    playheadSample: number | null;
}

/**
 * The live layer: loop points, the play head and the hover cursor.
 */
export function drawOverlay(
    ctx: CanvasRenderingContext2D,
    { height }: CanvasSize,
    view: WaveViewport,
    { loopStart, loopEnd, hoveredSample, playheadSample }: OverlayMarkers,
    colors: OverlayColors
) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.loopStart;
    drawVerticalLine(ctx, sampleToX(view, loopStart), height);
    ctx.strokeStyle = colors.loopEnd;
    drawVerticalLine(ctx, sampleToX(view, loopEnd), height);

    ctx.strokeStyle = colors.cursor;
    if (playheadSample !== null) {
        drawVerticalLine(ctx, sampleToX(view, playheadSample), height);
    }
    if (hoveredSample === null) {
        return;
    }
    ctx.lineWidth = 1;
    ctx.setLineDash(DASH);
    drawVerticalLine(ctx, sampleToX(view, hoveredSample), height);
}
