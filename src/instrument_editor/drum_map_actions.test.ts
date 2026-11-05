import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip
} from "../test_utils/bank_fixture.ts";
import { createDrumMapActions } from "./drum_map_actions.ts";

describe("createDrumMapActions", () => {
    it("puts each zone on its own key and plays it there unpitched", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;

        expectRoundTrip(session, createDrumMapActions(instrument, 36).actions);

        expect(
            instrument.zones.map((z) => [
                { ...z.keyRange },
                z.getGenerator(GeneratorTypes.overridingRootKey, -1)
            ])
        ).toEqual([
            [{ min: 36, max: 36 }, 36],
            [{ min: 37, max: 37 }, 37]
        ]);
    });

    it("stops at the top of the keyboard and counts the zones left out", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const { actions, skipped } = createDrumMapActions(instrument, 127);
        expect(actions).toHaveLength(2);
        expect(skipped).toBe(1);
    });

    it("rounds a fractional start key", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        session.history.do(createDrumMapActions(instrument, 35.6).actions);
        expect(instrument.zones[0].keyRange).toEqual({ min: 36, max: 36 });
    });
});
