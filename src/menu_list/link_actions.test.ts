import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import { createTestSession } from "../test_utils/bank_fixture.ts";
import { createInstrumentFromSamples } from "./link_actions.ts";

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
