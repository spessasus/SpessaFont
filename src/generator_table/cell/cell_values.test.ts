import { describe, expect, it } from "vitest";
import {
    type BasicInstrument,
    type GeneratorType,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import type { BankSession } from "../../core_backend/bank_session.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { getZoneColumns, type ZoneColumn } from "../zone_columns.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import {
    applyTextToRange,
    type CellContext,
    createSetCellActions,
    formatNumberCell,
    nudgeCellValue,
    parseCellPart,
    readColumnCell
} from "./cell_values.ts";
import { planPaste, splitClipboardText } from "./cell_clipboard.ts";

function getRow(generator: GeneratorType) {
    const row = INSTRUMENT_ROWS.find((r) => r.generator === generator);
    if (!row) {
        throw new Error(`No row for ${generator}.`);
    }
    return row;
}

/**
 * The table's columns of an instrument: the global zone, then the zones.
 */
function getColumns(session: BankSession, instrument: BasicInstrument) {
    const { views } = session.store.getSnapshot();
    const view = views.instruments.get(getObjectId(instrument));
    if (!view) {
        throw new Error("The instrument has no view.");
    }
    const global: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: "",
        sample: undefined
    };
    return [
        global,
        ...getZoneColumns(view.zones, {
            kind: "samples",
            views: views.samples
        })
    ];
}

function getContext(
    instrument: BasicInstrument,
    row: GeneratorRowType
): CellContext {
    return { element: instrument, row, isInstrument: true };
}

const ATTENUATION = getRow(GeneratorTypes.initialAttenuation);

describe("planPaste", () => {
    it("gives one value to every target", () => {
        expect(planPaste(1, [1, 3, 4], 6)).toEqual([
            [1, 0],
            [3, 0],
            [4, 0]
        ]);
    });

    it("puts as many values as targets in order", () => {
        expect(planPaste(3, [1, 2, 5], 6)).toEqual([
            [1, 0],
            [2, 1],
            [5, 2]
        ]);
    });

    it("fills to the right of one target and drops what does not fit", () => {
        expect(planPaste(3, [4], 6)).toEqual([
            [4, 0],
            [5, 1]
        ]);
    });

    it("repeats the values over more targets", () => {
        expect(planPaste(2, [0, 1, 2], 6)).toEqual([
            [0, 0],
            [1, 1],
            [2, 0]
        ]);
    });
});

describe("splitClipboardText", () => {
    it("splits on tabs, line breaks and commas, without a trailing empty cell", () => {
        expect(splitClipboardText("1\t2\n3,4\n")).toEqual(["1", "2", "3", "4"]);
    });
});

describe("createSetCellActions", () => {
    it("sets copied values in another instrument, undone in one step", () => {
        const session = createTestSession();
        const [source, target] = session.document.instruments;
        const sourceColumns = getColumns(session, source);
        const targetColumns = getColumns(session, target);
        const sourceZones = source.zones;
        sourceZones[0].setGenerator(GeneratorTypes.initialAttenuation, 100);
        sourceZones[1].setGenerator(GeneratorTypes.initialAttenuation, 200);
        publishSetUp(session);

        const values = sourceColumns
            .slice(1)
            .map((c) => readColumnCell(source, c, ATTENUATION.generator));
        expect(values).toEqual([100, 200]);
        const context = getContext(target, ATTENUATION);
        const actions = planPaste(
            values.length,
            [1, 2],
            targetColumns.length
        ).flatMap(([c, v]) =>
            createSetCellActions(context, targetColumns[c], values[v])
        );
        expectRoundTrip(session, actions);

        expect(
            target.zones.map((z) =>
                z.getGenerator(GeneratorTypes.initialAttenuation, null)
            )
        ).toEqual([100, 200]);
    });

    it("sets both zones of a stereo column and clamps to the range", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        instrument.createZone(left);
        instrument.createZone(right);
        publishSetUp(session);
        const stereo = getColumns(session, instrument).find((c) => c.isStereo);
        if (!stereo) {
            throw new Error("No stereo column.");
        }

        expectRoundTrip(
            session,
            createSetCellActions(
                getContext(instrument, ATTENUATION),
                stereo,
                5000
            )
        );

        const zones = instrument.zones.filter(
            (z) => z.sample === left || z.sample === right
        );
        const pair = zones.slice(-2);
        for (const zone of pair) {
            expect(
                zone.getGenerator(GeneratorTypes.initialAttenuation, null)
            ).toBe(1440);
        }
    });

    it("clears a value and an unset range keeps the zone unset", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [zone] = instrument.zones;
        zone.setGenerator(GeneratorTypes.pan, 100);
        zone.keyRange = { min: 10, max: 20 };
        publishSetUp(session);
        const [, column] = getColumns(session, instrument);
        const pan = getContext(instrument, getRow(GeneratorTypes.pan));
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));

        expectRoundTrip(session, [
            ...createSetCellActions(pan, column, null),
            ...createSetCellActions(keys, column, null)
        ]);

        expect(zone.getGenerator(GeneratorTypes.pan, null)).toBeNull();
        expect(zone.keyRange.min).toBe(-1);
    });

    it("does nothing when the value is there already", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const context = getContext(instrument, getRow(GeneratorTypes.pan));
        expect(createSetCellActions(context, column, null)).toEqual([]);
    });
});

describe("parseCellPart", () => {
    it("adds a relative value to the cell's own", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const context = getContext(
            instrument,
            getRow(GeneratorTypes.coarseTune)
        );
        expect(parseCellPart(context, 2, "+3")).toBe(5);
        expect(parseCellPart(context, null, "+3")).toBe(3);
        expect(parseCellPart(context, 2, "nope")).toBeUndefined();
    });
});

describe("nudgeCellValue", () => {
    it("steps coarse tune by one from its default", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const context = getContext(
            instrument,
            getRow(GeneratorTypes.coarseTune)
        );
        expect(nudgeCellValue(context, column, null, 1, 1)).toBe(1);
        expect(nudgeCellValue(context, column, 5, -1, 10)).toBe(-5);
    });

    it("changes what a logarithmic row shows with every notch", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const row = getRow(GeneratorTypes.releaseVolEnv);
        const context = getContext(instrument, row);
        const next = nudgeCellValue(context, column, null, 1, 1);
        if (typeof next !== "number") {
            throw new TypeError("A release is a number.");
        }
        // The default -12000 timecents shows 0.001 s, the smallest step shows the next value
        expect(formatNumberCell(row, next)).toBe("0.002");
        expect(formatNumberCell(row, next - 1)).toBe("0.001");
    });

    it("picks the next option and moves a range's low bound", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const modes = getContext(
            instrument,
            getRow(GeneratorTypes.sampleModes)
        );
        expect(nudgeCellValue(modes, column, null, 1, 1)).toBe(0);
        expect(nudgeCellValue(modes, column, 1, -1, 1)).toBe(0);
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        expect(
            nudgeCellValue(keys, column, { min: 60, max: 60 }, 1, 1)
        ).toEqual({ min: 61, max: 61 });
    });
});

describe("applyTextToRange", () => {
    it("moves both ends with a relative edit and clamps them", () => {
        expect(applyTextToRange("+12", { min: 36, max: 48 })).toEqual({
            min: 48,
            max: 60
        });
        expect(applyTextToRange("+-40", { min: 36, max: 48 })).toEqual({
            min: 0,
            max: 8
        });
        expect(applyTextToRange("+10", { min: -1, max: 127 })).toEqual({
            min: 10,
            max: 127
        });
    });

    it("sets an absolute range and rejects text that means nothing", () => {
        expect(applyTextToRange("60-72", { min: 0, max: 127 })).toEqual({
            min: 60,
            max: 72
        });
        expect(applyTextToRange("+", { min: 0, max: 127 })).toBeUndefined();
    });
});
