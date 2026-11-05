import { describe, expect, it } from "vitest";
import {
    BasicInstrument,
    type BasicSample,
    EmptySample,
    GeneratorTypes,
    Modulator,
    ModulatorSource,
    SampleTypes
} from "spessasynth_core";
import {
    buildInstrumentView,
    buildSampleView
} from "../core_backend/entity_views.ts";
import { getObjectId } from "../utils/object_id.ts";
import {
    getModulatorColumns,
    getZoneColumns,
    type ZoneChildren
} from "./zone_columns.ts";

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
    instrument.createZone(left);
    instrument.createZone(right);
    instrument.createZone(mono);
    return { instrument, samples: [left, right, mono] };
}

function getChildren(samples: BasicSample[]): ZoneChildren {
    return {
        kind: "samples",
        views: new Map(
            samples.map((s) => [
                getObjectId(s),
                buildSampleView(s, { revision: 0, restored: undefined })
            ])
        )
    };
}

/**
 * Each column as the view ids of its zone and partner, and its span.
 */
function describeColumns(columns: ReturnType<typeof getZoneColumns>) {
    return columns.map((c) => [c.zone.id, c.linkedZone?.id, c.colSpan]);
}

describe("getZoneColumns", () => {
    it("merges an adjacent stereo pair into one column", () => {
        const { instrument, samples } = createStereoInstrument();
        const view = buildInstrumentView(instrument);
        const [left, right, mono] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples));

        expect(
            columns.map((c) => ({
                ...c,
                sample: c.sample?.name,
                linkedSample: c.linkedSample?.name
            }))
        ).toEqual([
            {
                zone: left,
                linkedZone: right,
                colSpan: 2,
                isStereo: true,
                name: "Piano",
                sample: "Piano L",
                linkedSample: "Piano R"
            },
            {
                zone: mono,
                linkedZone: undefined,
                colSpan: 1,
                isStereo: false,
                name: "Bell",
                sample: "Bell",
                linkedSample: undefined
            }
        ]);
    });

    it("splits the pair without linking the zones", () => {
        const { instrument, samples } = createStereoInstrument();
        const view = buildInstrumentView(instrument);
        const [left, right, mono] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples), true);

        expect(describeColumns(columns)).toEqual([
            [left.id, undefined, 1],
            [right.id, undefined, 1],
            [mono.id, undefined, 1]
        ]);
    });

    // An edit to one column must not change a value shown in another column
    it("does not link a partner that is not adjacent", () => {
        const { instrument, samples } = createStereoInstrument();
        const [leftZone, rightZone, monoZone] = instrument.zones;
        instrument.zones = [leftZone, monoZone, rightZone];
        const view = buildInstrumentView(instrument);
        const [left, mono, right] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples));

        expect(describeColumns(columns)).toEqual([
            [left.id, undefined, 1],
            [mono.id, undefined, 1],
            [right.id, undefined, 1]
        ]);
    });

    it("does not link a partner that is not adjacent when the pairs are split", () => {
        const { instrument, samples } = createStereoInstrument();
        const [leftZone, rightZone, monoZone] = instrument.zones;
        instrument.zones = [leftZone, monoZone, rightZone];
        const view = buildInstrumentView(instrument);
        const [left, mono, right] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples), true);

        expect(describeColumns(columns)).toEqual([
            [left.id, undefined, 1],
            [mono.id, undefined, 1],
            [right.id, undefined, 1]
        ]);
    });

    it("puts each zone in one column after a zone took a paired sample", () => {
        const { instrument, samples } = createStereoInstrument();
        const [left] = samples;
        const [leftZone, rightZone, monoZone] = instrument.zones;
        // "Replace sample" gave the mono zone, before the pair, the left half
        instrument.zones = [monoZone, leftZone, rightZone];
        monoZone.sample = left;
        const view = buildInstrumentView(instrument);
        const [mono, l, r] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples));
        const split = getZoneColumns(view.zones, getChildren(samples), true);

        expect(describeColumns(columns)).toEqual([
            [mono.id, undefined, 1],
            [l.id, r.id, 2]
        ]);
        // Every row spans as many columns as the split pan row has cells
        expect(columns.reduce((sum, c) => sum + c.colSpan, 0)).toBe(
            split.length
        );
    });
});

/**
 * The modulator row's columns of an instrument.
 */
function describeModulatorColumns(
    instrument: BasicInstrument,
    samples: BasicSample[]
) {
    const { zones } = buildInstrumentView(instrument);
    const children = getChildren(samples);
    const columns = getZoneColumns(zones, children);
    const split = getZoneColumns(zones, children, true);
    return {
        zones,
        described: describeColumns(getModulatorColumns(columns, split))
    };
}

describe("getModulatorColumns", () => {
    it("splits a pair whose zones have different modulators", () => {
        const { instrument, samples } = createStereoInstrument();
        const [leftZone] = instrument.zones;
        const equal = describeModulatorColumns(instrument, samples);
        expect(equal.described).toEqual([
            [equal.zones[0].id, equal.zones[1].id, 2],
            [equal.zones[2].id, undefined, 1]
        ]);

        const source = new ModulatorSource();
        leftZone.modulators = [
            new Modulator(source, source, GeneratorTypes.pan, 100, 0)
        ];
        const differ = describeModulatorColumns(instrument, samples);
        expect(differ.described).toEqual([
            [differ.zones[0].id, undefined, 1],
            [differ.zones[1].id, undefined, 1],
            [differ.zones[2].id, undefined, 1]
        ]);
    });
});
