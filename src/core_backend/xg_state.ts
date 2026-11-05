/*
 * Core does not export `BankSelectHacks.isXGDrum`, and exporting it was turned down
 * (CORE_WISHLIST.md, rejected item 19), so the check is kept here.
 */

/**
 * The bank MSBs core treats as XG drum kits in an XG bank, as `BankSelectHacks.isXGDrum` does.
 */
export function isXGDrumBank(bankMSB: number) {
    return bankMSB === 120 || bankMSB === 127;
}
