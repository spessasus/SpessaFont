import { describe, expect, it } from "vitest";
import { fitLoopPoint } from "./loop_points.ts";

describe("fitLoopPoint", () => {
    it("keeps a start before the end and inside the sample", () => {
        const loop = { loopStart: 100, loopEnd: 800 };
        expect(fitLoopPoint("loopStart", 900, loop, 1000)).toBe(800);
        expect(fitLoopPoint("loopStart", -5, loop, 1000)).toBe(0);
        expect(
            fitLoopPoint(
                "loopStart",
                5000,
                { loopStart: 100, loopEnd: 1000 },
                1000
            )
        ).toBe(999);
    });

    it("keeps an end after the start and inside the sample", () => {
        const loop = { loopStart: 400, loopEnd: 800 };
        expect(fitLoopPoint("loopEnd", 100, loop, 1000)).toBe(400);
        expect(fitLoopPoint("loopEnd", 5000, loop, 1000)).toBe(1000);
    });

    it("rounds the point first", () => {
        const loop = { loopStart: 0, loopEnd: 1000 };
        expect(fitLoopPoint("loopStart", 10.6, loop, 1000)).toBe(11);
        expect(fitLoopPoint("loopEnd", 10.4, loop, 1000)).toBe(10);
    });

    it("fits a shared loop to the partner's length", () => {
        // The sample is 1000 long, its partner 600, and both share the loop
        const partner = { loopStart: 100, loopEnd: 600 };
        expect(fitLoopPoint("loopEnd", 900, partner, 600)).toBe(600);
        expect(fitLoopPoint("loopStart", 700, partner, 600)).toBe(599);
    });
});
