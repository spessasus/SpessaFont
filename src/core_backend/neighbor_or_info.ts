import type { BankEditView } from "./bank_view.ts";

/**
 * Picks what to select after removing the element at `removedIndex`:
 * the element before it, the new first element, or the overview when the list is empty.
 */
export function neighborOrInfo<T extends BankEditView>(
    list: readonly T[],
    removedIndex: number
): T | "info" {
    return list[Math.max(removedIndex - 1, 0)] ?? "info";
}
