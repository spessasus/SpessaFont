import { use, useLayoutEffect, useRef } from "react";
import { PresenceContext } from "../presence/presence_context.ts";

/**
 * How long an exit may take before the element is removed anyway, as a hidden page runs no
 * animations and never says one ended.
 */
const EXIT_TIMEOUT_MS = 500;

/**
 * The exit animation of an element inside `Presence`. Put `ref` on the element that plays it
 * and `data-state={isClosing ? "closing" : "open"}` where its CSS reads it. The element is
 * removed when its animation ends, or at once when it has none (desktop, or no Presence
 * around it).
 */
export function usePresence<T extends HTMLElement>() {
    const presence = use(PresenceContext);
    const ref = useRef<T>(null);
    const register = presence?.register;
    useLayoutEffect(() => register?.(), [register]);

    useLayoutEffect(() => {
        if (!presence?.isClosing) {
            return;
        }
        const done = presence.onExited;
        const element = ref.current;
        const animation = element
            ? getComputedStyle(element).animationName
            : "";
        if (!element || animation === "" || animation === "none") {
            done();
            return;
        }
        const timer = setTimeout(done, EXIT_TIMEOUT_MS);
        const handleEnd = (event: AnimationEvent) => {
            // An animation of a child bubbles up too
            if (event.target === element) {
                done();
            }
        };
        element.addEventListener("animationend", handleEnd);
        return () => {
            clearTimeout(timer);
            element.removeEventListener("animationend", handleEnd);
        };
    }, [presence]);

    return { ref, isClosing: presence?.isClosing ?? false };
}
