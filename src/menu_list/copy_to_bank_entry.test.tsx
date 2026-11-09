// @vitest-environment jsdom
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    within
} from "@testing-library/react";
import toast from "react-hot-toast";
import { BankEditorContext } from "../bank_editor/bank_editor_context.ts";
import { ClipboardProvider } from "../clipboard/clipboard_provider.tsx";
import {
    ContextMenuContext,
    type ContextMenuEntry,
    type ContextMenuItem
} from "../context_menu/context_menu_context.ts";
import { DialogsProvider } from "../dialogs/dialogs_provider.tsx";
import { DragProvider } from "../drag_and_drop/drag_provider.tsx";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { OpenBanksProvider } from "../tab_list/open_banks_provider.tsx";
import {
    createTestHost,
    createTestSession,
    snapshotBank
} from "../test_utils/bank_fixture.ts";
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

const COPY_TO_BANK = "phoneLocale.selection.copyToBank";

interface HarnessProps {
    session: BankSession;
}

function Harness({ session }: HarnessProps) {
    const [view, setView] = useState<BankEditView>(session.document.samples[0]);
    const context = {
        session,
        setView,
        apply: (actions: HistoryActionGroup) => {
            const focus = session.history.do(actions);
            if (focus) setView(focus);
        },
        playSample: () => undefined
    };
    return (
        <BankEditorContext value={context}>
            <MenuList view={view} isCovered={false} onPreview={setView} />
        </BankEditorContext>
    );
}

function renderList(layout: LayoutMode, bankCount: number) {
    const host = createTestHost();
    const sessions = Array.from({ length: bankCount }, () =>
        createTestSession(host)
    );
    const [source] = sessions;
    const openMenu =
        vi.fn<
            (
                event: unknown,
                entries: readonly ContextMenuEntry[],
                options?: { title?: string }
            ) => void
        >();
    const tree = (open: readonly BankSession[]) => (
        <LayoutContext value={layout}>
            <BackStackProvider>
                <ClipboardProvider>
                    <DialogsProvider>
                        <ContextMenuContext value={{ openMenu }}>
                            <DragProvider>
                                <OpenBanksProvider
                                    sessions={open}
                                    activeId={source.id}
                                >
                                    <Harness session={source} />
                                </OpenBanksProvider>
                            </DragProvider>
                        </ContextMenuContext>
                    </DialogsProvider>
                </ClipboardProvider>
            </BackStackProvider>
        </LayoutContext>
    );
    const { rerender } = render(tree(sessions));
    return {
        sessions,
        source,
        openMenu,
        rerender: (open: readonly BankSession[]) => rerender(tree(open))
    };
}

function sampleRows() {
    return [...document.querySelectorAll(".sample_display")];
}

/**
 * The phone's selection menu for the first sample: a long press starts the selection, the
 * bar's [⋮] opens the menu.
 */
function openSelectionMenu(
    openMenu: ReturnType<typeof renderList>["openMenu"]
) {
    if (!document.querySelector(".selection_bar")) {
        fireEvent.contextMenu(sampleRows()[0]);
    }
    const bar = document.querySelector(".selection_bar");
    if (!(bar instanceof HTMLElement)) {
        throw new TypeError("The selection bar did not render.");
    }
    fireEvent.click(
        within(bar).getByRole("button", { name: "phoneLocale.appBar.more" })
    );
    const entries = openMenu.mock.lastCall?.[1] ?? [];
    return entries.find(
        (e): e is ContextMenuItem =>
            e !== "separator" && e.label === COPY_TO_BANK
    );
}

function bankEntries(openMenu: ReturnType<typeof renderList>["openMenu"]) {
    return (openMenu.mock.lastCall?.[1] ?? []).filter(
        (e): e is ContextMenuItem => e !== "separator"
    );
}

describe("Copy to bank…", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        toast.remove();
        fakeHistory.restore();
    });

    it("offers Copy to bank on a phone with two banks open", () => {
        const { sessions, openMenu } = renderList("phone", 2);
        const entry = openSelectionMenu(openMenu);
        expect(entry?.isDisabled).toBeFalsy();
        expect(entry?.hasSubmenu).toBe(true);
        act(() => entry?.onSelect());
        expect(openMenu.mock.lastCall?.[2]).toEqual({ title: COPY_TO_BANK });
        expect(bankEntries(openMenu)).toHaveLength(1);
        for (const s of sessions) s.close();
    });

    it("copies the selection into the picked bank", () => {
        const { sessions, source, openMenu } = renderList("phone", 2);
        const [, target] = sessions;
        const sourceBefore = snapshotBank(source.document.bank);
        const samplesBefore = target.document.samples.length;
        const entry = openSelectionMenu(openMenu);
        act(() => entry?.onSelect());
        const [bank] = bankEntries(openMenu);
        act(() => bank.onSelect());
        expect(target.document.samples.length).toBe(samplesBefore + 1);
        expect(snapshotBank(source.document.bank)).toEqual(sourceBefore);
        expect(source.history.canUndo).toBe(false);
        expect(target.history.canUndo).toBe(true);
        for (const s of sessions) s.close();
    });

    it("disables the entry with one bank open", () => {
        const { sessions, openMenu } = renderList("phone", 1);
        const entry = openSelectionMenu(openMenu);
        expect(entry?.isDisabled).toBe(true);
        expect(entry?.disabledReason).toBe(
            "phoneLocale.selection.copyToBankNone"
        );
        for (const s of sessions) s.close();
    });

    it("lists a bank that was opened after the menu loaded", () => {
        const { sessions, source, openMenu, rerender } = renderList("phone", 1);
        expect(openSelectionMenu(openMenu)?.isDisabled).toBe(true);
        const added = createTestSession();
        rerender([source, added]);
        const entry = openSelectionMenu(openMenu);
        expect(entry?.isDisabled).toBeFalsy();
        act(() => entry?.onSelect());
        expect(bankEntries(openMenu)).toHaveLength(1);
        for (const s of [...sessions, added]) s.close();
    });

    it("has no entry on desktop", () => {
        const { sessions, openMenu } = renderList("desktop", 2);
        fireEvent.contextMenu(sampleRows()[0]);
        const entries = openMenu.mock.lastCall?.[1] ?? [];
        expect(
            entries.some((e) => e !== "separator" && e.label === COPY_TO_BANK)
        ).toBe(false);
        for (const s of sessions) s.close();
    });
});
