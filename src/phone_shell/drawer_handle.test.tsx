// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DrawerHandle } from "./drawer_handle.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import {
    INITIAL_PHONE_SHELL_STATE,
    type DrawerState
} from "./phone_shell_state.ts";
import { createShellContext } from "../test_utils/shell_context.ts";

vi.mock("../hooks/use_engine_status.ts", () => ({
    useEngineStatus: () => false
}));

function renderHandle(drawer: DrawerState) {
    const dispatch = vi.fn();
    render(
        <PhoneShellContext
            value={createShellContext(
                { ...INITIAL_PHONE_SHELL_STATE, drawer },
                dispatch
            )}
        >
            <DrawerHandle name={"Piano"} readout={undefined} />
        </PhoneShellContext>
    );
    return dispatch;
}

describe("DrawerHandle", () => {
    afterEach(cleanup);

    it("toggles between keys, controls and collapsed", () => {
        const openDispatch = renderHandle("keys");
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.drawer.controls" })
        );
        expect(openDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "controls"
        });
        cleanup();
        const closeDispatch = renderHandle("controls");
        const controls = screen.getByRole("button", {
            name: "phoneLocale.drawer.controls"
        });
        expect(controls.getAttribute("aria-pressed")).toBe("true");
        fireEvent.click(controls);
        expect(closeDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "collapsed"
        });
    });

    it("opens and closes the keys", () => {
        const openDispatch = renderHandle("collapsed");
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.drawer.keys" })
        );
        expect(openDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "keys"
        });
        cleanup();
        const closeDispatch = renderHandle("keys");
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.drawer.keys" })
        );
        expect(closeDispatch).toHaveBeenCalledWith({
            type: "setDrawer",
            drawer: "collapsed"
        });
    });

    it("renders the strip slot between the toggles and the name", () => {
        render(
            <PhoneShellContext value={createShellContext()}>
                <DrawerHandle
                    name={"Piano"}
                    readout={undefined}
                    strip={<span>strip</span>}
                />
            </PhoneShellContext>
        );
        const toggle = screen.getByRole("button", {
            name: "phoneLocale.drawer.keys"
        });
        const strip = screen.getByText("strip");
        const name = screen.getByText("Piano");
        expect(
            toggle.compareDocumentPosition(strip) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
        expect(
            strip.compareDocumentPosition(name) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });
});
