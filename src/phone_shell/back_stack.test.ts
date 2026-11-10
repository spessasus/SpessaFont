import { describe, expect, it, vi } from "vitest";
import {
    BACK_LEVELS,
    BackStack,
    hasBackBehindNavigator
} from "./back_stack.ts";

describe("BackStack", () => {
    it("runs higher levels first and the newest first within a level", () => {
        const stack = new BackStack();
        const calls = new Array<string>();
        const record = (name: string, isHandled: boolean) => () => {
            calls.push(name);
            return isHandled;
        };
        stack.register(BACK_LEVELS.leave, record("leave", true));
        stack.register(BACK_LEVELS.settings, record("settings", false));
        stack.register(BACK_LEVELS.transient, record("old", false));
        stack.register(BACK_LEVELS.transient, record("new", false));

        expect(stack.handleBack()).toBe(true);
        expect(calls).toEqual(["new", "old", "settings", "leave"]);
    });

    it("stops at the first handler that returns true", () => {
        const stack = new BackStack();
        const doesSettingsHandle = vi.fn(() => true);
        stack.register(BACK_LEVELS.settings, doesSettingsHandle);
        stack.register(BACK_LEVELS.transient, () => true);

        expect(stack.handleBack()).toBe(true);
        expect(doesSettingsHandle).not.toHaveBeenCalled();
    });

    it("forgets an unregistered handler", () => {
        const stack = new BackStack();
        const doesHandleBack = vi.fn(() => true);
        const unregister = stack.register(
            BACK_LEVELS.selection,
            doesHandleBack
        );
        expect(stack.hasActive([BACK_LEVELS.selection])).toBe(true);

        unregister();
        expect(stack.handleBack()).toBe(false);
        expect(stack.hasActive([BACK_LEVELS.selection])).toBe(false);
        expect(doesHandleBack).not.toHaveBeenCalled();
    });

    it("passes closeNavigator on at the root and closes with a modulator layer behind", () => {
        const stack = new BackStack();
        const close = vi.fn();
        stack.register(BACK_LEVELS.closeNavigator, (current) => {
            if (!hasBackBehindNavigator(current)) {
                return false;
            }
            close();
            return true;
        });
        expect(stack.handleBack()).toBe(false);

        const doesLayerHandle = vi.fn(() => true);
        stack.register(BACK_LEVELS.modulatorLayer, doesLayerHandle);
        expect(stack.handleBack()).toBe(true);
        expect(close).toHaveBeenCalledTimes(1);
        expect(doesLayerHandle).not.toHaveBeenCalled();
    });
});
