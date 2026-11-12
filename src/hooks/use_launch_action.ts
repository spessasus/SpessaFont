import { useEffect, useEffectEvent, useRef } from "react";
import type { LaunchAction } from "../utils/launch_param.ts";

/**
 * Runs the action the installed app was opened for (a shortcut or the share sheet) once.
 */
export function useLaunchAction(
    action: LaunchAction | undefined,
    onAction: (action: LaunchAction) => Promise<void>
) {
    const handleAction = useEffectEvent(onAction);
    // StrictMode runs the effect twice, and a second run would open the bank again
    const ranRef = useRef(false);
    useEffect(() => {
        if (action === undefined || ranRef.current) {
            return;
        }
        ranRef.current = true;
        void handleAction(action);
    }, [action]);
}
