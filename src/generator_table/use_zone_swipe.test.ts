// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { type SwipePointerEvent, useZoneSwipe } from "./use_zone_swipe.ts";

const setPointerCapture = vi.fn();

function getEvent(clientX: number, clientY: number): SwipePointerEvent {
    return {
        pointerId: 1,
        clientX,
        clientY,
        currentTarget: { setPointerCapture }
    };
}

/**
 * Runs one gesture: a press at the first point and a move to each of the others, then a release.
 */
function swipe(points: [number, number][]) {
    const onStep = vi.fn();
    const { result } = renderHook(() => useZoneSwipe(onStep));
    const [start, ...moves] = points;
    result.current.onPointerDown(getEvent(...start));
    for (const point of moves) {
        result.current.onPointerMove(getEvent(...point));
    }
    result.current.onPointerUp(getEvent(...(moves.at(-1) ?? start)));
    return onStep;
}

beforeEach(() => {
    vi.stubGlobal("innerWidth", 412);
});

afterEach(() => {
    vi.unstubAllGlobals();
    setPointerCapture.mockClear();
});

describe("useZoneSwipe", () => {
    it("steps on a horizontal swipe past 48 px", () => {
        const forward = swipe([
            [200, 300],
            [150, 310]
        ]);
        expect(forward.mock.calls).toEqual([[1]]);
        expect(setPointerCapture).toHaveBeenCalledTimes(1);
        expect(setPointerCapture).toHaveBeenCalledWith(1);

        const back = swipe([
            [150, 300],
            [200, 300]
        ]);
        expect(back.mock.calls).toEqual([[-1]]);
    });

    it("ignores short, mostly vertical and edge swipes", () => {
        const gestures: [number, number][][] = [
            [
                [200, 300],
                [160, 300]
            ],
            [
                [200, 300],
                [140, 340]
            ],
            [
                [20, 300],
                [100, 300]
            ],
            [
                [395, 300],
                [300, 300]
            ]
        ];
        for (const gesture of gestures) {
            expect(swipe(gesture)).not.toHaveBeenCalled();
        }
        expect(setPointerCapture).not.toHaveBeenCalled();
    });

    it("steps once per gesture", () => {
        const onStep = swipe([
            [300, 300],
            [240, 300],
            [150, 300]
        ]);
        expect(onStep).toHaveBeenCalledTimes(1);
    });
});
