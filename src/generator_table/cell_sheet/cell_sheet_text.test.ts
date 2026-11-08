import { describe, expect, it } from "vitest";
import {
    type BasicInstrument,
    type GeneratorType,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import {
    buildCellText,
    buildRangeText,
    describeSheetValue
} from "./cell_sheet_text.ts";
import { parseCellText } from "../cell/parse_generator_text.ts";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import type { BankSession } from "../../core_backend/bank_session.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { getZoneColumns, type ZoneColumn } from "../zone_columns.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import type { CellContext } from "../cell/cell_values.ts";

describe("buildCellText", () => {
    it.each([
        ["set", "6", "6", "set", 6],
        ["set", "-2", "-2", "set", -2],
        ["add", "2", "+2", "add", 2],
        ["add", "3", "+3", "add", 3],
        ["add", "-2", "+-2", "add", -2],
        ["multiply", "0.5", "x0.5", "multiply", 0.5],
        ["multiply", "0,5", "x0,5", "multiply", 0.5]
    ] as const)("%s %s sends %s", (mode, typed, text, kind, value) => {
        expect(buildCellText(mode, typed, false)).toBe(text);
        expect(parseCellText(text)).toEqual({ kind, value });
    });

    it("drops a typed prefix, keeps abc text and sends nothing when empty", () => {
        expect(buildCellText("add", "+3", false)).toBe("+3");
        expect(buildCellText("multiply", "x2", false)).toBe("x2");
        expect(buildCellText("multiply", "X2", false)).toBe("x2");
        expect(buildCellText("multiply", "*2", false)).toBe("x2");
        expect(buildCellText("add", "+", false)).toBeUndefined();
        expect(buildCellText("set", "+-3", true)).toBe("+-3");
        expect(buildCellText("set", "", false)).toBeUndefined();
        expect(buildCellText("add", "  ", true)).toBeUndefined();
    });
});

describe("buildRangeText", () => {
    it("builds range texts", () => {
        expect(buildRangeText({ kind: "set", low: 48, high: 69 })).toBe(
            "48-69"
        );
        expect(buildRangeText({ kind: "shift", by: 12 })).toBe("+12");
        expect(buildRangeText({ kind: "shift", by: -12 })).toBe("+-12");
    });
});

function getContext(
    instrument: BasicInstrument,
    generator: GeneratorType
): CellContext {
    const row = INSTRUMENT_ROWS.find((r) => r.generator === generator);
    if (!row) {
        throw new Error(`No row for ${generator}.`);
    }
    return { element: instrument, row, isInstrument: true };
}

/**
 * The global zone view and the table's columns of an instrument, the global zone first.
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
        sample: undefined,
        linkedSample: undefined
    };
    return {
        globalZone: view.globalZone,
        columns: [
            global,
            ...getZoneColumns(view.zones, {
                kind: "samples",
                views: views.samples
            })
        ]
    };
}

describe("describeSheetValue", () => {
    it("describes own, inherited, default and stereo values", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [left, right] = session.document.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        const leftZone = instrument.createZone(left);
        const rightZone = instrument.createZone(right);
        leftZone.setGenerator(GeneratorTypes.pan, 0);
        rightZone.setGenerator(GeneratorTypes.pan, 100);
        const [ownZone] = instrument.zones;
        ownZone.setGenerator(GeneratorTypes.initialAttenuation, 163);
        // The sample bank's global zone sets an attenuation of its own
        instrument.globalZone.setGenerator(
            GeneratorTypes.initialAttenuation,
            null
        );
        publishSetUp(session);
        const { globalZone, columns } = getColumns(session, instrument);
        const own = findColumnIn(columns, getObjectId(ownZone));
        const stereo = findColumnIn(columns, getObjectId(leftZone));
        const attenuation = getContext(
            instrument,
            GeneratorTypes.initialAttenuation
        );

        expect(describeSheetValue(attenuation, own, globalZone)).toEqual({
            kind: "own",
            text: "6.52"
        });
        expect(describeSheetValue(attenuation, stereo, globalZone)).toEqual({
            kind: "inherited",
            text: "0.00",
            source: "default"
        });
        expect(describeSheetValue(attenuation, columns[0], globalZone)).toEqual(
            { kind: "inherited", text: "0.00", source: "default" }
        );
        expect(
            describeSheetValue(
                getContext(instrument, GeneratorTypes.pan),
                stereo,
                globalZone
            )
        ).toEqual({ kind: "mixed", left: "0", right: "100" });

        instrument.globalZone.setGenerator(
            GeneratorTypes.initialAttenuation,
            0
        );
        publishSetUp(session);
        const next = getColumns(session, instrument);
        const inheriting = findColumnIn(next.columns, getObjectId(leftZone));
        expect(
            describeSheetValue(attenuation, inheriting, next.globalZone)
        ).toEqual({ kind: "inherited", text: "0.00", source: "global" });
        expect(
            describeSheetValue(attenuation, next.columns[0], next.globalZone)
        ).toEqual({ kind: "own", text: "0.00" });
    });
});

function findColumnIn(columns: readonly ZoneColumn[], id: number) {
    const column = columns.find((c) => c.zone.id === id);
    if (!column) {
        throw new Error(`No column for zone ${id}.`);
    }
    return column;
}
