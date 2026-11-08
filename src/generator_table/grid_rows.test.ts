import { describe, expect, it } from "vitest";
import {
    BasicInstrument,
    EmptySample,
    GeneratorTypes,
    SampleTypes,
    type GeneratorType
} from "spessasynth_core";
import {
    buildInstrumentView,
    buildSampleView
} from "../core_backend/entity_views.ts";
import { INSTRUMENT_ROWS } from "../instrument_editor/instrument_rows.ts";
import { PRESET_ROWS } from "../preset_editor/preset_rows.ts";
import type { GeneratorGroup } from "./generator_groups.ts";
import { getObjectId } from "../utils/object_id.ts";
import { getGridRows, hasStoredValue } from "./grid_rows.ts";
import { getZoneColumns } from "./zone_columns.ts";

function describeRows(rows: ReturnType<typeof getGridRows>) {
    return rows.map((r) =>
        r.type === "group"
            ? `group ${r.group}`
            : r.type === "generator"
              ? r.row.generator
              : `add ${r.group}`
    );
}

const NONE = new Set<GeneratorGroup>();

describe("getGridRows", () => {
    it("orders rows by group, then by the row list", () => {
        const rows = getGridRows(PRESET_ROWS, {
            hasValue: () => true,
            isValuesOnly: false,
            collapsed: NONE
        });
        const names = describeRows(rows);
        expect(names.slice(0, 10)).toEqual([
            "group rangeTuning",
            GeneratorTypes.keyRange,
            GeneratorTypes.velRange,
            GeneratorTypes.coarseTune,
            GeneratorTypes.fineTune,
            GeneratorTypes.scaleTuning,
            "group volume",
            GeneratorTypes.initialAttenuation,
            GeneratorTypes.amplitude,
            GeneratorTypes.pan
        ]);
        expect(rows.some((r) => r.type === "addGenerator")).toBe(false);
        expect(names).not.toContain("group sample");
    });

    it("hides rows without a value except the ranges and the kept generator", () => {
        const rows = getGridRows(INSTRUMENT_ROWS, {
            hasValue: (row) =>
                row.generator === GeneratorTypes.initialAttenuation,
            isValuesOnly: true,
            collapsed: NONE,
            keptGenerator: GeneratorTypes.releaseVolEnv
        });
        const shown = rows.filter((r) => r.type === "generator");
        expect(shown.map((r) => r.row.generator)).toEqual([
            GeneratorTypes.keyRange,
            GeneratorTypes.velRange,
            GeneratorTypes.initialAttenuation,
            GeneratorTypes.releaseVolEnv
        ]);
        expect(rows.filter((r) => r.type === "group")).toHaveLength(10);
        const volume = rows.find(
            (r) => r.type === "group" && r.group === "volume"
        );
        expect(volume).toMatchObject({ visibleCount: 1 });
        const add = rows.find(
            (r) => r.type === "addGenerator" && r.group === "volume"
        );
        expect(add?.type === "addGenerator" && add.hidden).toEqual([
            INSTRUMENT_ROWS.find(
                (r) => r.generator === GeneratorTypes.amplitude
            ),
            INSTRUMENT_ROWS.find((r) => r.generator === GeneratorTypes.pan)
        ]);
        const filterAt = rows.findIndex(
            (r) => r.type === "group" && r.group === "filter"
        );
        expect(rows[filterAt + 1]).toMatchObject({
            type: "addGenerator",
            group: "filter"
        });
        const filterAdd = rows[filterAt + 1];
        expect(
            filterAdd.type === "addGenerator" && filterAdd.hidden
        ).toHaveLength(3);
    });

    it("shows only the header of a collapsed group", () => {
        const rows = getGridRows(INSTRUMENT_ROWS, {
            hasValue: () => true,
            isValuesOnly: false,
            collapsed: new Set<GeneratorGroup>(["volume"])
        });
        const at = rows.findIndex(
            (r) => r.type === "group" && r.group === "volume"
        );
        expect(rows[at]).toMatchObject({
            isCollapsed: true,
            visibleCount: 3
        });
        expect(rows[at + 1]).toMatchObject({ type: "group", group: "filter" });
    });
});

describe("hasStoredValue", () => {
    it("finds a stored value in any column, Global included", () => {
        const left = new EmptySample();
        const right = new EmptySample();
        const instrument = new BasicInstrument();
        instrument.globalZone.setGenerator(
            GeneratorTypes.initialAttenuation,
            10
        );
        instrument.createZone(left).setGenerator(GeneratorTypes.fineTune, 3);
        instrument.createZone(right);
        const view = buildInstrumentView(instrument);
        const columns = [
            ...getZoneColumns([view.globalZone], {
                kind: "samples",
                views: new Map()
            }),
            ...getZoneColumns(view.zones, { kind: "samples", views: new Map() })
        ];
        const isStored = (g: GeneratorType) => hasStoredValue(columns, g);
        expect(isStored(GeneratorTypes.initialAttenuation)).toBe(true);
        expect(isStored(GeneratorTypes.fineTune)).toBe(true);
        expect(isStored(GeneratorTypes.pan)).toBe(false);
    });

    it("finds a value stored only on the right half of a stereo pair", () => {
        const left = new EmptySample();
        left.name = "Piano L";
        const right = new EmptySample();
        right.name = "Piano R";
        left.setLinkedSample(right, SampleTypes.leftSample);
        const instrument = new BasicInstrument();
        instrument.createZone(left);
        instrument.createZone(right).setGenerator(GeneratorTypes.fineTune, 3);
        const view = buildInstrumentView(instrument);
        const columns = getZoneColumns(view.zones, {
            kind: "samples",
            views: new Map(
                [left, right].map((s) => [
                    getObjectId(s),
                    buildSampleView(s, { revision: 0, restored: undefined })
                ])
            )
        });
        expect(columns).toHaveLength(1);
        expect(columns[0].linkedZone).toBeDefined();
        expect(hasStoredValue(columns, GeneratorTypes.fineTune)).toBe(true);
        expect(hasStoredValue(columns, GeneratorTypes.pan)).toBe(false);
    });
});
