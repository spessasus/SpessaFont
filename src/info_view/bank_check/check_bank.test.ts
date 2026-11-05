import { describe, expect, it } from "vitest";
import {
    GeneratorTypes,
    Modulator,
    ModulatorSource,
    SampleTypes
} from "spessasynth_core";
import {
    createTestSession,
    publishSetUp
} from "../../test_utils/bank_fixture.ts";
import { getObjectId } from "../../utils/object_id.ts";
import { createRemoveUnusedActions } from "../../core_backend/bank_maintenance.ts";
import { checkBank, getFixedLoop } from "./check_bank.ts";

function check(session: ReturnType<typeof createTestSession>) {
    publishSetUp(session);
    const { views, info } = session.store.getSnapshot();
    return checkBank(views, info);
}

function modWheelSource() {
    const source = new ModulatorSource();
    source.index = 1;
    source.isCC = true;
    return source;
}

function kindsOf(session: ReturnType<typeof createTestSession>) {
    return check(session).map((issue) => issue.kind);
}

describe("checkBank", () => {
    it("finds the presets that share a patch in the test bank, and nothing else", () => {
        const session = createTestSession();
        const issues = check(session);

        expect(issues).toEqual([
            {
                kind: "duplicatePatch",
                presetIds: session.document.presets.map((p) => getObjectId(p)),
                patch: "0:0:0"
            }
        ]);
    });

    it("finds long and non-Latin-1 names, loops past the end and lone stereo halves", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        left.name = "A very long sample name";
        session.document.presets[0].name = "x".repeat(41);
        right.name = "Żółw";
        left.loopEnd = left.sampleLength + 10;
        // A one-sided link, as a broken file can have
        left.setLinkedSample(right, SampleTypes.leftSample);
        right.linkedSample = undefined;
        right.sampleType = SampleTypes.monoSample;

        const kinds = check(session).map((issue) => issue.kind);

        expect(kinds).toEqual(
            expect.arrayContaining([
                "longName",
                "cutName",
                "nonLatin1Name",
                "loopOutside",
                "stereoMismatch"
            ])
        );
    });

    it("finds unused and empty elements, and zones that repeat another", () => {
        const session = createTestSession();
        const [instrument, other] = session.document.instruments;
        // The second preset uses the second instrument, removing it leaves that one unused
        const [, preset] = session.document.presets;
        preset.zones[0].instrument = instrument;
        instrument.zones.push(...instrument.zones);
        other.zones.length = 0;

        const issues = check(session);
        const kinds = issues.map((issue) => issue.kind);

        expect(kinds).toContain("unusedInstrument");
        expect(kinds).toContain("emptyElement");
        expect(kinds).toContain("duplicateZone");
    });

    it("lists the samples remove unused removes, keeping a used stereo half's partner", () => {
        const session = createTestSession();
        const [left, right] = session.document.samples;
        const [instrument, other] = session.document.instruments;
        const [, preset] = session.document.presets;
        left.setLinkedSample(right, SampleTypes.leftSample);
        preset.zones[0].instrument = instrument;
        other.deleteZone(0, true);

        const issues = check(session);
        const removed = createRemoveUnusedActions(session.document);

        expect(
            issues.filter((i) => i.kind === "unusedInstrument")
        ).toHaveLength(removed.instrumentCount);
        expect(issues.filter((i) => i.kind === "unusedSample")).toHaveLength(
            removed.sampleCount
        );
        expect(removed.sampleCount).toBe(0);
    });

    it("does not report zones that differ in their modulators, and ignores generator order", () => {
        const session = createTestSession();
        const [instrument] = session.document.instruments;
        const zone = instrument.zones[0];
        zone.setGenerator(GeneratorTypes.fineTune, 5, false);
        zone.setGenerator(GeneratorTypes.pan, 10, false);
        const copy = instrument.createZone(zone.sample);
        copy.keyRange = { ...zone.keyRange };
        copy.velRange = { ...zone.velRange };
        for (const g of zone.generators.toReversed()) {
            copy.setGenerator(g.type, g.value, false);
        }
        expect(kindsOf(session)).toContain("duplicateZone");

        // Mod wheel to pitch makes the copy play differently
        copy.modulators = [
            new Modulator(
                modWheelSource(),
                new ModulatorSource(),
                GeneratorTypes.fineTune,
                50,
                0
            )
        ];
        expect(kindsOf(session)).not.toContain("duplicateZone");
    });

    it("finds what a save warns about: lost bank numbers, SFE data, info text, linked modulators", () => {
        const session = createTestSession();
        const [preset] = session.document.presets;
        preset.bankMSB = 1;
        preset.bankLSB = 2;
        const [instrument] = session.document.instruments;
        // A SpessaSynth generator, above the SF2 ones
        instrument.zones[0].setGenerator(GeneratorTypes.modLfoRate, 100, false);
        // A linked pair as core loads it: the sender has no destination
        instrument.zones[0].modulators = [
            new Modulator(
                modWheelSource(),
                new ModulatorSource(),
                GeneratorTypes.invalid,
                1000,
                0
            )
        ];
        session.document.bank.soundBankInfo.comment = "Żółw";

        expect(kindsOf(session)).toEqual(
            expect.arrayContaining([
                "bankNumberLost",
                "sfeOnlyData",
                "linkedModulator",
                "nonLatin1Info"
            ])
        );
    });
});

describe("getFixedLoop", () => {
    it("turns a reversed loop around", () => {
        expect(getFixedLoop(96, 32, 128)).toEqual({ start: 32, end: 96 });
    });

    it("keeps the end inside the sample", () => {
        expect(getFixedLoop(10, 200, 128)).toEqual({ start: 10, end: 128 });
    });

    it("loops the whole sample when the loop lay past the end", () => {
        expect(getFixedLoop(150, 200, 128)).toEqual({ start: 0, end: 128 });
    });
});
