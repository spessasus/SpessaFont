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
import {
    getModulatorColumns,
    getZoneColumns,
    type ZoneChildren,
    type ZoneColumn
} from "./zone_columns.ts";
import { getOneZoneColumns } from "./one_zone_columns.ts";

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
 * The columns of the stereo instrument as the table builds them, Global first where it
 * builds them that way.
 */
function getTableColumns() {
    const { instrument, samples } = createStereoInstrument();
    const view = buildInstrumentView(instrument);
    const children = getChildren(samples);
    const globalColumn: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: "Global",
        sample: undefined,
        linkedSample: undefined
    };
    const zoneColumns = getZoneColumns(view.zones, children);
    const splitColumns = [
        globalColumn,
        ...getZoneColumns(view.zones, children, true)
    ];
    const modulatorColumns = getModulatorColumns(
        [globalColumn, ...zoneColumns],
        splitColumns
    );
    return { view, globalColumn, zoneColumns, splitColumns, modulatorColumns };
}

function getIds(columns: readonly ZoneColumn[]) {
    return columns.map((c) => c.zone.id);
}

describe("getOneZoneColumns", () => {
    it("keeps Global and the chosen column, both halves of a pair in the pan row", () => {
        const { view, zoneColumns, splitColumns, modulatorColumns } =
            getTableColumns();
        const [left, right, bell] = view.zones;
        const global = view.globalZone;

        const second = getOneZoneColumns(
            zoneColumns,
            splitColumns,
            modulatorColumns,
            1
        );
        expect(second.zoneColumns.map((c) => c.name)).toEqual(["Bell"]);
        expect(getIds(second.splitColumns)).toEqual([global.id, bell.id]);
        expect(getIds(second.modulatorColumns)).toEqual([global.id, bell.id]);
        expect(second.index).toBe(1);

        const first = getOneZoneColumns(
            zoneColumns,
            splitColumns,
            modulatorColumns,
            0
        );
        expect(first.zoneColumns.map((c) => c.name)).toEqual(["Piano"]);
        expect(getIds(first.splitColumns)).toEqual([
            global.id,
            left.id,
            right.id
        ]);
        expect(getIds(first.modulatorColumns)).toEqual([global.id, left.id]);
    });

    it("clamps a stale index and shows only Global without zones", () => {
        const { globalColumn, zoneColumns, splitColumns, modulatorColumns } =
            getTableColumns();

        const stale = getOneZoneColumns(
            zoneColumns,
            splitColumns,
            modulatorColumns,
            7
        );
        expect(stale.index).toBe(1);
        expect(stale.zoneColumns.map((c) => c.name)).toEqual(["Bell"]);

        const empty = getOneZoneColumns([], [globalColumn], [globalColumn], 0);
        expect(empty.zoneColumns).toEqual([]);
        expect(empty.splitColumns).toEqual([globalColumn]);
        expect(empty.modulatorColumns).toEqual([globalColumn]);
        expect(empty.index).toBe(0);
    });
});
