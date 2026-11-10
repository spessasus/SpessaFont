import { useContext } from "react";
import { PhoneShellContext } from "./phone_shell_context.ts";

/**
 * Whether the phone navigator covers the editor. Always false on desktop and in tests
 * without the shell, where nothing covers it.
 */
export function useIsEditorCovered() {
    return useContext(PhoneShellContext)?.presence.isCoveringEditor ?? false;
}
