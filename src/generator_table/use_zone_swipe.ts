import { useRef } from "react";

/**
 * The part of a pointer event the swipe reads, so tests can pass plain objects.
 */
export type SwipePointerEvent = Pick<
    PointerEvent,
    "pointerId" | "clientX" | "clientY"
> & { currentTarget: Pick<Element, "setPointerCapture"> };

/**
 * How far a swipe has to go across before it steps.
 */
export const SWIPE_DISTANCE_PX = 48;

/**
 * Swipes starting this close to a screen edge are left to the system (Android's back gesture).
 * Matches `--phone-edge-dead-zone`.
 */
export const EDGE_DEAD_ZONE_PX = 30;

interface SwipeStart {
    pointerId: number;
    x: number;
    y: number;
    hasStepped: boolean;
}

/**
 * Steps the One zone column on a horizontal swipe. The pointer is captured only once the swipe
 * steps, so vertical scrolling stays native and a tap still reaches its cell.
 * @param onStep called with 1 for a swipe to the left (the next zone) and -1 for the previous
 * @returns the pointer handlers for the swiped element
 */
export function useZoneSwipe(onStep: (direction: 1 | -1) => void) {
    const startRef = useRef<SwipeStart | null>(null);
    const handleEnd = (e: SwipePointerEvent) => {
        if (startRef.current?.pointerId === e.pointerId) {
            startRef.current = null;
        }
    };
    return {
        onPointerDown: (e: SwipePointerEvent) => {
            const isAtEdge =
                e.clientX < EDGE_DEAD_ZONE_PX ||
                e.clientX > innerWidth - EDGE_DEAD_ZONE_PX;
            startRef.current = isAtEdge
                ? null
                : {
                      pointerId: e.pointerId,
                      x: e.clientX,
                      y: e.clientY,
                      hasStepped: false
                  };
        },
        onPointerMove: (e: SwipePointerEvent) => {
            const start = startRef.current;
            if (start?.pointerId !== e.pointerId || start.hasStepped) {
                return;
            }
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (
                Math.abs(dx) <= SWIPE_DISTANCE_PX ||
                Math.abs(dx) <= 2 * Math.abs(dy)
            ) {
                return;
            }
            start.hasStepped = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            onStep(dx < 0 ? 1 : -1);
        },
        onPointerUp: handleEnd,
        onPointerCancel: handleEnd
    };
}
