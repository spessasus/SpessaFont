// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrawerHandle } from "./drawer_handle.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import {
    INITIAL_PHONE_SHELL_STATE,
    type DrawerState
} from "./phone_shell_state.ts";

vi.mock("../hooks/use_engine_status.ts", () => ({
    useEngineStatus: () => false
}));

function renderHandle(drawer: DrawerState) {
    const dispatch = vi.fn();
    render(
        <PhoneShellContext
            value={{
                state: { ...INITIAL_PHONE_SHELL_STATE, drawer },
                dispatch
            }}
        >
            <DrawerHandle name={"Piano"} readout={undefined} />
        </PhoneShellContext>
    );
    return dispatch;
}

describe("DrawerHandle", () => {
    afterEach(cleanup);

    it("shows only the Keys toggle, the controls panel is phase 2", () => {
        renderHandle("collapsed");
        const toggles = screen
            .getAllByRole("button")
            .map((button) => button.textContent);
        expect(toggles).toEqual(["phoneLocale.drawer.keys"]);
    });

    it("opens and closes the keys", () => {
        const openDispatch = renderHandle("collapsed");
        fireEvent.click(screen.getByRole("button"));
        expect(openDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "keys"
        });
        cleanup();
        const closeDispatch = renderHandle("keys");
        fireEvent.click(screen.getByRole("button"));
        expect(closeDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "collapsed"
        });
    });
});
