import { useSyncExternalStore } from "react";
import { isLandscapeScreen } from "./orientation.ts";

function subscribe(onChange: () => void) {
    // Missing in older browsers
    const orientation: ScreenOrientation | undefined = screen.orientation;
    orientation?.addEventListener("change", onChange);
    addEventListener("resize", onChange);
    return () => {
        orientation?.removeEventListener("change", onChange);
        removeEventListener("resize", onChange);
    };
}

function isLandscapeNow() {
    const orientation: ScreenOrientation | undefined = screen.orientation;
    return isLandscapeScreen(orientation?.type, innerWidth, innerHeight);
}

/**
 * Whether the phone is held sideways, see `isLandscapeScreen`.
 */
export function useIsLandscape() {
    return useSyncExternalStore(subscribe, isLandscapeNow, () => false);
}
