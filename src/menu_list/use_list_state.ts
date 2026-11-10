import { useState } from "react";
import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import type { BankEditView } from "../core_backend/bank_view.ts";

export type ListKind = "samples" | "instruments" | "presets";

function getViewKind(view: BankEditView): ListKind | undefined {
    if (view instanceof BasicSample) {
        return "samples";
    }
    if (view instanceof BasicInstrument) {
        return "instruments";
    }
    if (view instanceof BasicPreset) {
        return "presets";
    }
    return undefined;
}

function kindSet(kind: ListKind | undefined): ReadonlySet<ListKind> {
    return new Set(kind === undefined ? [] : [kind]);
}

/**
 * Which list sections are open. A section opens by itself when the shown element becomes one of
 * its kind (a click elsewhere, undo, or a newly created element), and the user can close it
 * again. Desktop sections are independent, an accordion keeps one section open at a time.
 */
export function useSectionsOpen(view: BankEditView, isAccordion: boolean) {
    const [open, setOpenKinds] = useState(() => kindSet(getViewKind(view)));
    const [lastView, setLastView] = useState(view);
    const openKind = (previous: ReadonlySet<ListKind>, kind: ListKind) =>
        isAccordion ? kindSet(kind) : new Set(previous).add(kind);
    // Adjusting state while rendering, as React recommends instead of an effect
    if (view !== lastView) {
        setLastView(view);
        const kind = getViewKind(view);
        if (kind !== undefined) {
            setOpenKinds((previous) => openKind(previous, kind));
        }
    }
    // Updaters, since the sample import calls this after an await with a stale render's closure
    const setOpen = (kind: ListKind, isOpen: boolean) => {
        setOpenKinds((previous) => {
            if (isOpen) {
                return openKind(previous, kind);
            }
            const next = new Set(previous);
            next.delete(kind);
            return next;
        });
    };
    return {
        isOpen: (kind: ListKind) => open.has(kind),
        setOpen,
        toggle: (kind: ListKind) => {
            setOpen(kind, !open.has(kind));
        }
    };
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
