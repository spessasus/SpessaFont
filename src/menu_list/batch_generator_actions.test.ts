import { describe, expect, it } from "vitest";
import { GeneratorTypes } from "spessasynth_core";
import {
    createTestSession,
    expectRoundTrip,
    publishSetUp
} from "../test_utils/bank_fixture.ts";
import { INSTRUMENT_ROWS } from "../instrument_editor/instrument_rows.ts";
import {
    createBatchGeneratorActions,
    isBatchEditableRow
} from "./batch_generator_actions.ts";

function getRow(generator: number) {
    const row = INSTRUMENT_ROWS.find((r) => r.generator === generator);
    if (!row) throw new Error(`No row for generator ${generator}`);
    return row;
}

describe("createBatchGeneratorActions", () => {
    it("sets a value in the shown units in every zone", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const row = getRow(GeneratorTypes.initialAttenuation);

        expectRoundTrip(
            session,
            createBatchGeneratorActions(
                [instrument],
                row,
                { kind: "set", value: 6 },
                "zones"
            )
        );

        // 6 dB is 150 centibels in the table's attenuation units
        for (const zone of instrument.zones) {
            expect(
                zone.getGenerator(GeneratorTypes.initialAttenuation, null)
            ).toBe(150);
        }
    });

    it("adds to each zone's own value and leaves zones that would not change", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const [first, second] = instrument.zones;
        first.setGenerator(GeneratorTypes.pan, 100);
        publishSetUp(session);
        const row = getRow(GeneratorTypes.pan);

        const actions = createBatchGeneratorActions(
            [instrument],
            row,
            { kind: "add", value: 0 },
            "zones"
        );
        expect(actions).toEqual([]);

        expectRoundTrip(
            session,
            createBatchGeneratorActions(
                [instrument],
                row,
                { kind: "add", value: 50 },
                "zones"
            )
        );
        expect(first.getGenerator(GeneratorTypes.pan, null)).toBe(150);
        expect(second.getGenerator(GeneratorTypes.pan, null)).toBe(50);
    });

    it("only edits the global zone when asked", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const row = getRow(GeneratorTypes.pan);

        expectRoundTrip(
            session,
            createBatchGeneratorActions(
                [instrument],
                row,
                { kind: "set", value: -20 },
                "global"
            )
        );
        expect(
            instrument.globalZone.getGenerator(GeneratorTypes.pan, null)
        ).toBe(-20);
        expect(instrument.zones[0].getGenerator(GeneratorTypes.pan, null)).toBe(
            null
        );
    });

    it("leaves out ranges and sample offsets", () => {
        expect(isBatchEditableRow(getRow(GeneratorTypes.keyRange))).toBe(false);
        expect(isBatchEditableRow(getRow(GeneratorTypes.pan))).toBe(true);
    });
});
