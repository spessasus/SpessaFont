import { describe, expect, it } from "vitest";
import {
    type BasicInstrument,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { INSTRUMENT_ROWS } from "../../instrument_editor/instrument_rows.ts";
import { ac2hz } from "../../utils/conversion_helpers.ts";
import {
    createKeyCurveActions,
    isCurveRow,
    type KeyCurveSettings
} from "./key_curve_actions.ts";
import {
    type CurveShape,
    createRandomCurve,
    drawCurve,
    getCurveValues,
    KEY_COUNT
} from "./key_curve.ts";

function getRow(generator: GeneratorType) {
    const row = INSTRUMENT_ROWS.find((r) => r.generator === generator);
    if (!row) {
        throw new Error(`No row for ${generator}.`);
    }
    return row;
}

const FLAT = new Array<number>(KEY_COUNT).fill(0.5);

function shape(overrides: Partial<CurveShape>): CurveShape {
    return {
        pattern: "linearUp",
        fromKey: 0,
        toKey: 127,
        steepness: 3,
        random: FLAT,
        drawn: FLAT,
        ...overrides
    };
}

/**
 * Gives the instrument three single-key zones, at 0, 64 and 127.
 */
function setUpKeys(session: ReturnType<typeof createTestSession>) {
    const [instrument] = session.document.instruments;
    const [sample] = session.document.samples;
    const [first, second] = instrument.zones;
    const third = instrument.createZone(sample);
    first.keyRange = { min: 0, max: 0 };
    second.keyRange = { min: 64, max: 64 };
    third.keyRange = { min: 127, max: 127 };
    publishSetUp(session);
    return instrument;
}

function getValues(instrument: BasicInstrument, generator: GeneratorType) {
    return instrument.zones.map((z) => z.getGenerator(generator, null));
}

describe("getCurveValues", () => {
    it("runs linearly between the keys and stays flat outside", () => {
        const values = getCurveValues(shape({ fromKey: 10, toKey: 20 }));
        expect(values[0]).toBe(0);
        expect(values[15]).toBe(0.5);
        expect(values[127]).toBe(1);
    });

    it("bends an exponential curve and mirrors the descending one", () => {
        const up = getCurveValues(shape({ pattern: "exponentialUp" }));
        const down = getCurveValues(shape({ pattern: "exponentialDown" }));
        expect(up[64]).toBeLessThan(0.5);
        expect(down[127 - 64]).toBeCloseTo(up[64], 1);
    });

    it("steps when the curve starts and ends on one key", () => {
        const values = getCurveValues(shape({ fromKey: 60, toKey: 60 }));
        expect([values[59], values[60]]).toEqual([0, 1]);
    });

    it("draws a straight line between two pointer positions", () => {
        const drawn = drawCurve(
            FLAT,
            { key: 10, value: 0 },
            { key: 12, value: 1 }
        );
        expect(drawn.slice(10, 13)).toEqual([0, 0.5, 1]);
    });

    it("gives the same random curve for the same seed", () => {
        expect(createRandomCurve(7, 3)).toEqual(createRandomCurve(7, 3));
        expect(createRandomCurve(7, 1)).not.toEqual(createRandomCurve(8, 1));
    });
});

describe("createKeyCurveActions", () => {
    it("replaces the filter cutoff along a rising line", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        const settings: KeyCurveSettings = {
            row: getRow(GeneratorTypes.initialFilterFc),
            operation: "replace",
            min: 1000,
            max: 9000,
            values: getCurveValues(shape({})),
            velocity: undefined
        };

        expectRoundTrip(session, createKeyCurveActions([instrument], settings));

        const hz = getValues(instrument, GeneratorTypes.initialFilterFc).map(
            (v) => ac2hz(v ?? 0)
        );
        expect(hz[0]).toBeCloseTo(1000, -1);
        expect(hz[1]).toBeCloseTo(5031, -1);
        expect(hz[2]).toBeCloseTo(9000, -1);
    });

    it("adds a flat curve to what each zone plays", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        instrument.globalZone.setGenerator(
            GeneratorTypes.initialAttenuation,
            null
        );
        instrument.zones[0].setGenerator(
            GeneratorTypes.initialAttenuation,
            100
        );
        publishSetUp(session);

        session.history.do(
            createKeyCurveActions([instrument], {
                row: getRow(GeneratorTypes.initialAttenuation),
                operation: "add",
                min: 3,
                max: 3,
                values: FLAT,
                velocity: undefined
            })
        );

        expect(
            getValues(instrument, GeneratorTypes.initialAttenuation)
        ).toEqual([175, 75, 75]);
    });

    it("leaves zones outside the velocity filter alone", () => {
        const session = createTestSession();
        const instrument = setUpKeys(session);
        instrument.zones[0].velRange = { min: 0, max: 63 };
        publishSetUp(session);

        session.history.do(
            createKeyCurveActions([instrument], {
                row: getRow(GeneratorTypes.pan),
                operation: "replace",
                min: 10,
                max: 10,
                values: FLAT,
                velocity: { min: 100, max: 127 }
            })
        );

        expect(getValues(instrument, GeneratorTypes.pan)).toEqual([
            null,
            10,
            10
        ]);
    });

    it("changes several instruments in one undo step", () => {
        const session = createTestSession();
        const instruments = session.document.instruments;
        const actions = createKeyCurveActions(instruments, {
            row: getRow(GeneratorTypes.pan),
            operation: "replace",
            min: 20,
            max: 20,
            values: FLAT,
            velocity: undefined
        });
        expectRoundTrip(session, actions);
        for (const instrument of instruments) {
            expect(new Set(getValues(instrument, GeneratorTypes.pan))).toEqual(
                new Set([20])
            );
        }
    });

    it("offers only plain number rows", () => {
        expect(isCurveRow(getRow(GeneratorTypes.keyRange))).toBe(false);
        expect(isCurveRow(getRow(GeneratorTypes.sampleModes))).toBe(false);
        expect(isCurveRow(getRow(GeneratorTypes.releaseVolEnv))).toBe(true);
    });
});
