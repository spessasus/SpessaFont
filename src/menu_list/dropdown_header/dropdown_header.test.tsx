// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import toast from "react-hot-toast";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import {
    ContextMenuContext,
    type ContextMenuEntry
} from "../../context_menu/context_menu_context.ts";
import { DropdownHeader } from "./dropdown_header.tsx";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

afterEach(() => {
    cleanup();
    vi.mocked(toast).mockClear();
});

function renderHeader(
    layout: LayoutMode,
    props: { onAdd?: () => void; onSelect?: () => void; count?: number } = {}
) {
    const openMenu = vi.fn();
    render(
        <LayoutContext value={layout}>
            <ContextMenuContext value={{ openMenu }}>
                <DropdownHeader
                    text={"Presets"}
                    isOpen={true}
                    onToggle={vi.fn()}
                    addLabel={"New preset"}
                    addHint={"Select instruments first"}
                    {...props}
                />
            </ContextMenuContext>
        </LayoutContext>
    );
    return openMenu;
}

describe("DropdownHeader", () => {
    it("keeps the add button disabled on desktop", () => {
        const toastSpy = vi.mocked(toast);
        renderHeader("desktop");
        const add = screen.getByRole<HTMLButtonElement>("button", {
            name: "New preset"
        });
        expect(add.disabled).toBe(true);
        fireEvent.click(add);
        expect(toastSpy).not.toHaveBeenCalled();
    });

    it("shows no count and no section menu on desktop", () => {
        renderHeader("desktop", { count: 12 });
        expect(screen.queryByText("12")).toBeNull();
        expect(
            screen.queryByRole("button", { name: "phoneLocale.appBar.more" })
        ).toBeNull();
    });

    it("explains the disabled add button on phones", () => {
        const toastSpy = vi.mocked(toast);
        renderHeader("phone");
        const add = screen.getByRole("button", { name: "New preset" });
        expect(add.getAttribute("aria-disabled")).toBe("true");
        fireEvent.click(add);
        expect(toastSpy).toHaveBeenCalledWith("Select instruments first");
    });

    it("adds from the enabled button on phones without a toast", () => {
        const toastSpy = vi.mocked(toast);
        const onAdd = vi.fn();
        renderHeader("phone", { onAdd });
        fireEvent.click(screen.getByRole("button", { name: "New preset" }));
        expect(onAdd).toHaveBeenCalledTimes(1);
        expect(toastSpy).not.toHaveBeenCalled();
    });

    it("shows the count after the title on phones", () => {
        renderHeader("phone", { count: 495 });
        expect(screen.getByText("495")).toBeTruthy();
    });

    it("opens the section menu on phones", () => {
        const onSelect = vi.fn();
        const openMenu = renderHeader("phone", { onSelect });
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.appBar.more" })
        );
        expect(openMenu).toHaveBeenCalledTimes(1);
        const [, entries, options] = openMenu.mock.calls[0] as [
            unknown,
            ContextMenuEntry[],
            { title: string }
        ];
        expect(entries).toHaveLength(3);
        expect(options).toEqual({ title: "Presets" });
        const items = entries.filter((entry) => entry !== "separator");
        expect(items[0].isDisabled).toBe(true);
        expect(items[0].disabledReason).toBe("presetList.copyHint");
        expect(items[1].disabledReason).toBe("presetList.pasteHint");
        items[2].onSelect();
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("lets Select do nothing when no handler is given", () => {
        const openMenu = renderHeader("phone");
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.appBar.more" })
        );
        const entries = openMenu.mock.calls[0][1] as ContextMenuEntry[];
        const select = entries[2];
        expect(typeof select).toBe("object");
        expect(() => {
            if (select !== "separator") select.onSelect();
        }).not.toThrow();
    });
});
