// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen
} from "@testing-library/react";
import type { ForwardedSynthEvent } from "../synth_host/protocol.ts";
import { SampleTypes } from "spessasynth_core";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import type { SampleView } from "../core_backend/entity_views.ts";
import { SampleProperties } from "./sample_properties.tsx";
import { PhoneShellContext } from "../phone_shell/phone_shell_context.ts";
import { createShellContext } from "../test_utils/shell_context.ts";

const handlers = vi.hoisted(() => ({
    current: undefined as ((event: ForwardedSynthEvent) => void) | undefined
}));

// Subscribes while mounted, as the real hook does with the engine's events
vi.mock("../hooks/use_synth_event.ts", async () => {
    const { useEffect } =
        await vi.importActual<typeof import("react")>("react");
    return {
        useSynthEvent: (handler: (event: ForwardedSynthEvent) => void) => {
            useEffect(() => {
                handlers.current = handler;
                return () => {
                    handlers.current = undefined;
                };
            });
        }
    };
});

afterEach(() => {
    cleanup();
});

const SAMPLE: SampleView = {
    id: 1,
    name: "Sample",
    sampleRate: 44_100,
    originalKey: 60,
    pitchCorrection: 0,
    loopStart: 10,
    loopEnd: 20,
    type: SampleTypes.monoSample,
    linkedSampleId: undefined,
    length: 100,
    isCompressed: false,
    usedBy: [],
    audioRevision: 0
};

function renderProperties(layout: LayoutMode) {
    const setOriginalKey = vi.fn();
    render(
        <LayoutContext value={layout}>
            <SampleProperties
                sample={SAMPLE}
                partnerName={undefined}
                canLink={false}
                edits={{
                    setName: vi.fn(),
                    setLoopStart: vi.fn(() => 0),
                    setLoopEnd: vi.fn(() => 0),
                    stepLoopStart: vi.fn(),
                    stepLoopEnd: vi.fn(),
                    setSampleRate: vi.fn(),
                    setOriginalKey,
                    setCentCorrection: vi.fn(),
                    setType: vi.fn(),
                    pickLinkedSample: vi.fn()
                }}
            />
        </LayoutContext>
    );
    return setOriginalKey;
}

describe("SampleProperties", () => {
    it("shows the loop points on desktop", () => {
        renderProperties("desktop");
        expect(screen.getByLabelText("sampleLocale.loopStart")).toBeTruthy();
        expect(screen.getByLabelText("sampleLocale.loopEnd")).toBeTruthy();
    });

    it("leaves the loop points to the Loop section on a phone", () => {
        renderProperties("phone");
        expect(screen.queryByLabelText("sampleLocale.loopStart")).toBeNull();
        expect(screen.queryByLabelText("sampleLocale.loopEnd")).toBeNull();
        expect(screen.getByLabelText("sampleLocale.sampleRate")).toBeTruthy();
    });

    it("sets the original key from one played key on a phone", () => {
        const setOriginalKey = renderProperties("phone");
        fireEvent.click(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        );
        act(() => {
            handlers.current?.({
                type: "noteOn",
                data: { channel: 0, midiNote: 67, velocity: 100 }
            });
        });
        expect(setOriginalKey).toHaveBeenCalledWith(67);
    });

    it("shows no piano button on desktop", () => {
        renderProperties("desktop");
        expect(
            screen.queryByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        ).toBeNull();
    });

    it("cancels from the capture bar without opening the keys", () => {
        const dispatch = vi.fn();
        const setOriginalKey = vi.fn();
        render(
            <LayoutContext value={"phone"}>
                <PhoneShellContext
                    value={createShellContext(undefined, dispatch)}
                >
                    <SampleProperties
                        sample={SAMPLE}
                        partnerName={undefined}
                        canLink={false}
                        edits={{
                            setName: vi.fn(),
                            setLoopStart: vi.fn(() => 0),
                            setLoopEnd: vi.fn(() => 0),
                            stepLoopStart: vi.fn(),
                            stepLoopEnd: vi.fn(),
                            setSampleRate: vi.fn(),
                            setOriginalKey,
                            setCentCorrection: vi.fn(),
                            setType: vi.fn(),
                            pickLinkedSample: vi.fn()
                        }}
                    />
                </PhoneShellContext>
            </LayoutContext>
        );
        const button = screen.getByRole("button", {
            name: "phoneLocale.cellSheet.setFromPiano"
        });
        fireEvent.click(button);
        expect(dispatch).toHaveBeenCalledOnce();
        // The bar takes the button's place while it waits
        expect(button.isConnected).toBe(false);
        fireEvent.click(
            screen.getByRole("button", { name: "phoneLocale.capture.cancel" })
        );
        // The cancel leaves the drawer as it is
        expect(dispatch).toHaveBeenCalledOnce();
        expect(
            screen.getByRole("button", {
                name: "phoneLocale.cellSheet.setFromPiano"
            })
        ).toBeTruthy();
        act(() => {
            handlers.current?.({
                type: "noteOn",
                data: { channel: 0, midiNote: 67, velocity: 100 }
            });
        });
        expect(setOriginalKey).not.toHaveBeenCalled();
    });
});
