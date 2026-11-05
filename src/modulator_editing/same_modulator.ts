import type {
    ModulatorSourceView,
    ModulatorView
} from "../core_backend/entity_views.ts";

function isSameSource(a: ModulatorSourceView, b: ModulatorSourceView) {
    return (
        a.index === b.index &&
        a.isCC === b.isCC &&
        a.isBipolar === b.isBipolar &&
        a.isNegative === b.isNegative &&
        a.curveType === b.curveType
    );
}

/**
 * Core's `Modulator.isIdentical` on views: the same sources, destination and transform, which
 * is what makes a zone modulator override a default one. With `shouldCompareAmount`, the amounts must
 * match too, so the two play the same.
 */
export function isSameModulator(
    a: ModulatorView,
    b: ModulatorView,
    shouldCompareAmount: boolean
) {
    return (
        isSameSource(a.primarySource, b.primarySource) &&
        isSameSource(a.secondarySource, b.secondarySource) &&
        a.destination === b.destination &&
        a.transformType === b.transformType &&
        (!shouldCompareAmount || a.transformAmount === b.transformAmount)
    );
}

/**
 * Whether two zones have the same modulators, in the same order and with the same amounts.
 * The ids do not count, as the partner of a stereo pair gets copies.
 */
export function isSameModulatorList(
    a: readonly ModulatorView[],
    b: readonly ModulatorView[]
) {
    return (
        a.length === b.length &&
        a.every((m, i) => isSameModulator(m, b[i], true))
    );
}
