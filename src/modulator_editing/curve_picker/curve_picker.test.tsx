// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ModulatorCurveTypes } from "spessasynth_core";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { BackStackContext } from "../../phone_shell/back_stack_context.ts";
import { BackStack } from "../../phone_shell/back_stack.ts";
import { CurvePicker } from "./curve_picker.tsx";
import type { SpessaFontModulatorCurveType } from "./curve_shape.ts";

const CURRENT: SpessaFontModulatorCurveType = {
    curveType: ModulatorCurveTypes.linear,
    positive: true,
    bipolar: false
};

function renderPicker(layout: LayoutMode, isOpen: boolean) {
    const onChange = vi.fn();
    const onOpenChange = vi.fn();
    render(
        <LayoutContext value={layout}>
            <BackStackContext
                value={{
                    stack: new BackStack(),
                    releaseSentinel: vi.fn(),
                    dropSentinel: vi.fn()
                }}
            >
                <CurvePicker
                    label="Primary source curve"
                    curveType={CURRENT}
                    onChange={onChange}
                    isOpen={isOpen}
                    onOpenChange={onOpenChange}
                />
            </BackStackContext>
        </LayoutContext>
    );
    return { onChange, onOpenChange };
}

describe("CurvePicker", () => {
    afterEach(cleanup);

    it("opens the showcase below the toggle on desktop", () => {
        renderPicker("desktop", true);
        const showcase = document.querySelector(".modulator_curve_showcase");
        expect(showcase?.querySelectorAll("button")).toHaveLength(16);
        expect(document.querySelector(".curve_sheet_grid")).toBeNull();
        cleanup();
        const { onOpenChange } = renderPicker("desktop", false);
        fireEvent.click(screen.getByRole("button"));
        expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("shows the 16 curves in a sheet on a phone and closes it on a pick", () => {
        const { onChange, onOpenChange } = renderPicker("phone", true);
        expect(document.querySelector(".modulator_curve_showcase")).toBeNull();
        const grid = document.querySelector(".curve_sheet_grid");
        const buttons = grid?.querySelectorAll("button") ?? [];
        expect(buttons).toHaveLength(16);
        const current = [...buttons].find(
            (b) => b.getAttribute("aria-pressed") === "true"
        );
        const other = [...buttons].find(
            (b) => b.getAttribute("aria-pressed") === "false"
        );
        if (!current || !other) {
            throw new TypeError("No buttons");
        }
        fireEvent.click(other);
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onOpenChange).toHaveBeenCalledWith(false);
        onChange.mockClear();
        onOpenChange.mockClear();
        fireEvent.click(current);
        expect(onChange).not.toHaveBeenCalled();
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });
});
