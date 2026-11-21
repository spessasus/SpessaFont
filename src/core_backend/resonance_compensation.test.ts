import { describe, expect, it } from "vitest";
import {
    CustomCurve,
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource,
    SoundBankLoader
} from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import { copyStandardDefaults } from "../test_utils/standard_default_modulators.ts";
import {
    isLosingNewTwin,
    isResonanceCompensator,
    isSoundKeptOnlyInSFe,
    syncResonanceCompensators,
    hasOwnDefaultModulators
} from "./resonance_compensation.ts";

function resonanceModulator(
    amount: number,
    curve: CustomCurve | undefined = undefined
) {
    return new Modulator(
        new ModulatorSource(
            MIDIControllers.filterResonance,
            curve ?? 0,
            true,
            true
        ),
        new ModulatorSource(),
        GeneratorTypes.initialFilterQ,
        amount,
        0
    );
}

/**
 * The modulators core gives the first instrument's global zone, and the first preset's, when it
 * reads an SF2 file with these in them.
 */
function readThroughSF2(modulators: Modulator[]) {
    const { bank } = getMirror(createTestSession());
    bank.instruments[0].globalZone.setModulators(modulators);
    bank.presets[0].globalZone.setModulators(
        modulators.map((m) => Modulator.copyFrom(m))
    );
    const read = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
    return {
        instrument: read.instruments[0].globalZone.modulators,
        preset: read.presets[0].globalZone.modulators
    };
}

function expectSameList(a: readonly Modulator[], b: readonly Modulator[]) {
    expect(a).toHaveLength(b.length);
    for (const [i, modulator] of b.entries()) {
        expect(Modulator.isIdentical(a[i], modulator, true)).toBe(true);
    }
}

describe("syncResonanceCompensators", () => {
    it.each([200, 0, -300])(
        "gives an instrument zone the twin core's SF2 reader gives for an amount of %d",
        (amount) => {
            const fromCore = readThroughSF2([resonanceModulator(amount)]);
            expectSameList(
                syncResonanceCompensators([resonanceModulator(amount)], true),
                fromCore.instrument
            );
            expectSameList(
                syncResonanceCompensators([resonanceModulator(amount)], false),
                fromCore.preset
            );
        }
    );

    it("gives no twin for a custom curve source, as core does not", () => {
        const curve = new CustomCurve(
            [
                { x: 0, y: 0 },
                { x: 16_384, y: 16_384 }
            ],
            "Line"
        );
        const list = [resonanceModulator(200, curve)];
        expect(syncResonanceCompensators(list, true)).toHaveLength(1);
        // Core drops the custom curve modulator and adds nothing
        expect(readThroughSF2(list).instrument).toHaveLength(0);
    });

    it("keeps the twin of a bank read from SF2 as the same object", () => {
        const { instrument } = readThroughSF2([resonanceModulator(200)]);
        const synced = syncResonanceCompensators(instrument, true);
        expect(synced).toEqual(instrument);
        expect(synced[1]).toBe(instrument[1]);
        expect(isResonanceCompensator(synced[1])).toBe(true);
    });

    it("removes a stale twin, with its modulator or in a zone that needs none", () => {
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator(200)],
            true
        );
        expect(syncResonanceCompensators([twin], true)).toEqual([]);
        expect(
            syncResonanceCompensators([resonanceModulator(200), twin], false)
        ).toHaveLength(1);
    });
});

describe("hasOwnDefaultModulators", () => {
    it("is false for the standard list in any order", () => {
        expect(hasOwnDefaultModulators(copyStandardDefaults())).toBe(false);
        expect(
            hasOwnDefaultModulators(copyStandardDefaults().toReversed())
        ).toBe(false);
    });

    it("is true with one removed or one added", () => {
        expect(hasOwnDefaultModulators(copyStandardDefaults().slice(1))).toBe(
            true
        );
        expect(
            hasOwnDefaultModulators([
                ...copyStandardDefaults(),
                resonanceModulator(5)
            ])
        ).toBe(true);
    });
});

describe("isSoundKeptOnlyInSFe", () => {
    const standard = copyStandardDefaults();
    // A list of its own without the default CC 71 to filterQOffset modulator
    const withoutResonance = standard.filter(
        (m) => m.destination !== GeneratorTypes.filterQOffset
    );

    it("asks when the sync would add a twin that the source did not need", () => {
        const { document } = createTestSession();
        const [instrument] = document.instruments;
        expect(instrument.zones.length).toBeGreaterThan(0);
        instrument.globalZone.setModulators([resonanceModulator(200)]);
        expect(isSoundKeptOnlyInSFe([instrument], standard, standard)).toBe(
            true
        );
        // With its twin it plays the same in both modes
        instrument.globalZone.setModulators(
            syncResonanceCompensators([resonanceModulator(200)], true)
        );
        expect(isSoundKeptOnlyInSFe([instrument], standard, standard)).toBe(
            false
        );
    });

    it("does not ask when the twin the sync adds keeps the sound", () => {
        const { document } = createTestSession();
        const [instrument] = document.instruments;
        instrument.globalZone.setModulators([resonanceModulator(200)]);
        // The source list has no default to turn off, the target's twin turns its own off
        expect(
            isSoundKeptOnlyInSFe([instrument], withoutResonance, standard)
        ).toBe(false);
    });

    it("asks when the sync would take out a twin the zone plays with", () => {
        const { document } = createTestSession();
        const [instrument] = document.instruments;
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator(200)],
            true
        );
        instrument.globalZone.setModulators([twin]);
        expect(isSoundKeptOnlyInSFe([instrument], standard, standard)).toBe(
            true
        );
    });
});

describe("isSoundKeptOnlyInSFe with zones that differ", () => {
    it("asks when one zone only SFe keeps and another both modes change", () => {
        const { document } = createTestSession();
        const instrument = document.instruments.find((i) => i.zones.length > 1);
        if (!instrument) {
            throw new Error("No instrument has two zones.");
        }
        const [first, second] = instrument.zones;
        const standard = copyStandardDefaults();
        const withoutResonance = standard.filter(
            (m) => m.destination !== GeneratorTypes.filterQOffset
        );
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator(200)],
            true
        );
        // The first zone has no CC 71 modulators, both modes give it the target's default.
        // The second keeps a twin that SF2 mode takes out
        first.setModulators([]);
        second.setModulators([twin]);
        expect(
            isSoundKeptOnlyInSFe([instrument], withoutResonance, standard)
        ).toBe(true);
    });
});

describe("isLosingNewTwin", () => {
    it("finds a pasted twin the sync would take out of a preset zone", () => {
        const { document } = createTestSession();
        const [preset] = document.presets;
        const [instrument] = document.instruments;
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator(200)],
            true
        );
        expect(isLosingNewTwin(document, preset, [], [twin])).toBe(true);
        // An instrument zone with CC 71 to Q keeps it, as does a bank that saves as DLS
        const mods = [resonanceModulator(200), twin];
        expect(isLosingNewTwin(document, instrument, [], mods)).toBe(false);
        document.writeFormat = "dls";
        expect(isLosingNewTwin(document, preset, [], [twin])).toBe(false);
    });
});
