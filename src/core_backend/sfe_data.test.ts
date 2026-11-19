import { describe, expect, it } from "vitest";
import {
    type GeneratorType,
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorControllerSources,
    ModulatorSource,
    SoundBankLoader
} from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import {
    getShownModulators,
    hasCopiedSFeData,
    hasSFeOnlyData,
    isSFeModulator,
    mergeHiddenModulators
} from "./sfe_data.ts";

describe("hasSFeOnlyData", () => {
    it("is false for a bank with SF2 generators only", () => {
        expect(hasSFeOnlyData(createTestSession().document.bank)).toBe(false);
    });

    it("finds an SFe generator in an instrument zone", () => {
        const { bank } = createTestSession().document;
        bank.instruments[0].zones[0].setGenerator(
            GeneratorTypes.delayVoice,
            -1200
        );
        expect(hasSFeOnlyData(bank)).toBe(true);
    });

    it("finds one in a preset global zone", () => {
        const { bank } = createTestSession().document;
        bank.presets[0].globalZone.setGenerator(
            GeneratorTypes.modLfoStartPhase,
            90
        );
        expect(hasSFeOnlyData(bank)).toBe(true);
    });

    it("finds a zone modulator and a default modulator that target one", () => {
        const zoneSession = createTestSession();
        const zoneModulator = new Modulator();
        zoneModulator.destination = GeneratorTypes.modEnv2ToPitch;
        zoneSession.document.instruments[0].globalZone.addModulators(
            zoneModulator
        );
        expect(hasSFeOnlyData(zoneSession.document.bank)).toBe(true);

        const { bank } = createTestSession().document;
        const defaultModulator = Modulator.copyFrom(bank.defaultModulators[0]);
        defaultModulator.destination = GeneratorTypes.gain;
        bank.defaultModulators = [...bank.defaultModulators, defaultModulator];
        expect(hasSFeOnlyData(bank)).toBe(true);
    });

    it("matches what the writers keep: SFe keeps the generator, SF2 and DLS drop it", () => {
        // The mirror has the sample data, so it is what gets written
        const { bank } = getMirror(createTestSession());
        bank.instruments[0].zones[0].setGenerator(
            GeneratorTypes.ignoreNoteOff,
            1
        );
        const fromSFe = SoundBankLoader.fromArrayBuffer(bank.writeSFe());
        const fromSF2 = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
        expect(hasSFeOnlyData(fromSFe)).toBe(true);
        expect(hasSFeOnlyData(fromSF2)).toBe(false);
        const fromDLS = SoundBankLoader.fromArrayBuffer(bank.writeDLS());
        expect(hasSFeOnlyData(fromDLS)).toBe(false);
    });
});

function modulatorTo(destination: GeneratorType) {
    const modulator = new Modulator();
    modulator.destination = destination;
    return modulator;
}

describe("getShownModulators and mergeHiddenModulators", () => {
    const attenuation = modulatorTo(GeneratorTypes.initialAttenuation);
    const amplitude = modulatorTo(GeneratorTypes.gain);
    const pan = modulatorTo(GeneratorTypes.pan);
    const all = [attenuation, amplitude, pan];

    it("hides the SFe destinations in SF2 mode only", () => {
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

describe("hasCopiedSFeData", () => {
    it("finds SFe data in an instrument a copied preset uses", () => {
        const { document } = createTestSession();
        const preset = document.presets[0];
        expect(hasCopiedSFeData([preset])).toBe(false);
        preset.zones[0].instrument.zones[0].setGenerator(
            GeneratorTypes.delayVoice,
            -1200
        );
        expect(hasCopiedSFeData([preset])).toBe(true);
    });
});

describe("isSFeModulator and the Modulation Depth Range", () => {
    const depthRange = () =>
        new ModulatorSource(
            ModulatorControllerSources.modulationDepthRange,
            0,
            false
        );
    const modWheel = () =>
        new ModulatorSource(MIDIControllers.modulationWheel, 0, true);
    const cases = {
        "the mod wheel vibrato": new Modulator(
            modWheel(),
            depthRange(),
            GeneratorTypes.vibLfoToPitch,
            1600,
            0
        ),
        "a bipolar range on the vibrato": new Modulator(
            modWheel(),
            new ModulatorSource(
                ModulatorControllerSources.modulationDepthRange,
                0,
                false,
                true
            ),
            GeneratorTypes.vibLfoToPitch,
            1600,
            0
        ),
        "the range to the filter": new Modulator(
            modWheel(),
            depthRange(),
            GeneratorTypes.initialFilterFc,
            1600,
            0
        ),
        "the range as the primary source": new Modulator(
            depthRange(),
            new ModulatorSource(),
            GeneratorTypes.vibLfoToPitch,
            1600,
            0
        )
    };

    for (const [name, modulator] of Object.entries(cases)) {
        it(`agrees with what core's SF2 save loses for ${name}`, () => {
            const { bank } = createTestSession().document;
            bank.instruments[0].globalZone.addModulators(modulator);
            expect(isSFeModulator(modulator)).toBe(
                bank.getSF2Losses().modulators > 0
            );
        });
    }

    it("keeps the mod wheel vibrato in SF2 mode", () => {
        expect(isSFeModulator(cases["the mod wheel vibrato"])).toBe(false);
        expect(isSFeModulator(cases["the range to the filter"])).toBe(true);
    });
});
