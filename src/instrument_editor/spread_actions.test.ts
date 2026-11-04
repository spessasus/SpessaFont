import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { createSpreadActions } from "./spread_actions.ts";

describe("createSpreadActions", () => {
    it("splits the keyboard halfway between the zones' root keys", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [low, high] = instrument.zones;
        // The test instrument plays one sample twice, so the root keys come from the zones
        low.setGenerator(GeneratorTypes.overridingRootKey, 48);
        high.setGenerator(GeneratorTypes.overridingRootKey, 61);
        publishSetUp(session);

        expectRoundTrip(session, createSpreadActions(instrument));

        const ranges = instrument.zones.map((z) => ({ ...z.keyRange }));
        expect(ranges).toEqual([
            { min: 0, max: 54 },
            { min: 55, max: 127 }
        ]);
    });

    it("gives zones with the same root key the whole keyboard", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        for (const zone of instrument.zones) {
            zone.keyRange = { min: 60, max: 72 };
        }
        publishSetUp(session);

        expectRoundTrip(session, createSpreadActions(instrument));

        for (const zone of instrument.zones) {
            expect(zone.keyRange).toEqual({ min: 0, max: 127 });
        }
    });
});
