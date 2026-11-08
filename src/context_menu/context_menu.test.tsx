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
});
