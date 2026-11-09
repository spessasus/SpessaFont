import type { Dispatch } from "react";
import { vi } from "vitest";
import type { PhoneShellContextValue } from "../phone_shell/phone_shell_context.ts";
import {
    getNavigatorPresence,
    INITIAL_PHONE_SHELL_STATE,
    type PhoneShellAction,
    type PhoneShellState
} from "../phone_shell/phone_shell_state.ts";

/**
 * A phone shell context value as `PhoneShell` builds it, for components tested without the
 * shell.
 */
export function createShellContext(
    state: PhoneShellState = INITIAL_PHONE_SHELL_STATE,
    dispatch: Dispatch<PhoneShellAction> = vi.fn(),
    isLandscape = false
): PhoneShellContextValue {
    return {
        state,
        dispatch,
        presence: getNavigatorPresence(state),
        isLandscape
    };
}
