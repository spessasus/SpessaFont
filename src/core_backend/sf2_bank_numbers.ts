import type { BasicSoundBank } from "spessasynth_core";

/**
 * Whether a preset's bank numbers would change in an SF2 or SF3 save. Those keep one bank number
 * per preset, and a drum kit is written as bank 128 without its MSB and LSB. A melodic preset
 * keeps its MSB, or its LSB when the MSB is 0. SFE and DLS store both for every preset.
 */
export function hasBankNumbersLostInSF2(bank: BasicSoundBank) {
    return bank.presets.some((p) =>
        p.isGMGSDrum
            ? p.bankMSB !== 0 || p.bankLSB !== 0
            : p.bankMSB !== 0 && p.bankLSB !== 0
    );
}
