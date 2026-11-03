import { describe, expect, it } from "vitest";
import { crossfadeLoop, findLoopPoints, getFadeLength } from "./auto_loop.ts";

const RATE = 44_100;

/**
 * A tone with a few harmonics and a slow wobble, so the period is not a whole number of
 * samples and a careless loop would click.
 */
function tone(length: number) {
    return Float32Array.from({ length }, (_, i) => {
        const t = i / RATE;
        return (
            0.5 * Math.sin(2 * Math.PI * 261.7 * t) +
            0.2 * Math.sin(2 * Math.PI * 523.4 * t + 0.3) +
            0.1 * Math.sin(2 * Math.PI * 3 * t)
        );
    });
}

/**
 * The jump between the last sample of the loop and its start, against the typical step.
 */
function jumpRatio(data: Float32Array, start: number, end: number) {
    let steps = 0;
    for (let i = 1; i < data.length; i++) {
        steps += Math.abs(data[i] - data[i - 1]);
    }
    const typical = steps / (data.length - 1);
    return Math.abs(data[start] - data[end - 1]) / typical;
}

describe("auto loop", () => {
    it("finds a seamless loop in the sustain", () => {
        const data = tone(RATE);
        const loop = findLoopPoints(data, RATE);
        if (!loop) {
            throw new Error("No loop found.");
        }
        expect(loop.start).toBeGreaterThanOrEqual(RATE * 0.15);
        expect(loop.end).toBeGreaterThanOrEqual(RATE * 0.7);
        expect(loop.end - loop.start).toBeGreaterThanOrEqual(RATE * 0.2);
        expect(jumpRatio(data, loop.start, loop.end)).toBeLessThan(3);
    });

    it("crossfades the end of the loop into the audio before its start", () => {
        const data = Float32Array.from({ length: 100 }, (_, i) => i);
        const loop = { start: 40, end: 90 };
        const fade = getFadeLength(loop, RATE);
        expect(fade).toBe(25);
        const out = crossfadeLoop(data, loop, fade);
        // Untouched before the fade and after the loop
        expect(out[64]).toBe(64);
        expect(out[95]).toBe(95);
        // The last sample of the loop is the one before the start
        expect(out[89]).toBeCloseTo(39);
        expect(data[89]).toBe(89);
    });

    it("turns down audio too short to loop", () => {
        expect(findLoopPoints(new Float32Array(500), RATE)).toBeUndefined();
    });
});
