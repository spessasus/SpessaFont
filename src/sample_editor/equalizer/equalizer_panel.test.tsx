// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { EqualizerPanel } from "./equalizer_panel.tsx";
import {
    DEFAULT_EQUALIZER_STATE,
    type EqualizerState,
    FLAT_EQUALIZER
} from "./equalizer.ts";

afterEach(() => {
    cleanup();
});

function renderPanel(layout: LayoutMode, bands: number[] = []) {
    const state: EqualizerState = {
        ...DEFAULT_EQUALIZER_STATE,
        settings: {
            ...FLAT_EQUALIZER,
            bands: FLAT_EQUALIZER.bands.map((gain, i) => bands[i] ?? gain)
        }
    };
    const onStateChange = vi.fn();
    const { container } = render(
        <LayoutContext value={layout}>
            <EqualizerPanel
                state={state}
                sampleRate={44_100}
                isDisabled={false}
                onStateChange={onStateChange}
                onApply={vi.fn()}
            />
        </LayoutContext>
    );
    return { container, onStateChange };
}

describe("EqualizerPanel", () => {
    it("resets a band on a double click on desktop", () => {
        const { onStateChange } = renderPanel("desktop", [5]);
        expect(screen.getAllByRole("slider")).toHaveLength(11);
        fireEvent.doubleClick(
            screen.getAllByRole("slider", {
                name: "sampleLocale.equalizer.band"
            })[0]
        );
        expect(onStateChange).toHaveBeenCalledOnce();
        const [next] = onStateChange.mock.calls[0] as [EqualizerState];
        expect(next.settings.bands[0]).toBe(0);
    });

    it("picks a band, steps it and resets it on a long press on a phone", () => {
        const { container, onStateChange } = renderPanel("phone", [5]);
        const grid = container.querySelector(".equalizer_band_grid");
        expect(grid?.querySelectorAll("button")).toHaveLength(11);
        const fourth = grid?.querySelectorAll("button")[3];
        expect(fourth?.textContent).toContain("250");
        expect(fourth?.textContent).toContain("0.0");
        if (!fourth) {
            throw new Error("no band button");
        }
        fireEvent.click(fourth);
        expect(fourth.getAttribute("aria-pressed")).toBe("true");
        expect(screen.getAllByRole("slider")).toHaveLength(1);
        const up = screen.getByRole("button", {
            name: "phoneLocale.sample.gainUp"
        });
        fireEvent.pointerDown(up);
        fireEvent.pointerUp(up);
        expect(onStateChange).toHaveBeenCalledOnce();
        const [stepped] = onStateChange.mock.calls[0] as [EqualizerState];
        expect(stepped.settings.bands[3]).toBe(0.5);

        const first = grid?.querySelectorAll("button")[0];
        if (!first) {
            throw new Error("no band button");
        }
        const isNotPrevented = fireEvent.contextMenu(first);
        expect(isNotPrevented).toBe(false);
        const [reset] = onStateChange.mock.calls[1] as [EqualizerState];
        expect(reset.settings.bands[0]).toBe(0);
    });
});
