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

        expectRoundTrip(session, createDrumMapActions(instrument, 36));

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

    it("stops at the top of the keyboard", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        expect(createDrumMapActions(instrument, 127)).toHaveLength(2);
    });
});
