import type { DrawerState } from "./phone_shell_state.ts";

/**
 * The drawer's height as a CSS length, which the toasts sit above (spec 12.5).
 */
export function getDrawerOffset(drawer: DrawerState, isLandscape: boolean) {
    switch (drawer) {
        case "collapsed": {
            return "var(--phone-handle-height)";
        }
        case "keys": {
            // Landscape puts the octave strip in the handle row
            return isLandscape
                ? "calc(var(--phone-handle-height) + var(--phone-keys-height))"
                : "calc(var(--phone-handle-height) + var(--phone-strip-height) + var(--phone-keys-height))";
        }
        case "controls": {
            return "calc(var(--phone-handle-height) + var(--phone-controls-height))";
        }
    }
}
