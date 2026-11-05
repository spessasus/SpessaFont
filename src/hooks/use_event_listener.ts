import { useEffect, useEffectEvent } from "react";

/**
 * Listens to an event on a target while the component is mounted.
 * The handler always sees the latest props and state, so it does not need to be memoized.
 * A null target listens to nothing.
 */
export function useEventListener<K extends keyof WindowEventMap>(
    target: Window | typeof globalThis,
    type: K,
    handler: (event: WindowEventMap[K]) => void
): void;
export function useEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    handler: (event: DocumentEventMap[K]) => void
): void;
export function useEventListener<K extends keyof MIDIInputEventMap>(
    target: MIDIInput | null,
    type: K,
    handler: (event: MIDIInputEventMap[K]) => void
): void;
export function useEventListener(
    target: EventTarget | null,
    type: string,
    handler: (event: Event) => void
) {
    const onEvent = useEffectEvent(handler);
    useEffect(() => {
        if (!target) {
            return;
        }
        const listener = (event: Event) => onEvent(event);
        target.addEventListener(type, listener);
        return () => target.removeEventListener(type, listener);
    }, [target, type]);
}
