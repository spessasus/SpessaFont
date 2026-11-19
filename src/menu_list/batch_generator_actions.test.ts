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
                "zones",
                true
            )
        );

        // 6 dB is 60 centibels
        for (const zone of instrument.zones) {
            expect(
                zone.getGenerator(GeneratorTypes.initialAttenuation, null)
            ).toBe(60);
        }
    });

    it("gives no zone the alternating loop in SF2 mode", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const row = getRow(GeneratorTypes.sampleModes);
        const edit = { kind: "set", value: 4 } as const;
        expect(
            createBatchGeneratorActions([instrument], row, edit, "zones", false)
        ).toHaveLength(0);
        expect(
            createBatchGeneratorActions([instrument], row, edit, "zones", true)
                .length
        ).toBeGreaterThan(0);
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
            "zones",
            true
        );
        expect(actions).toEqual([]);

        expectRoundTrip(
            session,
            createBatchGeneratorActions(
                [instrument],
                row,
                { kind: "add", value: 50 },
                "zones",
                true
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
                "global",
                true
            )
        );
        expect(
            instrument.globalZone.getGenerator(GeneratorTypes.pan, null)
        ).toBe(-20);
        expect(instrument.zones[0].getGenerator(GeneratorTypes.pan, null)).toBe(
            null
        );
    });

    it("adds to the root key a zone plays, the sample's key when it sets none", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.setGenerator(
            GeneratorTypes.overridingRootKey,
            null
        );
        for (const zone of instrument.zones) {
            zone.setGenerator(GeneratorTypes.overridingRootKey, null);
        }
        publishSetUp(session);

        expectRoundTrip(
            session,
            createBatchGeneratorActions(
                [instrument],
                getRow(GeneratorTypes.overridingRootKey),
                { kind: "add", value: 12 },
                "zones",
                true
            )
        );

        for (const zone of instrument.zones) {
            expect(
                zone.getGenerator(GeneratorTypes.overridingRootKey, null)
            ).toBe(zone.sample.originalKey + 12);
        }
    });

    it("adds to the value the zones inherit from the global zone", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        instrument.globalZone.setGenerator(GeneratorTypes.pan, 100);
        for (const zone of instrument.zones) {
            zone.setGenerator(GeneratorTypes.pan, null);
        }
        publishSetUp(session);

        session.history.do(
            createBatchGeneratorActions(
                [instrument],
                getRow(GeneratorTypes.pan),
                { kind: "add", value: 50 },
                "zones",
                true
            )
        );

        for (const zone of instrument.zones) {
            expect(zone.getGenerator(GeneratorTypes.pan, null)).toBe(150);
        }
    });

    it("leaves a fixed key that is off alone for an add", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        expect(
            createBatchGeneratorActions(
                [instrument],
                getRow(GeneratorTypes.keyNum),
                { kind: "add", value: 12 },
                "zones",
                true
            )
        ).toEqual([]);
    });

    it("leaves out ranges and sample offsets", () => {
        expect(isBatchEditableRow(getRow(GeneratorTypes.keyRange))).toBe(false);
        expect(isBatchEditableRow(getRow(GeneratorTypes.pan))).toBe(true);
    });
});
