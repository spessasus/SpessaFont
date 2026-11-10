import type * as React from "react";
import { type RefObject, useRef } from "react";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { getPinchZoom } from "./wave_pinch.ts";

interface WaveGestureOptions {
    layout: LayoutMode;
    scrollerRef: RefObject<HTMLDivElement | null>;
    /**
     * Where the next zoom keeps its sample, in view pixels. Unset, the zoom keeps the middle.
     */
    zoomAnchorRef: RefObject<number | null>;
    zoom: number;
    maxZoom: number;
    onZoomChange: (zoom: number) => void;
    /**
     * A loop handle is being dragged, which has the pointer to itself.
     */
    isHandleDragging: boolean;
}

/**
 * The phone's wave gestures: one finger scrolls the zoomed wave and two fingers zoom around
 * their center. The wave has `touch-action: none`, as a browser pan cancels the first finger of
 * a pinch that starts moving before the second lands, so the scroll is done here too.
 * Desktop gets no handlers.
 */
export function useWaveGestures({
    layout,
    scrollerRef,
    zoomAnchorRef,
    zoom,
    maxZoom,
    onZoomChange,
    isHandleDragging
}: WaveGestureOptions) {
    type Gesture =
        | { kind: "none" }
        | { kind: "pan"; lastX: number }
        | { kind: "pinch"; startDistance: number; startZoom: number }
        // A pinch ended while a finger is still down, which must not start a pan with a jump
        | { kind: "done" };
    // Each finger's last position, by pointer id
    const pointersRef = useRef(new Map<number, { x: number; y: number }>());
    const gestureRef = useRef<Gesture>({ kind: "none" });
    if (layout !== "phone") {
        return {};
    }

    // The spread of the fingers in any direction, as fingers placed one above the other pinch too
    const getDistance = () => {
        const [first, second] = pointersRef.current.values();
        return first && second
            ? Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
            : 1;
    };

    const handlePointerEnd = (e: React.PointerEvent<HTMLElement>) => {
        const pointers = pointersRef.current;
        if (!pointers.delete(e.pointerId)) {
            return;
        }
        if (pointers.size === 0) {
            gestureRef.current = { kind: "none" };
        } else if (gestureRef.current.kind === "pinch") {
            gestureRef.current = { kind: "done" };
        }
    };

    return {
        onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
            const pointers = pointersRef.current;
            if (isHandleDragging || pointers.size >= 2) {
                return;
            }
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            gestureRef.current =
                pointers.size === 1
                    ? { kind: "pan", lastX: e.clientX }
                    : {
                          kind: "pinch",
                          startDistance: getDistance(),
                          startZoom: zoom
                      };
        },
        onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
            const pointers = pointersRef.current;
            if (!pointers.has(e.pointerId)) {
                return;
            }
            // A handle drag has the pointer to itself, a finger already down stops panning
            if (isHandleDragging) {
                gestureRef.current = { kind: "done" };
                return;
            }
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            const gesture = gestureRef.current;
            if (gesture.kind === "pan") {
                const scroller = scrollerRef.current;
                if (scroller) {
                    scroller.scrollLeft -= e.clientX - gesture.lastX;
                }
                gestureRef.current = { kind: "pan", lastX: e.clientX };
            } else if (gesture.kind === "pinch") {
                const [first, second] = pointers.values();
                const rect = e.currentTarget.getBoundingClientRect();
                zoomAnchorRef.current =
                    (first.x + (second?.x ?? first.x)) / 2 - rect.left;
                onZoomChange(
                    getPinchZoom({
                        startZoom: gesture.startZoom,
                        startDistance: gesture.startDistance,
                        distance: getDistance(),
                        maxZoom
                    })
                );
            }
        },
        onPointerUp: handlePointerEnd,
        onPointerCancel: handlePointerEnd
    };
}
