import { describe, expect, it } from "vitest";
import {
    BasicInstrument,
    EmptySample,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import {
    buildInstrumentView,
    buildSampleView
} from "../../core_backend/entity_views.ts";
import { getObjectId } from "../../utils/object_id.ts";
import {
    getZoneColumns,
    type ZoneChildren,
    type ZoneColumn
} from "../zone_columns.ts";
import {
    fillBetween,
    getColumnsIgnoringGlobal,
    mapSelectionToRow,
    selectAllZones
} from "./cell_sheet_selection.ts";

function createSample(name: string) {
    const sample = new EmptySample();
    sample.name = name;
    return sample;
}

function createColumns(setUp?: (instrument: BasicInstrument) => void) {
    const left = createSample("Piano L");
    const right = createSample("Piano R");
    left.setLinkedSample(right, SampleTypes.leftSample);
    const bell = createSample("Bell");
    const harp = createSample("Harp");
    const samples = [left, right, bell, harp];
    const instrument = new BasicInstrument();
    for (const sample of samples) {
        instrument.createZone(sample);
    }
    setUp?.(instrument);
    const view = buildInstrumentView(instrument);
    const children: ZoneChildren = {
        kind: "samples",
        views: new Map(
            samples.map((s) => [
                getObjectId(s),
                buildSampleView(s, { revision: 0, restored: undefined })
            ])
        )
    };
    const globalColumn: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: "Global",
        sample: undefined,
        linkedSample: undefined
    };
    const [pair, bellColumn, harpColumn] = getZoneColumns(view.zones, children);
    const [splitLeft, splitRight] = getZoneColumns(view.zones, children, true);
    return {
        global: globalColumn.zone.id,
        pair: pair.zone.id,
        half: [splitLeft.zone.id, splitRight.zone.id],
        bell: bellColumn.zone.id,
        harp: harpColumn.zone.id,
        columns: [globalColumn, pair, bellColumn, harpColumn],
        split: [globalColumn, ...getZoneColumns(view.zones, children, true)]
    };
}

function ids(columns: readonly ZoneColumn[]) {
    return columns.map((c) => c.zone.id);
}

describe("cell sheet selection", () => {
    it("checks every zone column but not Global", () => {
        const { columns, pair, bell, harp } = createColumns();
        expect(selectAllZones(columns)).toEqual(new Set([pair, bell, harp]));
    });

    it("fills between the first and last checked zones and keeps Global", () => {
        const { columns, global, pair, bell, harp } = createColumns();
        expect(fillBetween(new Set([global, pair, harp]), columns)).toEqual(
            new Set([global, pair, bell, harp])
        );
        expect(fillBetween(new Set([bell]), columns)).toEqual(new Set([bell]));
    });

    it("maps a pair to both halves into the pan row and a half back", () => {
        const { columns, split, pair, bell, half } = createColumns();
        expect(mapSelectionToRow(new Set([pair]), columns, split)).toEqual(
            new Set(half)
        );
        expect(
            mapSelectionToRow(new Set([half[1], bell]), split, columns)
        ).toEqual(new Set([pair, bell]));
    });

    describe("zones that ignore Global", () => {
        const ATTENUATION = GeneratorTypes.initialAttenuation;

        it("lists the zone columns with their own value", () => {
            // Zones: the pair's two halves, Bell, Harp
            const { columns, pair, harp } = createColumns((instrument) => {
                instrument.zones[0].setGenerator(ATTENUATION, 30);
                instrument.zones[3].setGenerator(ATTENUATION, 60);
                instrument.globalZone.setGenerator(ATTENUATION, 10);
            });
            expect(ids(getColumnsIgnoringGlobal(columns, ATTENUATION))).toEqual(
                [pair, harp]
            );
        });

        it("counts a stereo pair once when either half stores a value", () => {
            const { columns, pair } = createColumns((instrument) => {
                instrument.zones[1].setGenerator(ATTENUATION, 30);
            });
            expect(ids(getColumnsIgnoringGlobal(columns, ATTENUATION))).toEqual(
                [pair]
            );
        });

        it("lists nothing when no zone stores the generator", () => {
            const { columns } = createColumns();
            expect(getColumnsIgnoringGlobal(columns, ATTENUATION)).toEqual([]);
        });
    });
});
