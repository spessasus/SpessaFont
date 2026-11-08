// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import { ContextMenuProvider } from "../context_menu/context_menu_provider.tsx";
import { DragProvider } from "../drag_and_drop/drag_provider.tsx";
import { type DialogsAPI, DialogsContext } from "../dialogs/dialogs_context.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";
import { NavigatorLayer } from "./navigator_layer.tsx";

// Importing audio needs the engine and the settings, which this test does not open
vi.mock("../menu_list/use_sample_import.ts", () => ({
    useSampleImport: () => () => Promise.resolve(0)
}));

const DIALOGS: DialogsAPI = {
    pickElement: () => Promise.resolve(undefined),
    askNumber: () => Promise.resolve(undefined),
    openDialog: () => Promise.resolve(undefined)
};

function renderLayer(isOpen: boolean) {
    const session = createTestSession();
    const dispatch = vi.fn();
    const onViewChange = vi.fn();
    const state = { ...INITIAL_PHONE_SHELL_STATE, isNavigatorOpen: isOpen };
    const result = render(
        <LayoutContext value="phone">
            <BackStackProvider>
                <PhoneShellContext value={{ state, dispatch }}>
                    <ClipboardProvider>
                        <DialogsContext value={DIALOGS}>
                            <ContextMenuProvider>
                                <DragProvider>
                                    <BankEditorContext
                                        value={{
                                            session,
                                            apply: (actions) =>
                                                session.history.do(actions),
                                            setView: () => undefined,
                                            playSample: () => undefined
                                        }}
                                    >
                                        <NavigatorLayer
                                            view={"info"}
                                            tabList={null}
                                            isCovered={false}
                                            onViewChange={onViewChange}
                                            onPlay={() => undefined}
                                            onOpenFile={() => undefined}
                                            onNewFile={() => undefined}
                                        />
                                    </BankEditorContext>
                                </DragProvider>
                            </ContextMenuProvider>
                        </DialogsContext>
                    </ClipboardProvider>
                </PhoneShellContext>
            </BackStackProvider>
        </LayoutContext>
    );
    return { session, dispatch, onViewChange, ...result };
}

describe("NavigatorLayer", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("picks the overview through navigatorPick", () => {
        const { session, dispatch, onViewChange } = renderLayer(true);
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.navigator.overview"
            })
        );
        expect(onViewChange).toHaveBeenCalledWith("info");
        expect(dispatch).toHaveBeenCalledWith({
            type: "navigatorPick",
            tabId: session.id
        });
        expect(
            screen
                .getByRole("button", { name: "phoneLocale.navigator.keepOpen" })
                .getAttribute("aria-pressed")
        ).toBe("false");
        session.close();
    });

    it("is inert while closed", () => {
        const { session, container } = renderLayer(false);
        const layer = container.querySelector(".navigator_layer");
        expect(layer?.hasAttribute("inert")).toBe(true);
        session.close();
    });

    it("closes from the scrim", () => {
        const { session, dispatch, container } = renderLayer(true);
        const scrim = container.querySelector(".navigator_scrim");
        if (!scrim) {
            throw new Error("The scrim did not render.");
        }
        fireEvent.click(scrim);
        expect(dispatch).toHaveBeenCalledWith({ type: "closeNavigator" });
        session.close();
    });
});
