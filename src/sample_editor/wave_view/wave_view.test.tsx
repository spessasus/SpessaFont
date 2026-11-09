// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LayoutContext } from "../../layout/layout_context.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { WaveView } from "./wave_view.tsx";

// The canvases need the audio engine and the settings, which these tests do not exercise
vi.mock("./overlay_layer.tsx", () => ({ OverlayLayer: () => null }));
vi.mock("./waveform_layer.tsx", () => ({ WaveformLayer: () => null }));

const WIDTH = 400;

function renderWave(layout: LayoutMode) {
    const onZoomChange = vi.fn<(zoom: number) => void>();
    const { container } = render(
        <LayoutContext.Provider value={layout}>
            <WaveView
                sampleId={1}
                data={new Float32Array(100_000)}
                loopStart={1000}
                loopEnd={90_000}
                onLoopStartChange={vi.fn()}
                onLoopEndChange={vi.fn()}
                onStepLoopStart={vi.fn()}
                onStepLoopEnd={vi.fn()}
                sampleRate={44_100}
                playbackStartTime={0}
                playerState={"stopped"}
                zoom={2}
                maxZoom={50}
                onZoomChange={onZoomChange}
                centCorrection={0}
            />
        </LayoutContext.Provider>
    );
    const wave = container.querySelector(".wave_view");
    if (!wave) {
        throw new Error("No wave.");
    }
    return { wave, onZoomChange, container };
}

describe("WaveView gestures", () => {
    beforeEach(() => {
        // jsdom lays nothing out, so the view reads this width
        Object.defineProperty(HTMLElement.prototype, "clientWidth", {
            get: () => WIDTH,
            configurable: true
        });
    });
    afterEach(() => {
        cleanup();
        Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    });

    it("zooms with two pointers on a phone", () => {
        const { wave, onZoomChange } = renderWave("phone");
        fireEvent.pointerDown(wave, { pointerId: 1, clientX: 150 });
        fireEvent.pointerDown(wave, { pointerId: 2, clientX: 250 });
        fireEvent.pointerMove(wave, { pointerId: 1, clientX: 100 });
        fireEvent.pointerMove(wave, { pointerId: 2, clientX: 300 });
        expect(onZoomChange).toHaveBeenCalled();
        // The fingers moved from 100 to 200 px apart
        expect(onZoomChange).toHaveBeenLastCalledWith(4);
    });

    it("keeps one pointer for the handles and the scroll", () => {
        const { wave, onZoomChange, container } = renderWave("phone");
        const scroller = container.querySelectorAll(".wave_view_child")[1];
        scroller.scrollLeft = 200;
        fireEvent.pointerDown(wave, { pointerId: 1, clientX: 200 });
        fireEvent.pointerMove(wave, { pointerId: 1, clientX: 150 });
        fireEvent.pointerUp(wave, { pointerId: 1, clientX: 150 });
        expect(onZoomChange).not.toHaveBeenCalled();
        // The finger moved 50 px left, so the wave follows it
        expect(scroller.scrollLeft).toBe(250);
    });

    it("does not pinch on a handle drag", () => {
        const { wave, onZoomChange, container } = renderWave("phone");
        const handle = container.querySelector(".wave_touch_handle");
        if (!handle) {
            throw new Error("No handle.");
        }
        handle.setPointerCapture = () => undefined;
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: 4 });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: 20 });
        fireEvent.pointerDown(wave, { pointerId: 2, clientX: 250 });
        fireEvent.pointerMove(wave, { pointerId: 2, clientX: 350 });
        expect(onZoomChange).not.toHaveBeenCalled();
    });

    it("does not pinch on desktop", () => {
        const { wave, onZoomChange } = renderWave("desktop");
        fireEvent.pointerDown(wave, { pointerId: 1, clientX: 150 });
        fireEvent.pointerDown(wave, { pointerId: 2, clientX: 250 });
        fireEvent.pointerMove(wave, { pointerId: 1, clientX: 100 });
        fireEvent.pointerMove(wave, { pointerId: 2, clientX: 300 });
        expect(onZoomChange).not.toHaveBeenCalled();
    });
});
