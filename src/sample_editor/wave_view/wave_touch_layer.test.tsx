// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import { type BasicSample, EmptySample } from "spessasynth_core";
import { LayoutContext } from "../../layout/layout_context.ts";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import type { BankSession } from "../../core_backend/bank_session.ts";
import { BankEditorContext } from "../../bank_editor/bank_editor_context.ts";
import {
    type DialogsAPI,
    DialogsContext
} from "../../dialogs/dialogs_context.ts";
import { useSampleView } from "../../hooks/use_sample_view.ts";
import { getObjectId } from "../../utils/object_id.ts";
import type { SampleView } from "../../core_backend/entity_views.ts";
import { useSampleEdits } from "../use_sample_edits.ts";
import type { LayoutMode } from "../../layout/layout_setting.ts";
import { type LoopPreview, WaveTouchLayer } from "./wave_touch_layer.tsx";
import { WaveView } from "./wave_view.tsx";

// The canvases need the audio engine and the settings, which these tests do not exercise
vi.mock("./overlay_layer.tsx", () => ({
    OverlayLayer: ({
        loopStart,
        loopEnd
    }: {
        loopStart: number;
        loopEnd: number;
    }) => <canvas data-loop={`${loopStart}-${loopEnd}`} />
}));
vi.mock("./waveform_layer.tsx", () => ({ WaveformLayer: () => null }));

const WIDTH = 400;
const LENGTH = 1000;

beforeAll(() => {
    // jsdom has no pointer capture
    if (!("setPointerCapture" in Element.prototype)) {
        Object.defineProperty(Element.prototype, "setPointerCapture", {
            value: () => undefined,
            configurable: true
        });
    }
});

function renderLayer(zoom = 1) {
    const onPreviewChange = vi.fn<(preview: LoopPreview | null) => void>();
    const onLoopStartChange = vi.fn<(point: number) => void>();
    const onLoopEndChange = vi.fn<(point: number) => void>();
    const onStepLoopStart = vi.fn<(by: number) => void>();
    const onStepLoopEnd = vi.fn<(by: number) => void>();
    render(
        <WaveTouchLayer
            viewport={{ sampleCount: LENGTH, width: WIDTH, zoom, scrollX: 0 }}
            loopStart={100}
            loopEnd={800}
            sampleLength={LENGTH}
            sampleRate={44_100}
            onPreviewChange={onPreviewChange}
            onLoopStartChange={onLoopStartChange}
            onLoopEndChange={onLoopEndChange}
            onStepLoopStart={onStepLoopStart}
            onStepLoopEnd={onStepLoopEnd}
        />
    );
    return {
        onPreviewChange,
        onLoopStartChange,
        onLoopEndChange,
        onStepLoopStart,
        onStepLoopEnd
    };
}

function getHandle(name: string) {
    return screen.getByRole("slider", { name });
}

/**
 * x in the 400 px view for a sample index of the 1000 long sample, at zoom 1.
 */
function xOf(sample: number) {
    return (sample / LENGTH) * WIDTH;
}

describe("WaveTouchLayer", () => {
    afterEach(cleanup);

    it("moves the loop start with a drag and commits once on release", () => {
        const { onLoopStartChange } = renderLayer();
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        for (const sample of [200, 300, 400]) {
            fireEvent.pointerMove(handle, {
                pointerId: 1,
                clientX: xOf(sample)
            });
        }
        expect(onLoopStartChange).not.toHaveBeenCalled();
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: xOf(400) });
        expect(onLoopStartChange).toHaveBeenCalledExactlyOnceWith(400);
    });

    it("shows a preview while dragging and clears it on release", () => {
        const { onPreviewChange } = renderLayer();
        const handle = getHandle("phoneLocale.wave.loopEndHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(800) });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: xOf(600) });
        expect(onPreviewChange).toHaveBeenLastCalledWith({
            property: "loopEnd",
            point: 600
        });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: xOf(600) });
        expect(onPreviewChange).toHaveBeenLastCalledWith(null);
    });

    it("keeps the start before the end while dragging", () => {
        const { onPreviewChange, onLoopStartChange } = renderLayer();
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: xOf(950) });
        expect(onPreviewChange).toHaveBeenLastCalledWith({
            property: "loopStart",
            point: 800
        });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: xOf(950) });
        expect(onLoopStartChange).toHaveBeenCalledExactlyOnceWith(800);
    });

    it("commits nothing when the pointer is canceled", () => {
        const { onPreviewChange, onLoopStartChange } = renderLayer();
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: xOf(300) });
        fireEvent.pointerCancel(handle, { pointerId: 1 });
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: xOf(300) });
        expect(onLoopStartChange).not.toHaveBeenCalled();
        expect(onPreviewChange).toHaveBeenLastCalledWith(null);
    });

    it("steps the loop end with the arrow keys", () => {
        const { onStepLoopEnd } = renderLayer();
        const handle = getHandle("phoneLocale.wave.loopEndHandle");
        fireEvent.keyDown(handle, { key: "ArrowRight" });
        fireEvent.keyDown(handle, { key: "ArrowRight", shiftKey: true });
        fireEvent.keyDown(handle, { key: "ArrowLeft" });
        expect(onStepLoopEnd.mock.calls).toEqual([[1], [100], [-1]]);
    });

    it("hides the handle of a point outside the view", () => {
        // At zoom 4 the view shows samples 0 to 250, so the end at 800 is out
        renderLayer(4);
        expect(getHandle("phoneLocale.wave.loopStartHandle")).toBeTruthy();
        expect(
            screen.queryByRole("slider", {
                name: "phoneLocale.wave.loopEndHandle"
            })
        ).toBeNull();
    });

    it("tells the value of each handle", () => {
        renderLayer();
        const start = getHandle("phoneLocale.wave.loopStartHandle");
        expect(start.getAttribute("aria-valuenow")).toBe("100");
        expect(start.getAttribute("aria-valuemax")).toBe("800");
        const end = getHandle("phoneLocale.wave.loopEndHandle");
        expect(end.getAttribute("aria-valuemin")).toBe("100");
        expect(end.getAttribute("aria-valuemax")).toBe(String(LENGTH));
    });
});

function renderWave(layout: LayoutMode) {
    // jsdom lays nothing out and has no ResizeObserver, so the view reads this width
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        get: () => WIDTH,
        configurable: true
    });
    const onLoopStartChange = vi.fn<(point: number) => void>();
    const tree = (id: number) => (
        <LayoutContext.Provider value={layout}>
            <WaveView
                sampleId={id}
                data={new Float32Array(LENGTH)}
                loopStart={100}
                loopEnd={800}
                onLoopStartChange={onLoopStartChange}
                onLoopEndChange={vi.fn()}
                onStepLoopStart={vi.fn()}
                onStepLoopEnd={vi.fn()}
                sampleRate={44_100}
                playbackStartTime={0}
                playerState={"stopped"}
                zoom={1}
                centCorrection={0}
            />
        </LayoutContext.Provider>
    );
    const { rerender, container } = render(tree(1));
    return {
        onLoopStartChange,
        container,
        rerender: (id: number) => rerender(tree(id))
    };
}

describe("WaveView with loop handles", () => {
    afterEach(() => {
        cleanup();
        // The prototype's own getter comes back
        Reflect.deleteProperty(HTMLElement.prototype, "clientWidth");
    });

    it("shows the dragged point in the wave and a readout", () => {
        const { container } = renderWave("phone");
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: xOf(250) });
        expect(container.querySelector("canvas")?.dataset.loop).toBe("250-800");
        expect(
            container.querySelector(".wave_touch_readout")?.textContent
        ).toContain("250");
    });

    it("drops the drag when the sample changes", () => {
        const { container, rerender, onLoopStartChange } = renderWave("phone");
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        fireEvent.pointerMove(handle, { pointerId: 1, clientX: xOf(250) });
        rerender(2);
        fireEvent.pointerUp(getHandle("phoneLocale.wave.loopStartHandle"), {
            pointerId: 1,
            clientX: xOf(250)
        });
        expect(onLoopStartChange).not.toHaveBeenCalled();
        expect(container.querySelector("canvas")?.dataset.loop).toBe("100-800");
        expect(container.querySelector(".wave_touch_readout")).toBeNull();
    });

    it("renders no layer on desktop", () => {
        renderWave("desktop");
        expect(screen.queryByRole("slider")).toBeNull();
    });
});

interface EditsHarnessProps {
    session: BankSession;
    sample: BasicSample;
}

/**
 * The handles on a real sample, committing through the editor's sample edits.
 */
function EditsHarness({ session, sample }: EditsHarnessProps) {
    const view = useSampleView(session.store, getObjectId(sample));
    if (!view) {
        throw new Error("The sample has no view.");
    }
    return <HandlesWithEdits sample={sample} view={view} />;
}

interface HandlesWithEditsProps {
    sample: BasicSample;
    view: SampleView;
}

function HandlesWithEdits({ sample, view }: HandlesWithEditsProps) {
    const edits = useSampleEdits(sample, view);
    return (
        <WaveTouchLayer
            viewport={{
                sampleCount: view.length,
                width: WIDTH,
                zoom: 1,
                scrollX: 0
            }}
            loopStart={view.loopStart}
            loopEnd={view.loopEnd}
            sampleLength={view.length}
            sampleRate={44_100}
            onPreviewChange={() => undefined}
            onLoopStartChange={edits.setLoopStart}
            onLoopEndChange={edits.setLoopEnd}
            onStepLoopStart={edits.stepLoopStart}
            onStepLoopEnd={edits.stepLoopEnd}
        />
    );
}

describe("loop handles on a bank", () => {
    afterEach(cleanup);

    it("makes one drag one undo step", () => {
        const session = createTestSession();
        const sample = new EmptySample();
        sample.name = "Looped";
        sample.setAudioData(new Float32Array(LENGTH), 44_100);
        sample.loopStart = 100;
        sample.loopEnd = 800;
        session.document.addSample(sample);
        publishSetUp(session);
        const dialogs: DialogsAPI = {
            pickElement: () => Promise.resolve(undefined),
            askNumber: () => Promise.resolve(undefined),
            openDialog: () => Promise.resolve(undefined)
        };
        render(
            <BankEditorContext
                value={{
                    session,
                    apply: (actions, key) => session.history.do(actions, key),
                    setView: () => undefined,
                    playSample: () => undefined
                }}
            >
                <DialogsContext value={dialogs}>
                    <EditsHarness session={session} sample={sample} />
                </DialogsContext>
            </BankEditorContext>
        );
        const handle = getHandle("phoneLocale.wave.loopStartHandle");
        fireEvent.pointerDown(handle, { pointerId: 1, clientX: xOf(100) });
        for (const point of [150, 200, 300]) {
            fireEvent.pointerMove(handle, {
                pointerId: 1,
                clientX: xOf(point)
            });
        }
        fireEvent.pointerUp(handle, { pointerId: 1, clientX: xOf(300) });
        expect(sample.loopStart).toBe(300);
        act(() => {
            session.history.undo();
        });
        expect(sample.loopStart).toBe(100);
        expect(session.history.canUndo).toBe(false);
    });
});
