// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { GridViewBar } from "./grid_view_bar.tsx";

afterEach(cleanup);

function renderBar(areAllCollapsed: boolean) {
    const onModeChange = vi.fn();
    const onValuesOnlyChange = vi.fn();
    const onToggleAll = vi.fn();
    render(
        <GridViewBar
            mode={"grid"}
            onModeChange={onModeChange}
            isValuesOnly={false}
            onValuesOnlyChange={onValuesOnlyChange}
            areAllCollapsed={areAllCollapsed}
            onToggleAll={onToggleAll}
        />
    );
    return { onModeChange, onValuesOnlyChange, onToggleAll };
}

describe("GridViewBar", () => {
    it("switches the mode, Values only and every group", () => {
        const { onModeChange, onValuesOnlyChange, onToggleAll } =
            renderBar(false);

        fireEvent.click(
            screen.getByRole("radio", { name: "phoneLocale.grid.oneZone" })
        );
        expect(onModeChange).toHaveBeenCalledWith("oneZone");

        const valuesOnly = screen.getByRole("button", {
            name: "phoneLocale.grid.valuesOnly"
        });
        expect(valuesOnly.getAttribute("aria-pressed")).toBe("false");
        fireEvent.click(valuesOnly);
        expect(onValuesOnlyChange).toHaveBeenCalledWith(true);

        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.grid.collapseAll"
            })
        );
        expect(onToggleAll).toHaveBeenCalled();
    });

    it("offers Expand all when every group is collapsed", () => {
        renderBar(true);
        expect(
            screen.getByRole("button", { name: "phoneLocale.grid.expandAll" })
        ).toBeTruthy();
    });
});
