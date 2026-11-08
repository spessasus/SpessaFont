// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { ContextMenu } from "./context_menu.tsx";
import type { ContextMenuEntry } from "./context_menu_context.ts";

const ENTRIES: ContextMenuEntry[] = [
    {
        label: "Copy",
        onSelect: vi.fn(),
        description: "Copies it",
        icon: "copy"
    },
    "separator",
    {
        label: "Delete",
        onSelect: vi.fn(),
        isDisabled: true,
        disabledReason: "Nothing to delete",
        isDestructive: true
    }
];

describe("ContextMenu", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("closes on resize and ignores the phone fields on desktop", () => {
        const onClose = vi.fn();
        render(
            <LayoutContext value="desktop">
                <ContextMenu
                    x={10}
                    y={10}
                    title="Preset"
                    entries={ENTRIES}
                    onClose={onClose}
                />
            </LayoutContext>
        );
        dispatchEvent(new Event("resize"));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(screen.getByRole("menuitem", { name: "Copy" })).toBeTruthy();
        expect(screen.getByRole("menuitem", { name: "Copy" }).textContent).toBe(
            "Copy"
        );
        expect(screen.queryByText("Copies it")).toBeNull();
        expect(screen.queryByText("Nothing to delete")).toBeNull();
    });

    it("stays open on resize as an action sheet in phone mode", () => {
        const onClose = vi.fn();
        render(
            <LayoutContext value="phone">
                <BackStackProvider>
                    <ContextMenu
                        x={10}
                        y={10}
                        title="Preset"
                        entries={ENTRIES}
                        onClose={onClose}
                    />
                </BackStackProvider>
            </LayoutContext>
        );
        dispatchEvent(new Event("resize"));
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog", { name: "Preset" })).toBeTruthy();
        expect(screen.getByText("Nothing to delete")).toBeTruthy();
        expect(screen.getByText("Copies it")).toBeTruthy();
        expect(screen.getByRole("menu")).toBeTruthy();
    });

    it("runs onClose then onSelect when a sheet item is tapped", () => {
        const onClose = vi.fn();
        const onSelect = vi.fn();
        render(
            <LayoutContext value="phone">
                <BackStackProvider>
                    <ContextMenu
                        x={0}
                        y={0}
                        entries={[{ label: "Go", onSelect }]}
                        onClose={onClose}
                    />
                </BackStackProvider>
            </LayoutContext>
        );
        fireEvent.click(screen.getByRole("menuitem", { name: "Go" }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("shows the submenu chevron in the phone sheet only", () => {
        const entries: ContextMenuEntry[] = [
            { label: "More", onSelect: vi.fn(), hasSubmenu: true }
        ];
        const { unmount } = render(
            <LayoutContext value="phone">
                <BackStackProvider>
                    <ContextMenu
                        x={0}
                        y={0}
                        entries={entries}
                        onClose={vi.fn()}
                    />
                </BackStackProvider>
            </LayoutContext>
        );
        expect(
            document.body.querySelector(".action_sheet_chevron")
        ).toBeTruthy();
        unmount();
        render(
            <LayoutContext value="desktop">
                <ContextMenu x={0} y={0} entries={entries} onClose={vi.fn()} />
            </LayoutContext>
        );
        expect(document.body.querySelector(".action_sheet_chevron")).toBeNull();
    });
});

const renderAt = (layout: "phone" | "desktop", entries: ContextMenuEntry[]) =>
    render(
        <LayoutContext value={layout}>
            <BackStackProvider>
                <ContextMenu x={0} y={0} entries={entries} onClose={vi.fn()} />
            </BackStackProvider>
        </LayoutContext>
    );

describe("phone action sheet markers", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        // jsdom has no layout, so the current entry's scroll is a stand-in
        Element.prototype.scrollIntoView = vi.fn();
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("marks the current entry in the phone sheet only", () => {
        const entries: ContextMenuEntry[] = [
            { label: "One", onSelect: vi.fn() },
            { label: "Two", onSelect: vi.fn(), isCurrent: true }
        ];
        const { unmount } = renderAt("phone", entries);
        expect(
            screen
                .getByRole("menuitem", { name: "Two" })
                .getAttribute("aria-current")
        ).toBe("true");
        expect(
            screen
                .getByRole("menuitem", { name: "One" })
                .getAttribute("aria-current")
        ).toBeNull();
        unmount();
        renderAt("desktop", entries);
        expect(document.body.querySelector("[aria-current]")).toBeNull();
    });

    it("leaves out the icon slot when no entry has an icon", () => {
        const { unmount } = renderAt("phone", [
            { label: "One", onSelect: vi.fn() }
        ]);
        expect(document.body.querySelector(".action_sheet_icon")).toBeNull();
        unmount();
        renderAt("phone", [
            { label: "One", onSelect: vi.fn(), icon: "copy" },
            { label: "Two", onSelect: vi.fn() }
        ]);
        expect(
            document.body.querySelectorAll(".action_sheet_icon")
        ).toHaveLength(2);
    });
});
