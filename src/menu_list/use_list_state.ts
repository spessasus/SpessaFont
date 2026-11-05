import { useState } from "react";
import type { BankEditView } from "../core_backend/bank_view.ts";

/**
 * Whether a list section is open. It opens by itself when the shown element becomes one of its
 * kind (a click elsewhere, undo, or a newly created element), and the user can close it again.
 */
export function useSectionOpen(view: BankEditView, isViewOfKind: boolean) {
    const [isOpen, setIsOpen] = useState(isViewOfKind);
    const [lastView, setLastView] = useState(view);
    // Adjusting state while rendering, as React recommends instead of an effect
    if (view !== lastView) {
        setLastView(view);
        if (isViewOfKind) {
            setIsOpen(true);
        }
    }
    return [isOpen, setIsOpen] as const;
}

/**
 * A set of expanded item keys.
 */
export function useExpandedItems() {
    const [expanded, setExpanded] = useState<ReadonlySet<string>>(
        () => new Set()
    );
    const toggle = (key: string) => {
        setExpanded((previous) => {
            const next = new Set(previous);
            if (!next.delete(key)) {
                next.add(key);
            }
            return next;
        });
    };
    return { isExpanded: (key: string) => expanded.has(key), toggle };
}
