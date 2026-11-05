import { describe, expect, it } from "vitest";
import { addPeak, buildPeaks } from "./wave_peaks.ts";

/**
 * A repeatable noise, so a failure can be reproduced.
 */
function noise(length: number) {
    let seed = 1;
    return Float32Array.from({ length }, () => {
        seed = (seed * 16_807) % 2_147_483_647;
        return seed / 1_073_741_823.5 - 1;
    });
}

describe("wave peaks", () => {
    it("finds the same peaks as a pass over every frame", () => {
        const data = noise(70_001);
        const levels = buildPeaks(data);
        const ranges = [
            [0, 1],
            [0, data.length],
            [63, 65],
            [100, 5000],
            [511, 4097],
            [12_345, 69_999],
            [69_000, 70_001]
        ];
        for (const [start, end] of ranges) {
            const peak = { min: Infinity, max: -Infinity };
            addPeak(data, levels, start, end, peak);
            const frames = data.subarray(start, end);
            expect(peak).toEqual({
                min: Math.min(...frames),
                max: Math.max(...frames)
            });
        }
    });

    it("builds levels down to one block", () => {
        const levels = buildPeaks(noise(10_000));
        expect(levels.at(-1)?.min.length).toBe(1);
        expect(buildPeaks(new Float32Array(0))).toHaveLength(1);
    });
});
