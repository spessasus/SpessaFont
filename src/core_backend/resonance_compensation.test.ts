import { describe, expect, it } from "vitest";
import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorSource,
    SoundBankLoader
} from "spessasynth_core";
import { createTestSession, getMirror } from "../test_utils/bank_fixture.ts";
import {
    isResonanceCompensator,
    syncResonanceCompensators
} from "./resonance_compensation.ts";

function resonanceModulator(amount: number) {
    return new Modulator(
        new ModulatorSource(MIDIControllers.filterResonance, 0, true, true),
        new ModulatorSource(),
        GeneratorTypes.initialFilterQ,
        amount,
        0
    );
}

/**
 * The modulators core gives the first instrument's global zone when it reads an SF2 file
 * with these in it.
 */
function readThroughSF2(modulators: Modulator[]) {
    const { bank } = getMirror(createTestSession());
    bank.instruments[0].globalZone.setModulators(modulators);
    const read = SoundBankLoader.fromArrayBuffer(bank.writeSF2());
    return read.instruments[0].globalZone.modulators;
}

describe("syncResonanceCompensators", () => {
    it.each([200, 0, -300, 5])(
        "adds the twins core's SF2 reader adds for an amount of %d",
        (amount) => {
            const synced = syncResonanceCompensators(
                [resonanceModulator(amount)],
                false
            );
            const fromCore = readThroughSF2([resonanceModulator(amount)]);
            expect(synced).toHaveLength(fromCore.length);
            for (const [i, modulator] of fromCore.entries()) {
                expect(Modulator.isIdentical(synced[i], modulator, true)).toBe(
                    true
                );
            }
        }
    );

    it("keeps the list when the twins are right, and replaces a stale twin", () => {
        const synced = syncResonanceCompensators(
            [resonanceModulator(200)],
            false
        );
        expect(syncResonanceCompensators(synced, false)).toEqual(synced);
        expect(syncResonanceCompensators(synced, false)[1]).toBe(synced[1]);

        const edited = syncResonanceCompensators(
            [resonanceModulator(400), synced[1]],
            false
        );
        expect(edited).toHaveLength(2);
        expect(edited[1]).not.toBe(synced[1]);
        expect(edited[1].transformAmount).toBe(200);
    });

    it("drops the twin with its modulator, and a preset skips an amount of 0", () => {
        const [, twin] = syncResonanceCompensators(
            [resonanceModulator(200)],
            false
        );
        expect(isResonanceCompensator(twin)).toBe(true);
        expect(syncResonanceCompensators([twin], false)).toEqual([]);
        expect(
            syncResonanceCompensators([resonanceModulator(0)], true)
        ).toHaveLength(1);
        expect(
            syncResonanceCompensators([resonanceModulator(-100)], true)
        ).toHaveLength(2);
    });
});
