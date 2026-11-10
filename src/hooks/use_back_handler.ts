import { useEffect, useEffectEvent } from "react";
import { useBackStack } from "../phone_shell/back_stack_context.ts";
import type { BackHandler, BackLevel } from "../phone_shell/back_stack.ts";

/**
 * Handles the phone's back press while `isActive`. Does nothing on desktop or outside
 * `BackStackProvider`, so shared components can call it in both layouts.
 */
export function useBackHandler(
    isActive: boolean,
    level: BackLevel,
    onBack: BackHandler
) {
    const stack = useBackStack()?.stack;
    const doesHandleBack = useEffectEvent(onBack);
    useEffect(() => {
        if (!isActive || !stack) {
            return;
        }
        return stack.register(level, (current) => doesHandleBack(current));
    }, [isActive, level, stack]);
}
