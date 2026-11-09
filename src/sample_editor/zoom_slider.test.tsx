// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ZoomSlider } from "./zoom_slider.tsx";
import { getMaxZoom, getSliderValue, getSliderZoom } from "./zoom_mapping.ts";

function onZoomChange() {
    // The test changes the zoom itself
}

describe("zoom mapping", () => {
    it("round trips the slider value through the zoom", () => {
        const maxZoom = getMaxZoom(1_000_000);
        for (const value of [100, 5000, (maxZoom - 1) * 100]) {
            expect(
                getSliderValue(getSliderZoom(value, maxZoom), maxZoom)
            ).toBeCloseTo(value, 6);
        }
    });

    it("keeps the zoom limits of the slider", () => {
        expect(getMaxZoom(0)).toBe(5);
        expect(getMaxZoom(1e12)).toBe(4000);
        expect(getSliderZoom(100, 10)).toBe(1);
        expect(getSliderValue(1, 10)).toBe(100);
    });
});

describe("ZoomSlider", () => {
    afterEach(cleanup);

    it("moves the slider when the zoom changes elsewhere", () => {
        const length = 1_000_000;
        const { rerender } = render(
            <ZoomSlider
                sampleLength={length}
                zoom={1}
                onZoomChange={onZoomChange}
            />
        );
        expect(Number(screen.getByRole<HTMLInputElement>("slider").value)).toBe(
            100
        );
        rerender(
            <ZoomSlider
                sampleLength={length}
                zoom={8}
                onZoomChange={onZoomChange}
            />
        );
        const maxZoom = getMaxZoom(length);
        expect(
            Number(screen.getByRole<HTMLInputElement>("slider").value)
        ).toBeCloseTo(getSliderValue(8, maxZoom), 0);
    });

    it("keeps a small step at the low end", () => {
        // One step from 100 zooms by less than a double can hold, so the zoom stays 1
        render(<ZoomHarness />);
        const input = screen.getByRole<HTMLInputElement>("slider");
        fireEvent.change(input, { target: { value: "101" } });
        expect(Number(screen.getByRole<HTMLInputElement>("slider").value)).toBe(
            101
        );
    });
});

function ZoomHarness() {
    const [zoom, setZoom] = useState(1);
    return (
        <ZoomSlider sampleLength={6000} zoom={zoom} onZoomChange={setZoom} />
    );
}
