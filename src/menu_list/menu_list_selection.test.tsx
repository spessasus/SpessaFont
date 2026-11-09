// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within
} from "@testing-library/react";
import toast from "react-hot-toast";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import {
    ContextMenuContext,
    type ContextMenuEntry
} from "../context_menu/context_menu_context.ts";
import { DialogsProvider } from "../dialogs/dialogs_provider.tsx";
import { DragProvider } from "../drag_and_drop/drag_provider.tsx";
import { OpenBanksProvider } from "../tab_list/open_banks_provider.tsx";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import type { BankEditView, BankEntity } from "../core_backend/bank_view.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import {
    type FakeHistory,
    setUpFakeHistory
} from "../test_utils/fake_history.ts";
import { MenuList } from "./menu_list.tsx";

// The virtualizer renders no rows in jsdom
vi.mock("./virtual_item_list.tsx", () => ({
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
vi.mock("./use_sample_import.ts", () => ({
    useSampleImport: () => () => Promise.resolve(0)
}));

interface HarnessProps {
    session: BankSession;
    onPick: (view: BankEditView) => void;
    onPreview: (entity: BankEntity) => void;
}

/**
 * Shows the first sample, previews like the phone navigator does, and shows what an action
 * focuses, like the bank editor.
 */
function Harness({ session, onPick, onPreview }: HarnessProps) {
    const [view, setView] = useState<BankEditView>(session.document.samples[0]);
    const pick = (picked: BankEditView) => {
        onPick(picked);
        setView(picked);
    };
    const context = {
        session,
        setView: pick,
        apply: (actions: HistoryActionGroup) => {
            const focus = session.history.do(actions);
            if (focus) setView(focus);
        },
        playSample: () => undefined
    };
    return (
        <BankEditorContext value={context}>
            <MenuList
                view={view}
                isCovered={false}
                onPreview={(entity) => {
                    onPreview(entity);
                    setView(entity);
                }}
            />
        </BankEditorContext>
    );
}

function renderList(layout: LayoutMode) {
    const session = createTestSession();
    const openMenu =
        vi.fn<
            (
                event: unknown,
                entries: readonly ContextMenuEntry[],
                options?: { title?: string }
            ) => void
        >();
    const onPick = vi.fn();
    const onPreview = vi.fn();
    render(
        <LayoutContext value={layout}>
            <BackStackProvider>
                <ClipboardProvider>
                    <DialogsProvider>
                        <ContextMenuContext value={{ openMenu }}>
                            <DragProvider>
                                <OpenBanksProvider
                                    sessions={[session]}
                                    activeId={session.id}
                                >
                                    <Harness
                                        session={session}
                                        onPick={onPick}
                                        onPreview={onPreview}
                                    />
                                </OpenBanksProvider>
                            </DragProvider>
                        </ContextMenuContext>
                    </DialogsProvider>
                </ClipboardProvider>
            </BackStackProvider>
        </LayoutContext>
    );
    return { session, openMenu, onPick, onPreview };
}

function sampleRows() {
    return [...document.querySelectorAll(".sample_display")];
}

function checkedBoxes() {
    return [
        ...document.querySelectorAll<HTMLInputElement>(".selection_checkbox")
    ].filter((box) => box.checked);
}

function selectionMenuButton() {
    const bar = document.querySelector(".selection_bar");
    if (!(bar instanceof HTMLElement)) {
        throw new TypeError("The selection bar did not render.");
    }
    return within(bar).getByRole("button", {
        name: "phoneLocale.appBar.more"
    });
}

const SELECTED = "phoneLocale.selection.selected";

describe("MenuList selection", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        toast.remove();
        fakeHistory.restore();
    });

    it("opens the menu on right click and toggles with Ctrl+click on desktop", () => {
        const { session, openMenu, onPreview } = renderList("desktop");
        const [, b] = session.document.samples;
        fireEvent.contextMenu(sampleRows()[1]);
        expect(openMenu).toHaveBeenCalledTimes(1);
        // The menu shows the row it acts on first
        expect(onPreview).toHaveBeenCalledWith(b);
        expect(screen.queryByText(SELECTED)).toBeNull();

        fireEvent.click(sampleRows()[0], { ctrlKey: true });
        expect(
            document.querySelectorAll(".sample_display.selected")
        ).toHaveLength(2);
        expect(document.querySelector(".selection_checkbox")).toBeNull();
        // A plain click shows the row and drops the selection
        fireEvent.click(sampleRows()[0]);
        expect(
            document.querySelectorAll(".sample_display.selected")
        ).toHaveLength(1);
        session.close();
    });

    it("starts selection on long press on phones without closing the lists", () => {
        const { session, openMenu, onPick, onPreview } = renderList("phone");
        const [, b] = session.document.samples;
        fireEvent.contextMenu(sampleRows()[1]);
        expect(openMenu).not.toHaveBeenCalled();
        expect(screen.queryByRole("menu")).toBeNull();
        expect(screen.getByText(SELECTED)).toBeDefined();
        expect(onPreview).toHaveBeenCalledWith(b);
        expect(onPick).not.toHaveBeenCalled();
        expect(checkedBoxes()).toHaveLength(1);
        session.close();
    });

    it("toggles with a plain tap and ends on back", () => {
        const { session, onPick } = renderList("phone");
        fireEvent.contextMenu(sampleRows()[1]);
        fireEvent.click(sampleRows()[0]);
        expect(checkedBoxes()).toHaveLength(2);
        expect(onPick).not.toHaveBeenCalled();

        fakeHistory.pressBack();
        expect(screen.queryByText(SELECTED)).toBeNull();
        expect(document.querySelector(".selection_checkbox")).toBeNull();
        session.close();
    });

    it("ignores the click that follows the long press", () => {
        const { session } = renderList("phone");
        fireEvent.contextMenu(sampleRows()[1]);
        fireEvent.click(sampleRows()[1]);
        expect(checkedBoxes()).toHaveLength(1);
        expect(
            sampleRows()[1]
                .closest(".phone_sample_row")
                ?.querySelector<HTMLInputElement>(".selection_checkbox")
                ?.checked
        ).toBe(true);
        session.close();
    });

    it("toggles normally with a click later than 500 ms after the long press", () => {
        const { session } = renderList("phone");
        const start = performance.now();
        const now = vi.spyOn(performance, "now").mockReturnValue(start);
        fireEvent.contextMenu(sampleRows()[1]);
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        expect(checkedBoxes()).toHaveLength(2);
        now.mockReturnValue(start + 600);
        fireEvent.click(sampleRows()[1]);
        now.mockRestore();
        expect(checkedBoxes()).toHaveLength(1);
        expect(
            sampleRows()[0]
                .closest(".phone_sample_row")
                ?.querySelector<HTMLInputElement>(".selection_checkbox")
                ?.checked
        ).toBe(true);
        session.close();
    });

    it("keeps the selection on a second long press, the click after it toggles", () => {
        const { session, onPreview } = renderList("phone");
        const [, b] = session.document.samples;
        fireEvent.contextMenu(sampleRows()[1]);
        fireEvent.contextMenu(sampleRows()[0]);
        // No restart: the first row stays the shown one and the only one selected
        expect(onPreview).toHaveBeenCalledTimes(1);
        expect(onPreview).toHaveBeenLastCalledWith(b);
        expect(checkedBoxes()).toHaveLength(1);
        fireEvent.click(sampleRows()[0]);
        expect(checkedBoxes()).toHaveLength(2);
        session.close();
    });

    it("starts from the section menu's Select… with the first tap", () => {
        const { session, openMenu } = renderList("phone");
        fireEvent.click(
            screen.getAllByRole("button", {
                name: "phoneLocale.appBar.more"
            })[0]
        );
        const entries = openMenu.mock.calls[0][1];
        const select = entries.find(
            (entry) =>
                entry !== "separator" &&
                entry.label === "phoneLocale.selection.select"
        );
        if (!select || select === "separator") {
            throw new Error("No Select… entry.");
        }
        act(() => select.onSelect());
        expect(screen.getByText(SELECTED)).toBeDefined();
        expect(checkedBoxes()).toHaveLength(0);
        fireEvent.click(sampleRows()[1]);
        expect(checkedBoxes()).toHaveLength(1);
        session.close();
    });

    it("titles the selection menu with the name or the count", () => {
        const { session, openMenu } = renderList("phone");
        const [a] = session.document.samples;
        fireEvent.contextMenu(sampleRows()[0]);
        fireEvent.click(selectionMenuButton());
        expect(openMenu.mock.lastCall?.[2]).toEqual({ title: a.name });

        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        expect(checkedBoxes()).toHaveLength(2);
        fireEvent.click(selectionMenuButton());
        expect(openMenu.mock.lastCall?.[2]).toEqual({
            title: "phoneLocale.selection.selectedSamples"
        });
        session.close();
    });

    it("makes an instrument from the selected samples", () => {
        const { session } = renderList("phone");
        const before = [...session.document.instruments];
        fireEvent.contextMenu(sampleRows()[0]);
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.selection.all" })
        );
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.selection.newInstrument"
            })
        );
        const created = session.document.instruments.filter(
            (instrument) => !before.includes(instrument)
        );
        expect(created).toHaveLength(1);
        expect(created[0].zones).toHaveLength(2);
        act(() => {
            session.history.undo();
        });
        expect(session.document.instruments).toEqual(before);
        session.close();
    });
});
