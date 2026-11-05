import { describe, expect, it } from "vitest";
import { type BasicInstrument, GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import {
    createAttenuationActions,
    getAttenuationStats,
    limitAttenuationOffset
} from "./attenuation_actions.ts";

const ATTENUATION = GeneratorTypes.initialAttenuation;
// What the table shows is centibels times 0.04, so a shown dB is 25 stored units
const DB = 25;

function getAttenuations(instrument: BasicInstrument) {
    return instrument.zones.map((z) => z.getGenerator(ATTENUATION, null));
}

describe("attenuation offset", () => {
    it("moves the lowest attenuation to a target and keeps the balance", () => {
        const session = createTestSession();
        const [first, second] = session.document.instruments;
        first.globalZone.setGenerator(ATTENUATION, null);
        second.globalZone.setGenerator(ATTENUATION, null);
        first.zones[0].setGenerator(ATTENUATION, 16 * DB);
        first.zones[1].setGenerator(ATTENUATION, 20 * DB);
        second.zones[0].setGenerator(ATTENUATION, 30 * DB);
        second.zones[1].setGenerator(ATTENUATION, 30 * DB);
        publishSetUp(session);
        const elements = [first, second];

        const stats = getAttenuationStats(elements);
        expect(stats).toMatchObject({ lowest: 16 * DB, highest: 30 * DB });
        if (!stats) {
            throw new Error("No stats.");
        }
        const offset = limitAttenuationOffset(stats, 5 * DB - stats.lowest);
        expectRoundTrip(session, createAttenuationActions(elements, offset));

        expect(getAttenuations(first)).toEqual([5 * DB, 9 * DB]);
        expect(getAttenuations(second)).toEqual([19 * DB, 19 * DB]);
    });

    it("reduces an offset that would go below the minimum", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.setGenerator(ATTENUATION, null);
        instrument.zones[0].setGenerator(ATTENUATION, 4 * DB);
        instrument.zones[1].setGenerator(ATTENUATION, 8 * DB);
        const stats = getAttenuationStats([instrument]);
        if (!stats) {
            throw new Error("No stats.");
        }
        expect(limitAttenuationOffset(stats, -10 * DB)).toBe(-4 * DB);
    });

    it("shifts the global value and the overrides, leaving the rest unset", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.setGenerator(ATTENUATION, 6 * DB);
        instrument.zones[0].setGenerator(ATTENUATION, 10 * DB);
        publishSetUp(session);

        expectRoundTrip(
            session,
            createAttenuationActions([instrument], 3 * DB)
        );

        expect(instrument.globalZone.getGenerator(ATTENUATION, null)).toBe(
            9 * DB
        );
        expect(getAttenuations(instrument)).toEqual([13 * DB, null]);
    });

    it("has no stats without zones and no actions for no offset", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        expect(createAttenuationActions([instrument], 0)).toEqual([]);
        instrument.zones.length = 0;
        expect(getAttenuationStats([instrument])).toBeUndefined();
    });
});
