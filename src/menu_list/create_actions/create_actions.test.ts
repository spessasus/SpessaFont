import { describe, expect, it, vi } from "vitest";
import { BasicInstrument, BasicPreset, EmptySample } from "spessasynth_core";
import {
    createTestManager,
    expectRoundTrip
} from "../../test_utils/bank_fixture.ts";
import { CreateSampleAction } from "./create_sample_action.ts";
import { CreateInstrumentAction } from "./create_instrument_action.ts";
import { CreatePresetAction } from "./create_preset_actions.ts";

const noop = () => undefined;

describe("CreateSampleAction", () => {
    it("appends a sample and selects it, then selects the first sample on undo", () => {
        const manager = createTestManager();
        const sample = new EmptySample();
        sample.name = "New Sample";
        const setView = vi.fn();

        const { after } = expectRoundTrip(manager, [
            new CreateSampleAction(sample, noop, setView)
        ]);
        expect(after.samples.at(-1)?.name).toBe("New Sample");
        expect(setView).toHaveBeenLastCalledWith(sample);

        manager.undo();
        expect(setView).toHaveBeenLastCalledWith(manager.samples[0]);
    });
});

describe("CreateInstrumentAction", () => {
    it("appends an instrument and selects it, then selects the first instrument on undo", () => {
        const manager = createTestManager();
        const instrument = new BasicInstrument();
        instrument.name = "New Instrument";
        const setView = vi.fn();

        const { after } = expectRoundTrip(manager, [
            new CreateInstrumentAction(instrument, noop, setView)
        ]);
        expect(after.instruments.at(-1)?.name).toBe("New Instrument");
        expect(setView).toHaveBeenLastCalledWith(instrument);

        manager.undo();
        expect(setView).toHaveBeenLastCalledWith(manager.instruments[0]);
    });
});

describe("CreatePresetAction", () => {
    it("inserts a preset in sorted order and selects it, then selects the first preset on undo", () => {
        const manager = createTestManager();
        const preset = new BasicPreset(manager);
        preset.name = "New Preset";
        preset.program = 5;
        const setView = vi.fn();

        const { after } = expectRoundTrip(manager, [
            new CreatePresetAction(preset, noop, setView)
        ]);
        expect(after.presets.map((p) => p.program)).toEqual(
            after.presets
                .map((p) => p.program)
                .slice()
                .sort((a, b) => a - b)
        );
        expect(setView).toHaveBeenLastCalledWith(preset);

        manager.undo();
        expect(setView).toHaveBeenLastCalledWith(manager.presets[0]);
    });
});
