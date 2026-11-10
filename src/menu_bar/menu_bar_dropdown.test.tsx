// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import { BackStackProvider } from "../phone_shell/back_stack_provider.tsx";
import { setUpFakeHistory } from "../test_utils/fake_history.ts";
import type { FakeHistory } from "../test_utils/fake_history.ts";
import { MenuBarDropdown } from "./menu_bar_dropdown.tsx";
import { MenuBarIcon } from "./menu_bar_icon.tsx";

function renderMenu(layout: LayoutMode, onClick: () => void) {
    return render(
        <LayoutContext value={layout}>
            <BackStackProvider>
                <MenuBarDropdown main="Sample Tools">
                    <MenuBarIcon
                        text="Auto loop"
                        title="Finds a loop"
                        onClick={onClick}
                    />
                </MenuBarDropdown>
            </BackStackProvider>
        </LayoutContext>
    );
}

describe("MenuBarDropdown", () => {
    let fakeHistory: FakeHistory;
    beforeEach(() => {
        fakeHistory = setUpFakeHistory();
    });
    afterEach(() => {
        cleanup();
        fakeHistory.restore();
    });

    it("keeps the hover dropdown on desktop", () => {
        renderMenu("desktop", vi.fn());
        const trigger = screen.getByRole("button", { name: "Sample Tools" });
        expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
        expect(
            document.querySelector("[role=menuitem]")?.getAttribute("title")
        ).toBe("Finds a loop");
    });

    it("opens a sheet on phones and closes it after an item", () => {
        const onClick = vi.fn();
        renderMenu("phone", onClick);
        const trigger = screen.getByRole("button", { name: "Sample Tools" });
        expect(trigger.getAttribute("aria-haspopup")).not.toBe("menu");
        expect(document.querySelector("[role=menuitem]")).toBeNull();

        fireEvent.click(trigger);
        const dialog = screen.getByRole("dialog", { name: "Sample Tools" });
        expect(dialog.textContent).toContain("Finds a loop");

        fireEvent.click(screen.getByRole("menuitem", { name: /Auto loop/ }));
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(screen.queryByRole("dialog")).toBeNull();
    });
});
