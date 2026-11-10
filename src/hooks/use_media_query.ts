import { useCallback, useSyncExternalStore } from "react";

/**
 * Follows a CSS media query. Re-renders only when the match flips.
 */
// The name is the standard one for this hook, the rule wants a boolean prefix on it
// eslint-disable-next-line unicorn/consistent-boolean-name
export function useMediaQuery(query: string) {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const media = matchMedia(query);
            media.addEventListener("change", onChange);
            return () => {
                media.removeEventListener("change", onChange);
            };
        },
        [query]
    );
    return useSyncExternalStore(
        subscribe,
        () => matchMedia(query).matches,
        () => false
    );
}
