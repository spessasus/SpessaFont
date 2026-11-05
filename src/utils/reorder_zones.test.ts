import { describe, expect, it } from "vitest";
import {
    BasicInstrument,
    type BasicInstrumentZone,
    EmptySample,
    SampleTypes
} from "spessasynth_core";
import { reorderInstrumentZones } from "./reorder_zones.ts";

function sample(name: string) {
    const s = new EmptySample();
    s.name = name;
    return s;
}

function zone(
    instrument: BasicInstrument,
    zoneSample: EmptySample,
    keyMax: number,
    velMin: number
) {
    const z = instrument.createZone(zoneSample);
    z.keyRange = { min: 0, max: keyMax };
    z.velRange = { min: velMin, max: 127 };
    return z;
}

const names = (zones: BasicInstrumentZone[]) => zones.map((z) => z.sample.name);

describe("reorderInstrumentZones", () => {
    it("sorts by key range start, then velocity range start", () => {
        const instrument = new BasicInstrument();
        const high = instrument.createZone(sample("high"));
        high.keyRange = { min: 60, max: 127 };
        const lowLoud = instrument.createZone(sample("low loud"));
        lowLoud.keyRange = { min: 0, max: 59 };
        lowLoud.velRange = { min: 64, max: 127 };
        const lowSoft = instrument.createZone(sample("low soft"));
        lowSoft.keyRange = { min: 0, max: 59 };
        lowSoft.velRange = { min: 0, max: 63 };

        expect(names(reorderInstrumentZones(instrument.zones))).toEqual([
            "low soft",
            "low loud",
            "high"
        ]);
    });

    it("places each stereo partner right after its zone, matching by range", () => {
        const instrument = new BasicInstrument();
        const left = sample("L");
        const right = sample("R");
        left.setLinkedSample(right, SampleTypes.leftSample);
        // Sorting alone gives L1, L2, R1, R2 because only the velocity start differs
        const l1 = zone(instrument, left, 60, 0);
        const l2 = zone(instrument, left, 127, 1);
        const r1 = zone(instrument, right, 60, 2);
        const r2 = zone(instrument, right, 127, 3);

        expect(reorderInstrumentZones(instrument.zones)).toEqual([
            l1,
            r1,
            l2,
            r2
        ]);
    });

    it("does not modify the input array", () => {
        const instrument = new BasicInstrument();
        instrument.createZone(sample("b")).keyRange = { min: 60, max: 127 };
        instrument.createZone(sample("a")).keyRange = { min: 0, max: 59 };
        const input = [...instrument.zones];

        reorderInstrumentZones(instrument.zones);

        expect(instrument.zones).toEqual(input);
    });

    it("orders by key first, so a high velocity layer does not jump ahead", () => {
        const instrument = new BasicInstrument();
        const high = instrument.createZone(sample("high"));
        high.keyRange = { min: 6, max: 11 };
        high.velRange = { min: 0, max: 99 };
        const low = instrument.createZone(sample("low"));
        low.keyRange = { min: 0, max: 5 };
        low.velRange = { min: 100, max: 127 };

        expect(reorderInstrumentZones(instrument.zones)).toEqual([low, high]);
    });
});
