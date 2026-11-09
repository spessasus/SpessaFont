import { describe, expect, it } from "vitest";
import {
    getDrillDepth,
    getNavigatorPresence,
    getOpenNavigatorAction,
    INITIAL_PHONE_SHELL_STATE,
    phoneShellReducer
} from "./phone_shell_state.ts";

describe("phoneShellReducer", () => {
    it("raises the depth per tab on editor changes and resets it on a pick", () => {
        let state = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "editorChange",
            tabId: 1
        });
        state = phoneShellReducer(state, { type: "editorChange", tabId: 1 });
        expect(getDrillDepth(state, 1)).toBe(2);
        expect(getDrillDepth(state, 2)).toBe(0);
        state = phoneShellReducer(state, { type: "navigatorPick", tabId: 1 });
        expect(getDrillDepth(state, 1)).toBe(0);
    });

    it("lowers the depth on drill-down back, not below 0", () => {
        let state = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "editorChange",
            tabId: 1
        });
        state = phoneShellReducer(state, { type: "drillBack", tabId: 1 });
        expect(getDrillDepth(state, 1)).toBe(0);
        state = phoneShellReducer(state, { type: "drillBack", tabId: 1 });
        expect(getDrillDepth(state, 1)).toBe(0);
    });

    it("closes the navigator on a pick unless pinned", () => {
        const open = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "openNavigator"
        });
        expect(
            phoneShellReducer(open, { type: "navigatorPick", tabId: 1 })
                .isNavigatorOpen
        ).toBe(false);
        const pinned = phoneShellReducer(open, { type: "togglePinned" });
        expect(
            phoneShellReducer(pinned, { type: "navigatorPick", tabId: 1 })
                .isNavigatorOpen
        ).toBe(true);
    });

    it("does not mutate the previous map", () => {
        const next = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "editorChange",
            tabId: 1
        });
        expect(INITIAL_PHONE_SHELL_STATE.drillDepth.size).toBe(0);
        expect(next.drillDepth).not.toBe(INITIAL_PHONE_SHELL_STATE.drillDepth);
    });

    it("covers the editor exactly while the portrait navigator is open", () => {
        const open = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "openNavigator"
        });
        expect(getNavigatorPresence(open, false)).toEqual({
            isShown: true,
            isCoveringEditor: true
        });
        expect(getNavigatorPresence(INITIAL_PHONE_SHELL_STATE, false)).toEqual({
            isShown: false,
            isCoveringEditor: false
        });
    });

    it("shows the dock unless it is collapsed and never covers the editor in landscape", () => {
        expect(getNavigatorPresence(INITIAL_PHONE_SHELL_STATE, true)).toEqual({
            isShown: true,
            isCoveringEditor: false
        });
        const collapsed = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "toggleCollapsed"
        });
        expect(getNavigatorPresence(collapsed, true)).toEqual({
            isShown: false,
            isCoveringEditor: false
        });
    });

    it("expands a collapsed dock and passes when it shows", () => {
        const collapsed = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "toggleCollapsed"
        });
        const open = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "openNavigator"
        });
        expect(getOpenNavigatorAction(collapsed, true)).toEqual({
            type: "toggleCollapsed"
        });
        expect(
            getOpenNavigatorAction(INITIAL_PHONE_SHELL_STATE, true)
        ).toBeUndefined();
        expect(
            getOpenNavigatorAction(INITIAL_PHONE_SHELL_STATE, false)
        ).toEqual({ type: "openNavigator" });
        expect(getOpenNavigatorAction(open, false)).toBeUndefined();
    });

    it("keeps the portrait open state across a pick in landscape", () => {
        const next = phoneShellReducer(INITIAL_PHONE_SHELL_STATE, {
            type: "navigatorPick",
            tabId: 1
        });
        expect(next.isNavigatorOpen).toBe(false);
        expect(next.isNavigatorCollapsed).toBe(false);
    });
});
