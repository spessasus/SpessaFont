import { describe, expect, it } from "vitest";
import { BasicInstrument, BasicPreset, EmptySample } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../../test_utils/bank_fixture.ts";
import { CreateSampleAction } from "./create_sample_action.ts";
import { CreateInstrumentAction } from "./create_instrument_action.ts";
import { CreatePresetAction } from "./create_preset_action.ts";

describe("CreateSampleAction", () => {
    it("inserts a sample in name order and focuses it, then its neighbor on undo", () => {
        const session = createTestSession();
        const sample = new EmptySample();
        sample.name = "A New Sample";

        const { after, doFocus, undoFocus } = expectRoundTrip(session, [
            new CreateSampleAction(sample)
        ]);
        expect(after.samples.map((s) => s.name)).toEqual([
            "A New Sample",
            "Saw",
            "Saw 2"
        ]);
        expect(doFocus).toBe(sample);
        expect(undoFocus).toBe(session.document.samples[1]);
    });
});

describe("CreateInstrumentAction", () => {
    it("inserts an instrument in name order, links its samples and focuses it", () => {
        const session = createTestSession();
        const sample = session.document.samples[0];
        const instrument = new BasicInstrument();
        instrument.name = "Z New Instrument";

        const { after, doFocus, undoFocus } = expectRoundTrip(session, () => {
            instrument.createZone(sample);
            return [new CreateInstrumentAction(instrument)];
        });
        expect(after.instruments.at(-1)?.name).toBe("Z New Instrument");
        expect(sample.linkedTo).toContain(instrument);
        expect(doFocus).toBe(instrument);
        expect(undoFocus).toBe(session.document.instruments.at(-2));

        session.history.undo();
        expect(sample.linkedTo).not.toContain(instrument);
    });
});

describe("CreatePresetAction", () => {
    it("inserts a preset in sorted order, links its instruments and focuses it", () => {
        const session = createTestSession();
        const instrument = session.document.instruments[0];
        const preset = new BasicPreset(session.document.bank);
        preset.name = "New Preset";
        preset.program = 5;

        const { after, doFocus, undoFocus } = expectRoundTrip(session, () => {
            preset.createZone(instrument);
            return [new CreatePresetAction(preset)];
        });
        expect(after.presets.map((p) => p.program)).toEqual(
            after.presets.map((p) => p.program).toSorted((a, b) => a - b)
        );
        expect(doFocus).toBe(preset);
        // The preset before it, not the first one of the bank
        const index = session.document.presets.indexOf(preset);
        expect(undoFocus).toBe(session.document.presets[index - 1]);

        session.history.undo();
        expect(instrument.linkedTo).not.toContain(preset);
        session.history.redo();
        expect(instrument.linkedTo).toContain(preset);
    });
});
