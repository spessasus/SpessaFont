import type { BasicSoundBank } from "spessasynth_core";

/*
 * Core decides whether a bank is an XG bank (which makes the presets on banks 120 and 127 drum
 * kits) only in `BasicSoundBank.flush()`, and that also sorts the presets with core's own
 * comparator, which does not put XG kits last like the editor does. Core has no public way to
 * recompute the flag alone (`parseInternal` is protected) and does not export
 * `BankSelectHacks.isXGDrum`, so both are worked around here. See CORE_WISHLIST.md.
 */

/**
 * The bank MSBs core treats as XG drum kits in an XG bank, as `BankSelectHacks.isXGDrum` does.
 */
export function isXGDrumBank(bankMSB: number) {
    return bankMSB === 120 || bankMSB === 127;
}

/**
 * Recomputes whether the bank is an XG bank and keeps the preset order as it was.
 */
export function refreshXGState(bank: BasicSoundBank) {
    const order = [...bank.presets];
    bank.flush();
    bank.presets.splice(0, bank.presets.length, ...order);
}
