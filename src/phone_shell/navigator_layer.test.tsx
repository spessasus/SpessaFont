// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import { ContextMenuProvider } from "../context_menu/context_menu_provider.tsx";
import { DragProvider } from "../drag_and_drop/drag_provider.tsx";
import { OpenBanksProvider } from "../tab_list/open_banks_provider.tsx";
import { type DialogsAPI, DialogsContext } from "../dialogs/dialogs_context.ts";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";
import { NavigatorLayer } from "./navigator_layer.tsx";
import { createShellContext } from "../test_utils/shell_context.ts";

// The virtualizer renders no rows in jsdom
vi.mock("../menu_list/virtual_item_list.tsx", () => ({
    VirtualItemList: ({
        items,
        renderItem
    }: {
        items: readonly object[];
        renderItem: (item: never) => React.ReactNode;
    }) => (
        <>
            {items.map((item, index) => (
                <div key={index}>{renderItem(item as never)}</div>
            ))}
        </>
    )
}));
// Importing audio needs the engine and the settings, which this test does not open
vi.mock("../menu_list/use_sample_import.ts", () => ({
    useSampleImport: () => () => Promise.resolve(0)
}));

const DIALOGS: DialogsAPI = {
    pickElement: () => Promise.resolve(undefined),
    askNumber: () => Promise.resolve(undefined),
    openDialog: () => Promise.resolve(undefined)
};

function renderLayer(
    isOpen: boolean,
    isFirstSampleShown = false,
    isLandscape = false,
    isCollapsed = false
) {
    const session = createTestSession();
    const view = isFirstSampleShown ? session.document.samples[0] : "info";
    const dispatch = vi.fn();
    const onViewChange = vi.fn();
    const state = {
        ...INITIAL_PHONE_SHELL_STATE,
        isNavigatorOpen: isOpen,
        isNavigatorCollapsed: isCollapsed
    };
    const result = render(
        <LayoutContext value="phone">
            <BackStackProvider>
                <PhoneShellContext
                    value={createShellContext(state, dispatch, isLandscape)}
                >
                    <ClipboardProvider>
                        <DialogsContext value={DIALOGS}>
                            <ContextMenuProvider>
                                <DragProvider>
                                    <OpenBanksProvider
                                        sessions={[session]}
                                        activeId={session.id}
                                    >
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
                                                view={view}
                                                tabList={null}
                                                isCovered={false}
                                                onViewChange={onViewChange}
                                                onPlay={() => undefined}
                                                onOpenFile={() => undefined}
                                                onNewFile={() => undefined}
                                            />
                                        </BankEditorContext>
                                    </OpenBanksProvider>
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

    it("picks the instrument made from a selection, the long press itself picks nothing", () => {
        const { session, dispatch, onViewChange } = renderLayer(true, true);
        const before = new Set(session.document.instruments);
        const row = document.querySelector(".sample_display");
        if (!row) {
            throw new Error("The sample row did not render.");
        }
        fireEvent.contextMenu(row);
        expect(dispatch).not.toHaveBeenCalled();
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.selection.newInstrument"
            })
        );
        const created = session.document.instruments.find(
            (instrument) => !before.has(instrument)
        );
        expect(created).toBeDefined();
        expect(onViewChange).toHaveBeenLastCalledWith(created);
        expect(dispatch).toHaveBeenCalledWith({
            type: "navigatorPick",
            tabId: session.id
        });
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

    describe("docked in landscape", () => {
        it("collapses from its header and expands from the strip", () => {
            const shown = renderLayer(false, false, true);
            fireEvent.click(
                screen.getByRole("button", {
                    name: "phoneLocale.navigator.collapse"
                })
            );
            expect(shown.dispatch).toHaveBeenLastCalledWith({
                type: "toggleCollapsed"
            });
            expect(
                screen.queryByRole("button", {
                    name: "phoneLocale.navigator.expand"
                })
            ).toBeNull();
            shown.session.close();
            cleanup();

            const { session, dispatch, container } = renderLayer(
                false,
                false,
                true,
                true
            );
            expect(
                container
                    .querySelector(".navigator_panel")
                    ?.hasAttribute("inert")
            ).toBe(true);
            fireEvent.click(
                screen.getByRole("button", {
                    name: "phoneLocale.navigator.expand"
                })
            );
            expect(dispatch).toHaveBeenLastCalledWith({
                type: "toggleCollapsed"
            });
            session.close();
        });

        it("renders no close, pin or scrim when docked", () => {
            const { session, container } = renderLayer(false, false, true);
            expect(
                screen.queryByRole("button", {
                    name: "phoneLocale.navigator.close"
                })
            ).toBeNull();
            expect(
                screen.queryByRole("button", {
                    name: "phoneLocale.navigator.keepOpen"
                })
            ).toBeNull();
            expect(container.querySelector(".navigator_scrim")).toBeNull();
            session.close();
        });

        it("keeps the dock open on a pick", () => {
            const { session, onViewChange, container } = renderLayer(
                false,
                false,
                true
            );
            fireEvent.click(
                screen.getByRole("button", {
                    name: "phoneLocale.navigator.overview"
                })
            );
            expect(onViewChange).toHaveBeenCalledWith("info");
            const panel = container.querySelector(".navigator_panel");
            expect(panel?.hasAttribute("inert")).toBe(false);
            session.close();
        });
    });
});
