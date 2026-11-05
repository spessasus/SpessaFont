import { useEffect, useEffectEvent, useRef } from "react";

/**
 * Turns wheel notches over a focused field into steps: up is 1, down is -1, and Shift makes a
 * notch 10 steps. An unfocused field lets the page scroll. React listens to the wheel
 * passively, so this adds its own listener, which may cancel the scroll.
 * @param onStep called with the direction and the step count, undefined to listen to nothing
 * @returns the ref for the field
 */
export function useWheelStep<T extends HTMLElement>(
    onStep: ((direction: 1 | -1, steps: number) => void) | undefined
) {
    const ref = useRef<T>(null);
    const isEnabled = onStep !== undefined;
    const handleWheel = useEffectEvent((e: WheelEvent) => {
        const field = ref.current;
        if (!onStep || !field || document.activeElement !== field) {
            return;
        }
        // Some systems turn Shift and the wheel into a sideways scroll
        const delta = e.deltaY === 0 ? e.deltaX : e.deltaY;
        if (delta === 0) {
            return;
        }
        e.preventDefault();
        onStep(delta < 0 ? 1 : -1, e.shiftKey ? 10 : 1);
    });
    useEffect(() => {
        const field = ref.current;
        if (!field || !isEnabled) {
            return;
        }
        const listener = (e: WheelEvent) => handleWheel(e);
        field.addEventListener("wheel", listener, { passive: false });
        return () => field.removeEventListener("wheel", listener);
    }, [isEnabled]);
    return ref;
}
