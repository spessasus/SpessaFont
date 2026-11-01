import { describe, expect, it } from "vitest";
import { BasicInstrument, EmptySample, SampleTypes } from "spessasynth_core";
import { getZoneColumns } from "./zone_columns.ts";

function createSample(name: string) {
    const sample = new EmptySample();
    sample.name = name;
    return sample;
}

function createStereoInstrument() {
    const left = createSample("Piano L");
    const right = createSample("Piano R");
    left.setLinkedSample(right, SampleTypes.leftSample);
    const mono = createSample("Bell");
    const instrument = new BasicInstrument();
    const leftZone = instrument.createZone(left);
    const rightZone = instrument.createZone(right);
    const monoZone = instrument.createZone(mono);
    return { instrument, leftZone, rightZone, monoZone };
}

describe("getZoneColumns", () => {
    it("merges an adjacent stereo pair into one column", () => {
        const { instrument, leftZone, rightZone, monoZone } =
            createStereoInstrument();
        const columns = getZoneColumns(instrument.zones);
        expect(columns).toEqual([
            {
                zone: leftZone,
                linkedZone: rightZone,
                colSpan: 2,
                isStereo: true,
                name: "Piano"
            },
            {
                zone: monoZone,
                linkedZone: undefined,
                colSpan: 1,
                isStereo: false,
                name: "Bell"
            }
        ]);
    });

    it("splits the pair without linking the zones", () => {
        const { instrument, leftZone, rightZone } = createStereoInstrument();
        const columns = getZoneColumns(instrument.zones, true);
        expect(columns.map((c) => [c.zone, c.linkedZone, c.colSpan])).toEqual([
            [leftZone, undefined, 1],
            [rightZone, undefined, 1],
            [instrument.zones[2], undefined, 1]
        ]);
    });

    it("links a partner that is not adjacent without merging", () => {
        const { instrument, leftZone, rightZone, monoZone } =
            createStereoInstrument();
        instrument.zones = [leftZone, monoZone, rightZone];
        const columns = getZoneColumns(instrument.zones);
        expect(columns.map((c) => [c.zone, c.linkedZone, c.colSpan])).toEqual([
            [leftZone, rightZone, 1],
            [monoZone, undefined, 1],
            [rightZone, leftZone, 1]
        ]);
    });
});
