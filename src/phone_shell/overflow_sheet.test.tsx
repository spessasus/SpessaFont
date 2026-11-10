// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { PhoneShellContext } from "./phone_shell_context.ts";
import { INITIAL_PHONE_SHELL_STATE } from "./phone_shell_state.ts";
import { OverflowSheet } from "./overflow_sheet.tsx";
import { LayoutContext } from "../layout/layout_context.ts";
import { BackStackProvider } from "./back_stack_provider.tsx";
import { createShellContext } from "../test_utils/shell_context.ts";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));
vi.mock("../core_backend/audio_engine_context.ts", () => ({
    useAudioEngine: () => ({ audioEngine: { playMIDI: vi.fn() } })
}));

function renderOverflow(options: {
    hasBank: boolean;
    canGoForward: boolean;
    onInstallApp?: () => void;
}) {
    const session = options.hasBank ? createTestSession() : undefined;
    const bankTabs = {
        canGoForward: options.canGoForward,
        goForward: vi.fn()
    };
    const dispatch = vi.fn();
    const result = render(
        <LayoutContext value={"phone"}>
            <BackStackProvider>
                <PhoneShellContext
                    value={createShellContext(
                        INITIAL_PHONE_SHELL_STATE,
                        dispatch
                    )}
                >
                    <OverflowSheet
                        session={session}
                        bankTabs={bankTabs}
                        onOpenFile={vi.fn()}
                        onNewFile={vi.fn()}
                        onCloseFile={vi.fn()}
                        onToggleSettings={vi.fn()}
                        onInstallApp={options.onInstallApp}
                        onViewChange={vi.fn()}
                    />
                </PhoneShellContext>
            </BackStackProvider>
        </LayoutContext>
    );
    fireEvent.click(result.getByLabelText("phoneLocale.appBar.more"));
    return { session, bankTabs, dispatch, ...result };
}

function labels(container: HTMLElement) {
    return [...container.ownerDocument.querySelectorAll("[role=menuitem]")].map(
        (item) => item.querySelector(".action_sheet_label")?.textContent
    );
}

describe("OverflowSheet", () => {
    afterEach(cleanup);

    it("lists the bank entries in order and opens Save as", () => {
        const { session, container, getByText } = renderOverflow({
            hasBank: true,
            canGoForward: true
        });
        expect(labels(container)).toEqual([
            "phoneLocale.overflow.save",
            "phoneLocale.overflow.saveAs",
            "phoneLocale.overflow.new",
            "phoneLocale.overflow.open",
            "phoneLocale.overflow.closeBank",
            "phoneLocale.overflow.edit",
            "phoneLocale.overflow.forward",
            "phoneLocale.overflow.playMIDI",
            "phoneLocale.overflow.settings",
            "phoneLocale.overflow.fullscreen",
            "phoneLocale.overflow.about"
        ]);
        fireEvent.click(getByText("phoneLocale.overflow.saveAs"));
        expect(labels(container)).toEqual([
            "menuBarLocale.file.saveSF2",
            "menuBarLocale.file.saveSF3",
            "menuBarLocale.file.saveDLS",
            "menuBarLocale.file.saveSFE"
        ]);
        session?.close();
    });

    it("lists Open, New, Settings and About without a bank", () => {
        const { container } = renderOverflow({
            hasBank: false,
            canGoForward: false
        });
        expect(labels(container)).toEqual([
            "phoneLocale.overflow.open",
            "phoneLocale.overflow.new",
            "phoneLocale.overflow.settings",
            "phoneLocale.overflow.about"
        ]);
    });

    it("disables Forward without forward history", () => {
        const { session, getByText } = renderOverflow({
            hasBank: true,
            canGoForward: false
        });
        const item = getByText("phoneLocale.overflow.forward").closest(
            "button"
        );
        expect(item?.disabled).toBe(true);
        session?.close();
    });

    it("raises the drill depth when Forward steps into an element", () => {
        const { session, bankTabs, dispatch, getByText } = renderOverflow({
            hasBank: true,
            canGoForward: true
        });
        fireEvent.click(getByText("phoneLocale.overflow.forward"));
        expect(bankTabs.goForward).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith({
            type: "editorChange",
            tabId: session?.id
        });
        session?.close();
    });

    it("lists Install app before About only while the browser offers it", () => {
        const onInstallApp = vi.fn();
        const withOffer = renderOverflow({
            hasBank: false,
            canGoForward: false,
            onInstallApp
        });
        expect(labels(withOffer.container)).toEqual([
            "phoneLocale.overflow.open",
            "phoneLocale.overflow.new",
            "phoneLocale.overflow.settings",
            "phoneLocale.overflow.installApp",
            "phoneLocale.overflow.about"
        ]);
        fireEvent.click(withOffer.getByText("phoneLocale.overflow.installApp"));
        expect(onInstallApp).toHaveBeenCalledTimes(1);
        cleanup();
        const without = renderOverflow({
            hasBank: false,
            canGoForward: false
        });
        expect(labels(without.container)).not.toContain(
            "phoneLocale.overflow.installApp"
        );
    });
});
