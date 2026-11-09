import { describe, expect, it } from "vitest";
import {
    EDGE_INSET,
    getHandleLeft,
    getHandleLefts,
    getHandleOffsets,
    getReadoutLeft,
    HANDLE_SIZE,
    isHandleVisible
} from "./wave_handle_geometry.ts";

const WIDTH = 400;

describe("wave handle geometry", () => {
    it("keeps the hit box inside the edge inset", () => {
        expect(getHandleLeft(0, WIDTH)).toBe(EDGE_INSET);
        expect(getHandleLeft(WIDTH, WIDTH)).toBe(
            WIDTH - EDGE_INSET - HANDLE_SIZE
        );
    });

    it("centers the hit box on the line in the middle", () => {
        expect(getHandleLeft(200, WIDTH)).toBe(178);
    });

    it("keeps both handles reachable when the points meet", () => {
        const offsets = getHandleOffsets(200, 200, null);
        expect(offsets.end - offsets.start).toBeGreaterThanOrEqual(16);
        const lefts = getHandleLefts(200, 200, WIDTH, null);
        for (const left of [lefts.start, lefts.end]) {
            expect(left).toBeGreaterThanOrEqual(EDGE_INSET);
            expect(left + HANDLE_SIZE).toBeLessThanOrEqual(WIDTH - EDGE_INSET);
        }
        expect(lefts.end - lefts.start).toBeGreaterThanOrEqual(16);
    });

    it("does not move handles that are far enough apart", () => {
        expect(getHandleOffsets(100, 300, null)).toEqual({
            start: 0,
            end: 0,
            top: "start"
        });
    });

    it("keeps met points at an edge apart and inside the inset", () => {
        expect(getHandleLefts(0, 0, WIDTH, null)).toMatchObject({
            start: 16,
            end: 60
        });
        const right = getHandleLefts(WIDTH, WIDTH, WIDTH, null);
        expect(right.end).toBe(WIDTH - EDGE_INSET - HANDLE_SIZE);
        expect(right.end - right.start).toBe(HANDLE_SIZE);
        expect(right.start).toBeGreaterThanOrEqual(EDGE_INSET);
    });

    it("puts the last touched handle on top", () => {
        expect(getHandleOffsets(200, 210, "end").top).toBe("end");
        expect(getHandleOffsets(200, 210, "start").top).toBe("start");
        expect(getHandleLefts(200, 210, WIDTH, "end").top).toBe("end");
    });

    it("clamps the readout inside the view", () => {
        expect(getReadoutLeft(EDGE_INSET + 22, 120, WIDTH)).toBe(0);
        expect(getReadoutLeft(WIDTH, 120, WIDTH)).toBe(WIDTH - 120);
        expect(getReadoutLeft(200, 120, WIDTH)).toBe(140);
    });

    it("hides a handle whose line is scrolled out", () => {
        expect(isHandleVisible(-1, WIDTH)).toBe(false);
        expect(isHandleVisible(WIDTH + 1, WIDTH)).toBe(false);
        expect(isHandleVisible(0, WIDTH)).toBe(true);
        expect(isHandleVisible(WIDTH, WIDTH)).toBe(true);
    });
});
