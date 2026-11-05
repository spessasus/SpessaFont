import { describe, expect, it } from "vitest";
import { Modulator, SampleTypes, SoundBankLoader } from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import { getDLSLosses } from "./dls_data.ts";

describe("getDLSLosses", () => {
    it("finds nothing in a bank DLS keeps whole", () => {
        expect(getDLSLosses(createTestSession().document.bank)).toEqual([]);
    });

    it("finds stereo links, unused instruments and edited default modulators", () => {
        const { bank } = createTestSession().document;
        const [left, right] = bank.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        bank.presets[0].deleteZone(0);
        const modulator = Modulator.copyFrom(bank.defaultModulators[0]);
        modulator.transformAmount += 1;
        bank.defaultModulators = [
            modulator,
            ...bank.defaultModulators.slice(1)
        ];

        expect(getDLSLosses(bank)).toEqual([
            "stereoLinks",
            "unusedInstruments",
            "defaultModulators"
        ]);
    });

    it("matches what the DLS writer leaves out", () => {
        // The mirror has the sample data, so it is what gets written
        const { bank } = getMirror(createTestSession());
        const [left, right] = bank.samples;
        left.setLinkedSample(right, SampleTypes.leftSample);
        const modulator = Modulator.copyFrom(bank.defaultModulators[0]);
        modulator.transformAmount += 1;
        bank.defaultModulators = [
            modulator,
            ...bank.defaultModulators.slice(1)
        ];
        const fromDLS = SoundBankLoader.fromArrayBuffer(bank.writeDLS());

        expect(fromDLS.samples.some((s) => s.isLinked)).toBe(false);
        expect(getDLSLosses(fromDLS)).not.toContain("defaultModulators");
    });
});
