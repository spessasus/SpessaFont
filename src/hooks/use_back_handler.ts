import { use, useEffect, useEffectEvent } from "react";
import { PresenceContext } from "../presence/presence_context.ts";
import { useBackStack } from "../phone_shell/back_stack_context.ts";
import type { BackHandler, BackLevel } from "../phone_shell/back_stack.ts";

/**
 * Handles the phone's back press while `isActive` and not inside a closing `Presence`. Does
 * nothing on desktop or outside `BackStackProvider`, so shared components can call it in both
 * layouts.
 */
export function useBackHandler(
    isActive: boolean,
    level: BackLevel,
    onBack: BackHandler
) {
    const stack = useBackStack()?.stack;
    // A closing layer is gone for the user, so back goes to what is under it
    const isLive = isActive && !(use(PresenceContext)?.isClosing ?? false);
    const doesHandleBack = useEffectEvent(onBack);
    useEffect(() => {
        if (!isLive || !stack) {
            return;
        }
        return stack.register(level, (current) => doesHandleBack(current));
    }, [isLive, level, stack]);
}
