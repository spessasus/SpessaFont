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
import type { CustomCurveView } from "../../core_backend/entity_views.ts";

const CURRENT: SpessaFontModulatorCurveType = {
    curveType: ModulatorCurveTypes.linear,
    positive: true,
    bipolar: false
};

const CURVES: readonly CustomCurveView[] = [
    {
        id: 7,
        name: "Attack time",
        points: [
            { x: 0, y: 0 },
            { x: 16_384, y: 16_384 }
        ]
    },
    {
        id: 8,
        name: "Release time",
        points: [
            { x: 0, y: 16_384 },
            { x: 16_384, y: 0 }
        ]
    }
];

function renderPicker(
    layout: LayoutMode,
    isOpen: boolean,
    isSFe = false,
    curveType = CURRENT
) {
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
                    curveType={curveType}
                    isSFe={isSFe}
                    customCurves={CURVES}
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

    it("offers the bank's custom curves in SFe mode only", () => {
        renderPicker("desktop", true);
        expect(screen.queryByRole("radiogroup")).toBeNull();
        cleanup();
        const { onChange, onOpenChange } = renderPicker("desktop", true, true);
        // A standard curve opens on the standard ones
        expect(
            document.querySelectorAll(".modulator_curve_grid button")
        ).toHaveLength(16);
        fireEvent.click(
            screen.getByRole("radio", { name: "modulatorLocale.curves.custom" })
        );
        expect(document.querySelector(".modulator_curve_grid")).toBeNull();
        expect(
            document.querySelectorAll(".custom_curves_list button")
        ).toHaveLength(2);
        fireEvent.change(screen.getByRole("searchbox"), {
            target: { value: "rel" }
        });
        const picks = document.querySelectorAll(".custom_curves_list button");
        expect(picks).toHaveLength(1);
        // The switches say what the pick sets
        fireEvent.click(
            screen.getByRole("checkbox", {
                name: "modulatorLocale.curves.negativeSwitch"
            })
        );
        expect(onChange).not.toHaveBeenCalled();
        fireEvent.click(picks[0]);
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                curveType: ModulatorCurveTypes.custom,
                id: 8,
                positive: false,
                bipolar: false
            })
        );
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it("opens on a source's custom curve and changes its polarity in place", () => {
        const { onChange, onOpenChange } = renderPicker("desktop", true, true, {
            curveType: ModulatorCurveTypes.custom,
            positive: true,
            bipolar: false,
            id: 7,
            name: CURVES[0].name,
            points: CURVES[0].points
        });
        const pressed = [
            ...document.querySelectorAll(".custom_curves_list button")
        ].filter((b) => b.getAttribute("aria-pressed") === "true");
        expect(pressed).toHaveLength(1);
        expect(pressed[0].textContent).toBe("Attack time");
        fireEvent.click(
            screen.getByRole("checkbox", {
                name: "modulatorLocale.curves.bipolarSwitch"
            })
        );
        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({ id: 7, bipolar: true, positive: true })
        );
        expect(onOpenChange).not.toHaveBeenCalled();
    });
});
