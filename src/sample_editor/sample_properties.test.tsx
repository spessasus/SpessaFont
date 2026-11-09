// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { SampleTypes } from "spessasynth_core";
import { LayoutContext } from "../layout/layout_context.ts";
import type { LayoutMode } from "../layout/layout_setting.ts";
import type { SampleView } from "../core_backend/entity_views.ts";
import { SampleProperties } from "./sample_properties.tsx";

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
                    setOriginalKey: vi.fn(),
                    setCentCorrection: vi.fn(),
                    setType: vi.fn(),
                    pickLinkedSample: vi.fn()
                }}
            />
        </LayoutContext>
    );
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
});
