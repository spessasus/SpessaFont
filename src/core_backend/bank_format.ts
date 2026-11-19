import type { BasicSoundBank } from "spessasynth_core";
import { hasSFeOnlyData } from "./sfe_data.ts";

/**
 * What the editor lets the user edit. SF2 shows the SoundFont 2 generators only and reports
 * what only SFe keeps as issues. SFe shows everything. It only changes what is shown, the
 * synthesizer plays the whole bank either way.
 */
export const BANK_FORMATS = {
    sf2: "sf2",
    sfe: "sfe"
} as const;
export type BankFormat = (typeof BANK_FORMATS)[keyof typeof BANK_FORMATS];

/**
 * An SFe file, or any bank that already uses what only SFe keeps, opens in SFe mode.
 */
export function detectBankFormat(bank: BasicSoundBank) {
    return bank.type === "sfe" || hasSFeOnlyData(bank) ? "sfe" : "sf2";
}
