import { describe, expect, it } from "vitest";
import { GeneratorTypes, Modulator, SampleTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import {
    countSplitZones,
    getSplitRanges,
    SplitZonesAction
} from "./split_zones_action.ts";

describe("getSplitRanges", () => {
    it("splits by the step, the last range shorter", () => {
        expect(getSplitRanges({ min: 0, max: 127 }, 32)).toEqual([
            { min: 0, max: 31 },
            { min: 32, max: 63 },
            { min: 64, max: 95 },
            { min: 96, max: 127 }
        ]);
        expect(getSplitRanges({ min: 10, max: 14 }, 2)).toEqual([
            { min: 10, max: 11 },
            { min: 12, max: 13 },
            { min: 14, max: 14 }
        ]);
        expect(getSplitRanges({ min: 0, max: 127 }, 1)).toHaveLength(128);
    });
});

describe("SplitZonesAction", () => {
    it("makes one copy of a zone per key, in its place, and undo gives it back", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [zone, other] = instrument.zones;
        zone.keyRange = { min: 36, max: 38 };
        other.keyRange = { min: 60, max: 60 };
        zone.setGenerator(GeneratorTypes.initialAttenuation, 75);
        zone.modulators.push(
            Modulator.copyFrom(session.document.bank.defaultModulators[0])
        );
        publishSetUp(session);

        const { before } = expectRoundTrip(session, [
            new SplitZonesAction(instrument, { mode: "key", step: 1 })
        ]);

        expect(instrument.zones).toHaveLength(4);
        expect(instrument.zones[0]).toBe(zone);
        expect(instrument.zones[3]).toBe(other);
        for (const [i, split] of instrument.zones.slice(0, 3).entries()) {
            expect(split.keyRange).toEqual({ min: 36 + i, max: 36 + i });
            expect(
                split.getGenerator(GeneratorTypes.initialAttenuation, 0)
            ).toBe(75);
            expect(split.modulators).toHaveLength(1);
            expect(split.sample).toBe(zone.sample);
        }
        session.history.undo();
        expect(instrument.zones).toEqual([zone, other]);
        expect(before.instruments[0].zones).toHaveLength(2);
    });

    it("splits a stereo pair together, so each key has both halves", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        while (instrument.zones.length > 0) {
            session.document.removeZone(instrument, instrument.zones[0]);
        }
        const leftZone = instrument.createZone(left);
        const rightZone = instrument.createZone(right);
        leftZone.keyRange = { min: 60, max: 61 };
        rightZone.keyRange = { min: 60, max: 61 };
        publishSetUp(session);

        expectRoundTrip(session, [
            new SplitZonesAction(instrument, { mode: "key", step: 1 })
        ]);

        expect(
            instrument.zones.map((z) => [z.sample.name, z.keyRange.min])
        ).toEqual([
            [left.name, 60],
            [right.name, 60],
            [left.name, 61],
            [right.name, 61]
        ]);
    });

    it("splits velocity by a step and counts what it would make", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        const split = { mode: "velocity", step: 32 } as const;
        expect(countSplitZones(preset, split).isChanged).toBe(true);

        expectRoundTrip(session, [new SplitZonesAction(preset, split)]);

        expect(preset.zones.map((z) => ({ ...z.velRange }))).toEqual([
            { min: 0, max: 31 },
            { min: 32, max: 63 },
            { min: 64, max: 95 },
            { min: 96, max: 127 }
        ]);
    });

    it("splits the keys a zone inherits from the global zone", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [inheriting, other] = instrument.zones;
        instrument.globalZone.keyRange = { min: 36, max: 59 };
        inheriting.keyRange = { min: -1, max: 127 };
        other.keyRange = { min: 60, max: 72 };
        publishSetUp(session);

        expectRoundTrip(session, [
            new SplitZonesAction(
                instrument,
                { mode: "key", step: 12 },
                new Set([inheriting])
            )
        ]);

        expect(
            instrument.zones.map((z) => `${z.keyRange.min}-${z.keyRange.max}`)
        ).toEqual(["36-47", "48-59", "60-72"]);
    });

    it("keeps velocity layers split by key in key order", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [soft, loud] = instrument.zones;
        soft.keyRange = { min: 0, max: 23 };
        soft.velRange = { min: 0, max: 63 };
        loud.keyRange = { min: 0, max: 23 };
        loud.velRange = { min: 64, max: 127 };
        session.document.sortZones(instrument);
        publishSetUp(session);

        expectRoundTrip(session, [
            new SplitZonesAction(instrument, { mode: "key", step: 12 })
        ]);

        expect(
            instrument.zones.map((z) => `${z.keyRange.min}/${z.velRange.min}`)
        ).toEqual(["0/0", "0/64", "12/0", "12/64"]);
    });

    it("has nothing to split in single key zones", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        for (const zone of instrument.zones) {
            zone.keyRange = { min: 40, max: 40 };
        }
        expect(
            countSplitZones(instrument, { mode: "key", step: 1 }).isChanged
        ).toBe(false);
    });
});
