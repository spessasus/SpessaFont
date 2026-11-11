import { describe, expect, it } from "vitest";
import {
    type GeneratorType,
    GeneratorTypes,
    Modulator,
    SoundBankLoader
} from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import {
    getShownModulators,
    hasCopiedSFEData,
    hasSFEOnlyData,
    mergeHiddenModulators
} from "./sfe_data.ts";

describe("hasSFEOnlyData", () => {
    it("is false for a bank with SF2 generators only", () => {
        expect(hasSFEOnlyData(createTestSession().document.bank)).toBe(false);
    });

    it("finds a SpessaSynth generator in an instrument zone", () => {
        const { bank } = createTestSession().document;
        bank.instruments[0].zones[0].setGenerator(
            GeneratorTypes.delayVoice,
            -1200
        );
        expect(hasSFEOnlyData(bank)).toBe(true);
    });

    it("finds one in a preset global zone", () => {
        const { bank } = createTestSession().document;
        bank.presets[0].globalZone.setGenerator(
            GeneratorTypes.modLfoStartPhase,
            90
        );
        expect(hasSFEOnlyData(bank)).toBe(true);
    });

    it("finds a zone modulator and a default modulator that target one", () => {
        const zoneSession = createTestSession();
        const zoneModulator = new Modulator();
        zoneModulator.destination = GeneratorTypes.modEnv2ToPitch;
        zoneSession.document.instruments[0].globalZone.modulators.push(
            zoneModulator
        );
        expect(hasSFEOnlyData(zoneSession.document.bank)).toBe(true);

        const { bank } = createTestSession().document;
        const defaultModulator = Modulator.copyFrom(bank.defaultModulators[0]);
        defaultModulator.destination = GeneratorTypes.amplitude;
        bank.defaultModulators = [...bank.defaultModulators, defaultModulator];
        expect(hasSFEOnlyData(bank)).toBe(true);
    });

    it("matches what the writers keep: SFE keeps the generator, SF2 and DLS drop it", () => {
        // The mirror has the sample data, so it is what gets written
        const { bank } = getMirror(createTestSession());
        bank.instruments[0].zones[0].setGenerator(
            GeneratorTypes.ignoreNoteOff,
            1
        );
        const fromSFE = SoundBankLoader.fromArrayBuffer(bank.writeSFE());
        const fromSF2 = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
        expect(hasSFEOnlyData(fromSFE)).toBe(true);
        expect(hasSFEOnlyData(fromSF2)).toBe(false);
        const fromDLS = SoundBankLoader.fromArrayBuffer(bank.writeDLS());
        expect(hasSFEOnlyData(fromDLS)).toBe(false);
    });
});

function modulatorTo(destination: GeneratorType) {
    const modulator = new Modulator();
    modulator.destination = destination;
    return modulator;
}

describe("getShownModulators and mergeHiddenModulators", () => {
    const attenuation = modulatorTo(GeneratorTypes.initialAttenuation);
    const amplitude = modulatorTo(GeneratorTypes.amplitude);
    const pan = modulatorTo(GeneratorTypes.pan);
    const all = [attenuation, amplitude, pan];

    it("hides the SFE destinations in SF2 mode only", () => {
        expect(getShownModulators(all, true)).toBe(all);
        expect(getShownModulators(all, false)).toEqual([attenuation, pan]);
    });

    it("keeps a hidden modulator in its place after an edit", () => {
        const edited = modulatorTo(GeneratorTypes.fineTune);
        expect(mergeHiddenModulators(all, [edited, pan])).toEqual([
            edited,
            amplitude,
            pan
        ]);
    });

    it("keeps the hidden ones when the shown ones are deleted or added", () => {
        expect(mergeHiddenModulators(all, [])).toEqual([amplitude]);
        const added = modulatorTo(GeneratorTypes.fineTune);
        expect(mergeHiddenModulators(all, [added, attenuation, pan])).toEqual([
            added,
            amplitude,
            attenuation,
            pan
        ]);
    });
});

describe("hasCopiedSFEData", () => {
    it("finds SFE data in an instrument a copied preset uses", () => {
        const { document } = createTestSession();
        const preset = document.presets[0];
        expect(hasCopiedSFEData([preset])).toBe(false);
        preset.zones[0].instrument.zones[0].setGenerator(
            GeneratorTypes.delayVoice,
            -1200
        );
        expect(hasCopiedSFEData([preset])).toBe(true);
    });
});
