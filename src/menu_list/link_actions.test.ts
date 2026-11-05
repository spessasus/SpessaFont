import { describe, expect, it } from "vitest";
import { EmptySample, GeneratorTypes } from "spessasynth_core";
import { createTestSession, publishSetUp } from "../test_utils/bank_fixture.ts";
import {
    createInstrumentFromSamples,
    createPresetFromInstruments
} from "./link_actions.ts";

/**
 * The loop mode of the new instrument, the only one with a single zone (the list is sorted
 * by name, so it is not always the last).
 */
function getLoopMode(session: ReturnType<typeof createTestSession>) {
    const instrument = session.document.instruments.find(
        (i) => i.zones.length === 1
    );
    return instrument?.globalZone.getGenerator(GeneratorTypes.sampleModes, 0);
}

describe("createInstrumentFromSamples", () => {
    it("does not loop samples that loop their whole length, like imported files", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        sample.loopStart = 0;
        sample.loopEnd = sample.sampleLength;

        session.history.do([createInstrumentFromSamples([sample])]);

        expect(getLoopMode(session)).toBe(0);
    });

    it("loops when every sample has a loop of its own", () => {
        const session = createTestSession();
        const [sample] = session.document.samples;
        sample.loopStart = 10;
        sample.loopEnd = 100;

        session.history.do([createInstrumentFromSamples([sample])]);

        expect(getLoopMode(session)).toBe(1);
    });
});

describe("createInstrumentFromSamples spreading", () => {
    it("spreads samples with different root keys across the keyboard", () => {
        const session = createTestSession();
        const [low] = session.document.samples;
        low.originalKey = 48;
        const high = new EmptySample();
        high.name = "High";
        high.originalKey = 72;
        session.document.addSample(high);
        publishSetUp(session);

        const action = createInstrumentFromSamples([low, high]);
        session.history.do([action]);

        const instrument = session.document.instruments.find(
            (i) => i.zones.length === 2
        );
        expect(instrument?.zones.map((z) => z.keyRange)).toEqual([
            { min: 0, max: 60 },
            { min: 61, max: 127 }
        ]);
    });
});

describe("createPresetFromInstruments", () => {
    it("puts the new preset on the first free program of bank 0", () => {
        const session = createTestSession();
        // Both presets of the test bank use 000:000:000
        const action = createPresetFromInstruments(session.document, [
            session.document.instruments[0]
        ]);
        session.history.do([action]);

        const created = session.document.presets.find((p) => p.program === 1);
        expect(created?.bankMSB).toBe(0);
        expect(created?.bankLSB).toBe(0);
    });
});
