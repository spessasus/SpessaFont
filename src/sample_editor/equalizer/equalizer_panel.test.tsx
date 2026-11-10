// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import toast from "react-hot-toast";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { EqualizerPanel } from "./equalizer_panel.tsx";
import {
    DEFAULT_EQUALIZER_STATE,
    type EqualizerState,
    FLAT_EQUALIZER
} from "./equalizer.ts";

vi.mock("react-hot-toast", () => ({ default: vi.fn() }));

afterEach(() => {
    cleanup();
    vi.mocked(toast).mockClear();
});

function renderPanel(
    layout: LayoutMode,
    bands: number[] = [],
    sampleRate = 44_100
) {
    const state: EqualizerState = {
        ...DEFAULT_EQUALIZER_STATE,
        settings: {
            ...FLAT_EQUALIZER,
            bands: FLAT_EQUALIZER.bands.map((gain, i) => bands[i] ?? gain)
        }
    };
    const onStateChange = vi.fn();
    const onApply = vi.fn();
    const { container } = render(
        <LayoutContext value={layout}>
            <EqualizerPanel
                state={state}
                sampleRate={sampleRate}
                isDisabled={false}
                onStateChange={onStateChange}
                onApply={onApply}
            />
        </LayoutContext>
    );
    return { container, onStateChange, onApply };
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

    it("keeps a band above half the sample rate focusable and says why on a tap", () => {
        const { container, onStateChange } = renderPanel("phone", [], 32_000);
        const grid = container.querySelector(".equalizer_band_grid");
        const last = grid?.querySelectorAll("button")[9];
        if (!last) {
            throw new Error("no band button");
        }
        expect(last.textContent).toContain("16k");
        expect(last.hasAttribute("disabled")).toBe(false);
        expect(last.getAttribute("aria-disabled")).toBe("true");
        fireEvent.click(last);
        expect(last.getAttribute("aria-pressed")).toBe("false");
        expect(toast).toHaveBeenCalledWith(
            "phoneLocale.sample.bandAboveNyquist",
            { id: "band-above-nyquist" }
        );
        expect(onStateChange).not.toHaveBeenCalled();
    });

    it("does nothing when the Reset and Apply actions are aria-disabled", () => {
        const { container, onStateChange, onApply } = renderPanel("phone");
        const actions = container.querySelectorAll(
            ":scope .equalizer_actions button"
        );
        // Preview, Reset, Apply, as on desktop
        expect(actions[1].textContent).toBe("sampleLocale.equalizer.reset");
        expect(actions[2].textContent).toBe("sampleLocale.equalizer.apply");
        for (const index of [1, 2]) {
            expect(actions[index].getAttribute("aria-disabled")).toBe("true");
            fireEvent.click(actions[index]);
        }
        expect(onStateChange).not.toHaveBeenCalled();
        expect(onApply).not.toHaveBeenCalled();
    });
});
