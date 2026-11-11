import type { BasicSoundBank } from "spessasynth_core";
import { hasSFEOnlyData } from "./sfe_data.ts";

/**
 * What the editor lets the user edit. SF2 shows the SoundFont 2 generators only and reports
 * what only SFE keeps as issues. SFE shows everything. It only changes what is shown, the
 * synthesizer plays the whole bank either way.
 */
export const BANK_FORMATS = {
    sf2: "sf2",
    sfe: "sfe"
} as const;
export type BankFormat = (typeof BANK_FORMATS)[keyof typeof BANK_FORMATS];

/**
 * An SFE file, or any bank that already uses what only SFE keeps, opens in SFE mode.
 */
export function detectBankFormat(bank: BasicSoundBank) {
    return bank.type === "sfe" || hasSFEOnlyData(bank) ? "sfe" : "sf2";
}
