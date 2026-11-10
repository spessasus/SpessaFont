import type { Dispatch } from "react";
import type { DrawerState, PhoneShellAction } from "./phone_shell_state.ts";

/**
 * Shows the drawer's keys for a piano capture, unless they show already. Called in the click
 * handler that starts the capture.
 */
export function openKeysForCapture(
    drawer: DrawerState,
    dispatch: Dispatch<PhoneShellAction>
) {
    if (drawer !== "keys") {
        dispatch({ type: "setDrawer", drawer: "keys" });
    }
}
