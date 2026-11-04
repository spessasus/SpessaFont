import type {
    BankViews,
    InstrumentView,
    ModulatorView,
    PresetView,
    SampleView
} from "./entity_views.ts";

/**
 * The changes of one kind of element between two views.
 */
export interface ElementDiff<T> {
    /**
     * New views and views whose identity changed.
     */
    readonly changed: readonly T[];
    readonly removed: readonly number[];
    /**
     * The new order, only when it changed.
     */
    readonly order: readonly number[] | undefined;
}

/**
 * Everything that differs between two bank views. Views keep their identity until their data
 * changes, so this is what a copy of the bank needs to catch up.
 */
export interface ViewDiff {
    readonly presets: ElementDiff<PresetView>;
    readonly instruments: ElementDiff<InstrumentView>;
    readonly samples: ElementDiff<SampleView>;
    /**
     * Only when they changed.
     */
    readonly defaultModulators: readonly ModulatorView[] | undefined;
}

function diffElements<T>(
    previous: ReadonlyMap<number, T>,
    next: ReadonlyMap<number, T>,
    previousOrder: readonly number[],
    nextOrder: readonly number[]
): ElementDiff<T> {
    const changed = new Array<T>();
    const removed = new Array<number>();
    // An unchanged map means unchanged views, so the walk is only paid for the touched kinds
    if (previous !== next) {
        for (const [id, view] of next) {
            if (previous.get(id) !== view) {
                changed.push(view);
            }
        }
        for (const id of previous.keys()) {
            if (!next.has(id)) {
                removed.push(id);
            }
        }
    }
    return {
        changed,
        removed,
        order: previousOrder === nextOrder ? undefined : nextOrder
    };
}

export function diffBankViews(previous: BankViews, next: BankViews): ViewDiff {
    return {
        presets: diffElements(
            previous.presets,
            next.presets,
            previous.presetOrder,
            next.presetOrder
        ),
        instruments: diffElements(
            previous.instruments,
            next.instruments,
            previous.instrumentOrder,
            next.instrumentOrder
        ),
        samples: diffElements(
            previous.samples,
            next.samples,
            previous.sampleOrder,
            next.sampleOrder
        ),
        defaultModulators:
            previous.defaultModulators === next.defaultModulators
                ? undefined
                : next.defaultModulators
    };
}

/**
 * True when nothing of that kind changed.
 */
export function isElementDiffEmpty(diff: ElementDiff<unknown>) {
    return (
        diff.changed.length === 0 &&
        diff.removed.length === 0 &&
        diff.order === undefined
    );
}
