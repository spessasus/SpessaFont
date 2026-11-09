import { useLayoutEffect, useRef } from "react";

/**
 * A ref that always holds the latest value, written after each render. Handlers that read it
 * when they run see the current value, so they can keep their identity across renders.
 * Read it only in handlers and effects, never while rendering.
 */
export function useLatest<T>(value: T) {
    const ref = useRef(value);
    useLayoutEffect(() => {
        ref.current = value;
    }, [value]);
    return ref;
}
