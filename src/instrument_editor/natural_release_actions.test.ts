import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { tc2s } from "../utils/conversion_helpers.ts";
import {
    createNaturalReleaseActions,
    isEnvelopeReplaced
} from "./natural_release_actions.ts";

function setUpKeys(session: ReturnType<typeof createTestSession>) {
    const [instrument] = session.document.instruments;
    const [sample] = session.document.samples;
    const [first, second] = instrument.zones;
    const third = instrument.createZone(sample);
    first.keyRange = { min: 36, max: 36 };
    second.keyRange = { min: 48, max: 48 };
    third.keyRange = { min: 24, max: 24 };
    publishSetUp(session);
    return instrument;
}

describe("createNaturalReleaseActions", () => {
    it("halves the release every octave up from key 36", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const release = { seconds: 2, factorPerOctave: 0.5, detune: 0 };

        const { actions } = createNaturalReleaseActions([instrument], release);
        const { before, after } = expectRoundTrip(session, actions);

        const seconds = instrument.zones.map((z) =>
            tc2s(z.getGenerator(GeneratorTypes.releaseVolEnv, 0))
        );
        expect(seconds[0]).toBeCloseTo(2, 2);
        expect(seconds[1]).toBeCloseTo(1, 2);
        expect(seconds[2]).toBeCloseTo(4, 2);
        // Only the release changed
        const generatorsOf = (s: typeof before) =>
            s.instruments[0].zones.map((z) =>
                z.generators.filter(
                    (g) => g.type !== GeneratorTypes.releaseVolEnv
                )
            );
        expect(generatorsOf(after)).toEqual(generatorsOf(before));

        expect(
            createNaturalReleaseActions([instrument], release).actions
        ).toEqual([]);
    });

    it("detunes during the release and keeps the held pitch", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const [zone] = instrument.zones;
        zone.setGenerator(GeneratorTypes.fineTune, 10);
        publishSetUp(session);
        const release = { seconds: 1, factorPerOctave: 1, detune: 50 };

        const { actions } = createNaturalReleaseActions([instrument], release);
        expectRoundTrip(session, actions);

        expect(zone.getGenerator(GeneratorTypes.modEnvToPitch, null)).toBe(-50);
        expect(zone.getGenerator(GeneratorTypes.sustainModEnv, null)).toBe(0);
        expect(
            zone.getGenerator(GeneratorTypes.coarseTune, 0) * 100 +
                zone.getGenerator(GeneratorTypes.fineTune, 0)
        ).toBe(60);
        // A second run starts from the tuning before the first one
        expect(
            createNaturalReleaseActions([instrument], release).actions
        ).toEqual([]);
    });

    it("counts a modulation envelope the zones play from the global zone", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        instrument.globalZone.setGenerator(GeneratorTypes.decayModEnv, 5169);
        instrument.globalZone.setGenerator(GeneratorTypes.sustainModEnv, 1000);
        publishSetUp(session);
        const release = { seconds: 1, factorPerOctave: 1, detune: 10 };

        expect(
            instrument.zones.filter((z) => isEnvelopeReplaced(instrument, z))
        ).toHaveLength(3);
        const { actions, overwritten } = createNaturalReleaseActions(
            [instrument],
            release
        );
        expect(overwritten).toBe(3);
        expectRoundTrip(session, actions);
        // A second run replaces only its own envelope, so nothing is warned about
        expect(
            instrument.zones.filter((z) => isEnvelopeReplaced(instrument, z))
        ).toHaveLength(0);
    });

    it("removes an earlier detune when run with none", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const [zone] = instrument.zones;
        zone.setGenerator(GeneratorTypes.fineTune, 10);
        publishSetUp(session);
        session.history.do(
            createNaturalReleaseActions([instrument], {
                seconds: 1,
                factorPerOctave: 1,
                detune: 50
            }).actions
        );

        const { actions } = createNaturalReleaseActions([instrument], {
            seconds: 4,
            factorPerOctave: 1,
            detune: 0
        });
        // Not a full round trip: unsetting and setting again moves generators to the end
        session.history.do(actions);

        expect(zone.getGenerator(GeneratorTypes.modEnvToPitch, null)).toBe(
            null
        );
        expect(zone.getGenerator(GeneratorTypes.releaseModEnv, null)).toBe(
            null
        );
        expect(
            zone.getGenerator(GeneratorTypes.coarseTune, 0) * 100 +
                zone.getGenerator(GeneratorTypes.fineTune, 0)
        ).toBe(10);
        session.history.undo();
        expect(zone.getGenerator(GeneratorTypes.modEnvToPitch, null)).toBe(-50);
    });

    it("gives a zone without a range the release of the global zone's keys", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const [zone] = instrument.zones;
        instrument.globalZone.keyRange = { min: 48, max: 48 };
        zone.keyRange = { min: -1, max: 127 };
        publishSetUp(session);

        session.history.do(
            createNaturalReleaseActions([instrument], {
                seconds: 2,
                factorPerOctave: 0.5,
                detune: 0
            }).actions
        );

        expect(
            tc2s(zone.getGenerator(GeneratorTypes.releaseVolEnv, 0))
        ).toBeCloseTo(1, 2);
    });

    it("counts clamped releases", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const { clamped } = createNaturalReleaseActions([instrument], {
            seconds: 100,
            factorPerOctave: 10,
            detune: 0
        });
        expect(clamped).toBeGreaterThan(0);
    });
});
