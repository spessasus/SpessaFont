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
import { PRESET_ROWS } from "../../preset_editor/preset_rows.ts";
import {
    applyTextToCell,
    applyTextToRange,
    type CellContext,
    createSetCellActions,
    createTextEditActions,
    formatNumberCell,
    getCellDisplay,
    nudgeCellValue,
    readColumnCell
} from "./cell_values.ts";
import {
    planCellPaste,
    planPaste,
    splitClipboardText
} from "./cell_clipboard.ts";

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
        sample: undefined,
        linkedSample: undefined
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
    it("splits on tabs and line breaks, without a trailing empty cell", () => {
        expect(splitClipboardText("1\t2\n3\n")).toEqual(["1", "2", "3"]);
    });

    it("keeps a decimal comma in its cell", () => {
        expect(splitClipboardText("1,5\t2")).toEqual(["1,5", "2"]);
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

describe("applyTextToCell", () => {
    it("adds a relative value to the cell's own", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const context = getContext(
            instrument,
            getRow(GeneratorTypes.coarseTune)
        );
        expect(applyTextToCell(context, 2, "+3")).toBe(5);
        expect(applyTextToCell(context, 0, "+3")).toBe(3);
        expect(applyTextToCell(context, 2, "nope")).toBeUndefined();
        expect(applyTextToCell(context, 2, "")).toBeNull();
    });

    it("reads a decimal comma and a capital X, and refuses other text", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const release = getRow(GeneratorTypes.releaseVolEnv);
        const attenuation = getContext(instrument, ATTENUATION);
        const releaseContext = getContext(instrument, release);
        expect(
            formatNumberCell(
                release,
                applyTextToCell(releaseContext, -12_000, "0,5") as number
            )
        ).toBe("0.500");
        // 18 dB is 450 centibels
        expect(applyTextToCell(attenuation, 450, "X2")).toBe(900);
        expect(applyTextToCell(attenuation, 450, "1,5")).toBe(38);
        for (const text of ["1a", "0x10", "1e3", "1,5,0", "--3", "++3", "x"]) {
            expect(applyTextToCell(attenuation, 450, text), text).toBe(
                undefined
            );
        }
    });

    it("reads a range either way around and shifts it with +12", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        const range = { min: 60, max: 72 };
        expect(applyTextToCell(keys, range, "72-60")).toEqual(range);
        expect(applyTextToCell(keys, range, "+12")).toEqual({
            min: 72,
            max: 84
        });
        expect(applyTextToCell(keys, range, "C4-C5")).toBeUndefined();
    });

    it("adds to an offset with +3 like the number rows", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const offset = getContext(
            instrument,
            getRow(GeneratorTypes.startAddrsOffset)
        );
        expect(applyTextToCell(offset, 100, "+3")).toBe(103);
        expect(applyTextToCell(offset, null, "x2")).toBe(0);
    });
});

describe("createTextEditActions", () => {
    it("refuses text that is not a value instead of storing another number", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const context = getContext(instrument, ATTENUATION);
        expect(createTextEditActions(context, [column], "1,5x")).toBe(
            undefined
        );
        expect(createTextEditActions(context, [column], "1,5")).toHaveLength(1);
    });

    it("keeps exclusive classes to 16 bits", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const context = getContext(
            instrument,
            getRow(GeneratorTypes.exclusiveClass)
        );
        session.history.do(
            createTextEditActions(context, [column], "40000") ?? []
        );
        expect(
            instrument.zones[0].getGenerator(
                GeneratorTypes.exclusiveClass,
                null
            )
        ).toBe(32_767);
    });
});

/**
 * An instrument whose global zone sets an attack of 1 second, which its first zone plays.
 */
function setUpGlobalAttack() {
    const session = createTestSession();
    const [instrument] = session.document.instruments;
    instrument.globalZone.setGenerator(GeneratorTypes.attackVolEnv, 0);
    instrument.globalZone.keyRange = { min: 36, max: 48 };
    const [zone] = instrument.zones;
    zone.setGenerator(GeneratorTypes.attackVolEnv, null);
    zone.keyRange = { min: -1, max: 127 };
    publishSetUp(session);
    const [globalColumn, column] = getColumns(session, instrument);
    return { session, instrument, zone, globalColumn, column };
}

describe("the global zone", () => {
    it("is what an unset zone cell shows as its placeholder", () => {
        const { instrument, globalColumn, column } = setUpGlobalAttack();
        const attack = getContext(
            instrument,
            getRow(GeneratorTypes.attackVolEnv)
        );
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        const global = globalColumn.zone;
        expect(getCellDisplay(attack, column, global).placeholder).toBe(
            "1.000"
        );
        expect(getCellDisplay(attack, globalColumn, global).placeholder).toBe(
            "0.001"
        );
        expect(getCellDisplay(keys, column, global).placeholder).toBe("36-48");
    });

    it("is where relative edits and wheel notches start", () => {
        const { session, instrument, zone, column } = setUpGlobalAttack();
        const row = getRow(GeneratorTypes.attackVolEnv);
        const attack = getContext(instrument, row);
        session.history.do(
            createTextEditActions(attack, [column], "+0,5") ?? []
        );
        expect(
            formatNumberCell(
                row,
                zone.getGenerator(GeneratorTypes.attackVolEnv, null)
            )
        ).toBe("1.500");
        session.history.undo();

        const nudged = nudgeCellValue(attack, null, 0, 1, 1);
        expect(formatNumberCell(row, nudged as number)).toBe("1.001");

        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        session.history.do(createTextEditActions(keys, [column], "+12") ?? []);
        expect(zone.keyRange).toEqual({ min: 48, max: 60 });
    });

    it("gives a preset zone the preset global zone's offset", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        preset.globalZone.setGenerator(GeneratorTypes.fineTune, 10);
        publishSetUp(session);
        const { views } = session.store.getSnapshot();
        const view = views.presets.get(getObjectId(preset));
        if (!view) {
            throw new Error("The preset has no view.");
        }
        const [zoneView] = view.zones;
        const row = PRESET_ROWS.find(
            (r) => r.generator === GeneratorTypes.fineTune
        );
        if (!row) {
            throw new Error("No fine tune row.");
        }
        const column: ZoneColumn = {
            zone: zoneView,
            linkedZone: undefined,
            colSpan: 1,
            isStereo: false,
            name: "",
            sample: undefined,
            linkedSample: undefined
        };
        const context = { element: preset, row, isInstrument: false };
        expect(
            getCellDisplay(context, column, view.globalZone).placeholder
        ).toBe("10");
        session.history.do(
            createTextEditActions(context, [column], "+5") ?? []
        );
        expect(
            preset.zones[0].getGenerator(GeneratorTypes.fineTune, null)
        ).toBe(15);
    });
});

function setUpPair() {
    const session = createTestSession();
    const [instrument] = session.document.instruments;
    const [left, right] = session.document.samples;
    left.setLinkedSample(right, SampleTypes.leftSample);
    const leftZone = instrument.createZone(left);
    const rightZone = instrument.createZone(right);
    leftZone.setGenerator(GeneratorTypes.fineTune, 10);
    rightZone.setGenerator(GeneratorTypes.fineTune, -20);
    publishSetUp(session);
    const stereo = getColumns(session, instrument).find(
        (c) => c.zone.id === getObjectId(leftZone)
    );
    if (!stereo) {
        throw new Error("No stereo column.");
    }
    return { session, instrument, leftZone, rightZone, stereo };
}

describe("a stereo column", () => {
    it("shows both values when the zones differ", () => {
        const { session, instrument, stereo } = setUpPair();
        const view = session.store
            .getSnapshot()
            .views.instruments.get(getObjectId(instrument));
        if (!view) {
            throw new Error("The instrument has no view.");
        }
        const display = getCellDisplay(
            getContext(instrument, getRow(GeneratorTypes.fineTune)),
            stereo,
            view.globalZone
        );
        expect(display.isMixed).toBe(true);
        expect(display.text).toBe("10 / -20");
    });

    it("applies relative edits and wheel notches to each zone's own value", () => {
        const { session, instrument, leftZone, rightZone, stereo } =
            setUpPair();
        const context = getContext(instrument, getRow(GeneratorTypes.fineTune));
        expectRoundTrip(
            session,
            createTextEditActions(context, [stereo], "+5") ?? []
        );
        expect(leftZone.getGenerator(GeneratorTypes.fineTune, null)).toBe(15);
        expect(rightZone.getGenerator(GeneratorTypes.fineTune, null)).toBe(-15);
    });

    it("typed back unchanged changes nothing", () => {
        const { instrument, stereo } = setUpPair();
        const context = getContext(instrument, getRow(GeneratorTypes.fineTune));
        expect(createTextEditActions(context, [stereo], "10 / -20")).toBe(
            undefined
        );
    });
});

describe("planCellPaste", () => {
    it("does nothing for an empty clipboard", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [instrumentZone] = instrument.zones;
        instrumentZone.setGenerator(GeneratorTypes.initialAttenuation, 100);
        publishSetUp(session);
        const columns = getColumns(session, instrument);
        const context = getContext(instrument, ATTENUATION);
        expect(planCellPaste(context, columns, [1], "", undefined)).toEqual({
            kind: "actions",
            actions: []
        });
    });

    it("reads pasted text like typed text", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [zone] = instrument.zones;
        zone.keyRange = { min: 60, max: 72 };
        publishSetUp(session);
        const columns = getColumns(session, instrument);
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        const plan = planCellPaste(keys, columns, [1], "+12", undefined);
        if (plan.kind !== "actions") {
            throw new Error("The paste was refused.");
        }
        session.history.do(plan.actions);
        expect(zone.keyRange).toEqual({ min: 72, max: 84 });
        expect(planCellPaste(keys, columns, [1], "C4", undefined)).toEqual({
            kind: "invalid",
            text: "C4"
        });
    });

    it("refuses cells copied in a preset and reads another row's copy as text", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const columns = getColumns(session, instrument);
        const context = getContext(instrument, ATTENUATION);
        const fromPreset = {
            generator: ATTENUATION.generator,
            isInstrument: false,
            values: [-12_000],
            text: "-480.00"
        };
        expect(
            planCellPaste(context, columns, [1], "-480.00", fromPreset).kind
        ).toBe("otherTable");
        const fromPan = {
            generator: GeneratorTypes.pan,
            isInstrument: true,
            values: [100],
            text: "100"
        };
        const plan = planCellPaste(context, columns, [1], "100", fromPan);
        if (plan.kind !== "actions") {
            throw new Error("The paste was refused.");
        }
        session.history.do(plan.actions);
        // "100" read as decibels, clamped to the 144 dB the row allows
        expect(
            instrument.zones[0].getGenerator(
                GeneratorTypes.initialAttenuation,
                null
            )
        ).toBe(1440);
    });
});

describe("nudgeCellValue", () => {
    it("steps coarse tune by one from its default", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const context = getContext(
            instrument,
            getRow(GeneratorTypes.coarseTune)
        );
        expect(nudgeCellValue(context, null, 0, 1, 1)).toBe(1);
        expect(nudgeCellValue(context, 5, 5, -1, 10)).toBe(-5);
    });

    it("changes what a logarithmic row shows with every notch", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const row = getRow(GeneratorTypes.releaseVolEnv);
        const context = getContext(instrument, row);
        const next = nudgeCellValue(context, null, -12_000, 1, 1);
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
        const modes = getContext(
            instrument,
            getRow(GeneratorTypes.sampleModes)
        );
        expect(nudgeCellValue(modes, null, 0, 1, 1)).toBe(0);
        expect(nudgeCellValue(modes, 1, 1, -1, 1)).toBe(0);
        const keys = getContext(instrument, getRow(GeneratorTypes.keyRange));
        const range = { min: 60, max: 60 };
        expect(nudgeCellValue(keys, range, range, 1, 1)).toEqual({
            min: 61,
            max: 61
        });
    });

    it("keeps offsets inside the zone's sample, even an empty one", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [, column] = getColumns(session, instrument);
        const row = getRow(GeneratorTypes.startAddrsOffset);
        const context = getContext(instrument, row);
        const zone = instrument.zones[0];
        // A start offset cannot go before the sample's start
        session.history.do(
            createTextEditActions(context, [column], "-100") ?? []
        );
        expect(zone.getGenerator(GeneratorTypes.startAddrsOffset, null)).toBe(
            0
        );
        const empty: ZoneColumn = {
            ...column,
            sample: column.sample && { ...column.sample, length: 0 }
        };
        session.history.do(createTextEditActions(context, [empty], "+5") ?? []);
        expect(zone.getGenerator(GeneratorTypes.startAddrsOffset, null)).toBe(
            0
        );
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

    it("swaps a range typed high to low", () => {
        expect(applyTextToRange("72-60", { min: 0, max: 127 })).toEqual({
            min: 60,
            max: 72
        });
    });
});
