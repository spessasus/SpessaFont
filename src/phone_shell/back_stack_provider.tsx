import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLayout } from "../layout/layout_context.ts";
import { isRecord } from "../utils/is_record.ts";
import { BackStack } from "./back_stack.ts";
import { BackStackContext } from "./back_stack_context.ts";

const SENTINEL_STATE = { spessafont: "back" };

interface BackStackProviderProps {
    children: ReactNode;
}

/**
 * Turns the phone's back press into a run of the back stack (spec 5).
 * A history entry (the sentinel) catches the press, and is pushed again after each one.
 * On desktop it provides null and leaves the history alone.
 */
export function BackStackProvider({ children }: BackStackProviderProps) {
    const layout = useLayout();
    // State and not a ref, as the context value is built from it during render
    const [stack] = useState(() => new BackStack());
    const sentinel = useRef({
        isPushed: false,
        isReleased: false,
        isNextPopIgnored: false
    });

    useEffect(() => {
        if (layout !== "phone") {
            return;
        }
        const state = sentinel.current;
        // Read from the real history, as a reload keeps the sentinel and a back press on
        // desktop uses it up without this listener
        state.isPushed =
            isRecord(history.state) &&
            history.state.spessafont === SENTINEL_STATE.spessafont;
        state.isReleased = false;
        state.isNextPopIgnored = false;
        const pushSentinel = () => {
            history.pushState(SENTINEL_STATE, "");
            state.isPushed = true;
        };
        // Not pointerdown, a touch pointerdown grants no user activation and Chrome skips
        // history entries added without one. This also cancels a released sentinel.
        const handlePointerUp = () => {
            if (!state.isPushed) {
                pushSentinel();
            }
        };
        const handlePopState = () => {
            if (state.isNextPopIgnored) {
                state.isNextPopIgnored = false;
                return;
            }
            state.isPushed = false;
            state.isReleased = false;
            stack.handleBack();
            if (!state.isReleased) {
                pushSentinel();
            }
        };
        addEventListener("pointerup", handlePointerUp, { capture: true });
        addEventListener("popstate", handlePopState);
        return () => {
            removeEventListener("pointerup", handlePointerUp, {
                capture: true
            });
            removeEventListener("popstate", handlePopState);
        };
    }, [layout, stack]);

    const value = useMemo(() => {
        if (layout !== "phone") {
            return null;
        }
        return {
            stack,
            releaseSentinel: () => {
                sentinel.current.isReleased = true;
            },
            dropSentinel: () => {
                const state = sentinel.current;
                if (!state.isPushed) {
                    return;
                }
                state.isPushed = false;
                state.isNextPopIgnored = true;
                history.back();
            }
        };
    }, [layout, stack]);

    return <BackStackContext value={value}>{children}</BackStackContext>;
}
