import { describe, expect, it } from "vitest";
import {
    GeneratorTypes,
    type MIDIController,
    MIDIControllers,
    Modulator,
    ModulatorCurveTypes,
    ModulatorSource,
    SoundBankLoader
} from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import { copyStandardDefaults } from "../test_utils/standard_default_modulators.ts";
import { isSFeModulator } from "./sfe_data.ts";
import { isIgnoredModulator } from "./ignored_modulator.ts";
import {
    getLostSFeDefaultModulators,
    getMissingHiddenDefaults,
    getSF2DefaultModulators
} from "./sf2_default_modulators.ts";

function controllerModulator(cc: MIDIController) {
    return new Modulator(
        new ModulatorSource(cc, 0, true),
        new ModulatorSource(),
        GeneratorTypes.fineTune,
        10,
        0
    );
}

/**
 * The default list core gives back after an SF2 save and load of a bank with this one.
 */
function readThroughSF2(defaults: Modulator[]) {
    const { bank } = getMirror(createTestSession());
    bank.defaultModulators = defaults;
    return SoundBankLoader.fromArrayBuffer(bank.writeSF2()).defaultModulators;
}

/**
 * The SFe modulators of the list that core does not give back after an SF2 save and load.
 */
function getLostThroughSF2(defaults: Modulator[]) {
    const read = readThroughSF2(defaults.map((m) => Modulator.copyFrom(m)));
    return defaults.filter(
        (m) =>
            isSFeModulator(m) &&
            read.every((r) => !Modulator.isIdentical(m, r, true))
    );
}

/**
 * Whether two lists hold the same modulators, in any order.
 */
function isSameSet(a: readonly Modulator[], b: readonly Modulator[]) {
    const unmatched = [...b];
    for (const m of a) {
        const index = unmatched.findIndex((u) =>
            Modulator.isIdentical(m, u, true)
        );
        if (index === -1) {
            return false;
        }
        unmatched.splice(index, 1);
    }
    return unmatched.length === 0;
}

describe("getSF2DefaultModulators", () => {
    const cases = {
        "the standard list": copyStandardDefaults(),
        "the list without its first modulator": copyStandardDefaults().slice(1),
        "the list with a CC 73 modulator": [
            ...copyStandardDefaults(),
            controllerModulator(MIDIControllers.attackTime)
        ],
        "the list with a CC 94 modulator": [
            ...copyStandardDefaults(),
            controllerModulator(MIDIControllers.variationDepth)
        ],
        "only the hidden ones": copyStandardDefaults().filter((m) =>
            isSFeModulator(m)
        ),
        "the list without its CC 73 default and with one of its own": [
            ...copyStandardDefaults().filter(
                (m) =>
                    !(
                        m.primarySource.isCC &&
                        m.primarySource.index === MIDIControllers.attackTime
                    )
            ),
            controllerModulator(MIDIControllers.modulationWheel)
        ],
        // CC 0 is an illegal source, so core does not write it and restores the envelope times
        "the list with an ignored CC 73 modulator": [
            ...copyStandardDefaults(),
            new Modulator(
                new ModulatorSource(MIDIControllers.attackTime, 0, true),
                new ModulatorSource(MIDIControllers.bankSelect, 0, true),
                GeneratorTypes.fineTune,
                10,
                0
            )
        ],
        "only ignored and hidden ones": [
            ...copyStandardDefaults().filter((m) => isSFeModulator(m)),
            new Modulator(
                new ModulatorSource(MIDIControllers.bankSelect, 0, true),
                new ModulatorSource(),
                GeneratorTypes.fineTune,
                10,
                0
            )
        ]
    };

    for (const [name, list] of Object.entries(cases)) {
        it(`gives back what core reads from an SF2 file for ${name}`, () => {
            const read = readThroughSF2(list.map((m) => Modulator.copyFrom(m)));
            // Core drops ignored modulators without a word, SF2 mode leaves them to the save
            const kept = getSF2DefaultModulators(list).filter(
                (m) => !isIgnoredModulator(m)
            );
            expect(isSameSet(kept, read)).toBe(true);
        });

        it(`says which SFe modulators an SF2 file loses for ${name}`, () => {
            // A modulator of the bank's own that targets an SFe generator is always lost
            const own = new Modulator(
                new ModulatorSource(MIDIControllers.brightness, 0, true),
                new ModulatorSource(),
                GeneratorTypes.filterType,
                10,
                0
            );
            // An amount 0 twin is no twin in the default list, SF2 cannot store it
            const twin = new Modulator(
                new ModulatorSource(
                    MIDIControllers.filterResonance,
                    0,
                    true,
                    true
                ),
                new ModulatorSource(
                    MIDIControllers.filterResonance,
                    ModulatorCurveTypes.switch,
                    true
                ),
                GeneratorTypes.filterQOffset,
                0,
                0
            );
            for (const defaults of [list, [...list, own], [...list, twin]]) {
                expect(getLostSFeDefaultModulators(defaults)).toEqual(
                    getLostThroughSF2(defaults)
                );
            }
        });
    }

    it("keeps the objects it keeps", () => {
        const list = copyStandardDefaults().slice(1);
        for (const m of getSF2DefaultModulators(list)) {
            expect(list).toContain(m);
        }
    });
});

describe("getSF2DefaultModulators after a change back", () => {
    it("gives the hidden defaults back once the shown list is standard again", () => {
        const [first, ...rest] = copyStandardDefaults();
        const changed = getSF2DefaultModulators(rest);
        expect(changed.length).toBeLessThan(rest.length);
        const back = getSF2DefaultModulators([first, ...changed]);
        expect(isSameSet(back, copyStandardDefaults())).toBe(true);
    });
});

describe("getMissingHiddenDefaults", () => {
    it("puts back the hidden standard modulators an SF2 edit dropped", () => {
        const dropped = getSF2DefaultModulators(
            copyStandardDefaults().slice(1)
        );
        const shown = copyStandardDefaults().filter((m) => !isSFeModulator(m));
        const reset = [
            ...shown,
            ...dropped.filter((m) => isSFeModulator(m)),
            ...getMissingHiddenDefaults(dropped)
        ];
        expect(isSameSet(reset, copyStandardDefaults())).toBe(true);
    });
});
