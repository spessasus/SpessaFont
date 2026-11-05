import type { BasicSoundBank } from "spessasynth_core";

/**
 * Whether a preset's bank numbers would change in an SF2 or SF3 save. Those keep one bank number
 * per preset, and a drum kit is written as bank 128 without its MSB and LSB. A melodic preset
 * keeps its MSB, or its LSB when the MSB is 0. SFE and DLS store both for every preset.
 */
export function isBankNumberLostInSF2(preset: {
    readonly isGMGSDrum: boolean;
    readonly bankMSB: number;
    readonly bankLSB: number;
}) {
    return preset.isGMGSDrum
        ? preset.bankMSB !== 0 || preset.bankLSB !== 0
        : preset.bankMSB !== 0 && preset.bankLSB !== 0;
}

/**
 * Whether a save in SF2 or SF3 changes the bank numbers of a preset (see `isBankNumberLostInSF2`).
 */
export function hasBankNumbersLostInSF2(bank: BasicSoundBank) {
    return bank.presets.some((p) => isBankNumberLostInSF2(p));
}
