import { describe, expect, it } from "vitest";
import {
    BasicInstrument,
    type BasicSample,
    EmptySample,
    SampleTypes
} from "spessasynth_core";
import {
    buildInstrumentView,
    buildSampleView
} from "../core_backend/entity_views.ts";
import { getObjectId } from "../utils/object_id.ts";
import { getZoneColumns, type ZoneChildren } from "./zone_columns.ts";

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

        expect(columns.map((c) => ({ ...c, sample: c.sample?.name }))).toEqual([
            {
                zone: left,
                linkedZone: right,
                colSpan: 2,
                isStereo: true,
                name: "Piano",
                sample: "Piano L"
            },
            {
                zone: mono,
                linkedZone: undefined,
                colSpan: 1,
                isStereo: false,
                name: "Bell",
                sample: "Bell"
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

    it("links a partner that is not adjacent without merging", () => {
        const { instrument, samples } = createStereoInstrument();
        const [leftZone, rightZone, monoZone] = instrument.zones;
        instrument.zones = [leftZone, monoZone, rightZone];
        const view = buildInstrumentView(instrument);
        const [left, mono, right] = view.zones;

        const columns = getZoneColumns(view.zones, getChildren(samples));

        expect(describeColumns(columns)).toEqual([
            [left.id, right.id, 1],
            [mono.id, undefined, 1],
            [right.id, left.id, 1]
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
});
