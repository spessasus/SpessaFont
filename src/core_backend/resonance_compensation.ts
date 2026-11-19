import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorCurveTypes,
    ModulatorSource
} from "spessasynth_core";

/*
 * Core gives every CC 71 to resonance modulator of an SF2 or DLS file a CC 71 to gain twin
 * when it reads the file, so the filter does not get quieter, and leaves the twins out when
 * it writes one. SF2 mode hides the twins, so an edit of the shown modulators has to bring
 * them along, or the bank plays unlike the saved file and core counts the old twin as lost.
 * This is core's rule (`getResonantCompensators`, internal there), keep the two the same.
 */

interface SourceLike {
    readonly index: number;
    readonly isCC: boolean;
    readonly isBipolar: boolean;
    readonly isNegative: boolean;
    readonly curveType: number;
}

interface ModulatorLike {
    readonly destination: number;
    readonly transformType: number;
    readonly primarySource: SourceLike;
    readonly secondarySource: SourceLike;
}

/**
 * Whether the modulator is a twin as core makes them: bipolar linear CC 71 to gain, with CC 71
 * as a switch for its amount. A CC 71 to gain modulator of another shape is the bank's own and
 * stays. A view or a core modulator.
 */
export function isResonanceCompensator(modulator: ModulatorLike) {
    const { primarySource: primary, secondarySource: secondary } = modulator;
    return (
        modulator.destination === GeneratorTypes.gain &&
        modulator.transformType === 0 &&
        primary.isCC &&
        primary.index === MIDIControllers.filterResonance &&
        primary.isBipolar &&
        !primary.isNegative &&
        primary.curveType === ModulatorCurveTypes.linear &&
        secondary.isCC &&
        secondary.index === MIDIControllers.filterResonance &&
        !secondary.isBipolar &&
        secondary.curveType === ModulatorCurveTypes.switch
    );
}

/**
 * The modulator core adds twins for: bipolar linear CC 71 to resonance with no second source.
 */
function isResonanceModulator(modulator: Modulator) {
    const { primarySource: primary, secondarySource: secondary } = modulator;
    return (
        modulator.destination === GeneratorTypes.initialFilterQ &&
        primary.isCC &&
        primary.index === MIDIControllers.filterResonance &&
        primary.isBipolar &&
        !primary.isNegative &&
        primary.curveType === ModulatorCurveTypes.linear &&
        !secondary.isCC &&
        secondary.index === 0 &&
        !secondary.isBipolar &&
        !secondary.isNegative &&
        secondary.curveType === ModulatorCurveTypes.linear
    );
}

function createCompensator(amount: number, isBelow64: boolean) {
    return new Modulator(
        new ModulatorSource(
            MIDIControllers.filterResonance,
            ModulatorCurveTypes.linear,
            true,
            true
        ),
        // CC 71 as a switch, so only one half of it counts
        new ModulatorSource(
            MIDIControllers.filterResonance,
            ModulatorCurveTypes.switch,
            true,
            false,
            isBelow64
        ),
        GeneratorTypes.gain,
        amount,
        0
    );
}

/**
 * The list with the twins its CC 71 to resonance modulators need, at its end. Twins that are
 * right already keep their objects and places.
 * @param isPreset a preset's amounts add to the instrument's, and so do its twins
 */
export function syncResonanceCompensators(
    modulators: readonly Modulator[],
    isPreset: boolean
) {
    const kept = modulators.filter((m) => !isResonanceCompensator(m));
    const twins = new Array<Modulator>();
    for (const modulator of kept) {
        if (!isResonanceModulator(modulator)) {
            continue;
        }
        const amount = modulator.transformAmount;
        if (isPreset) {
            if (amount !== 0) {
                twins.push(createCompensator(Math.round(amount / 2), false));
            }
            continue;
        }
        // Half the amount above 64, where the resonance goes up. A negative amount raises
        // it below 64
        const raised = Math.max(0, amount);
        twins.push(createCompensator(Math.round(raised / 2), false));
        if (amount < 0) {
            twins.push(createCompensator(Math.round(amount / 2), true));
        }
    }
    const old = modulators.filter((m) => isResonanceCompensator(m));
    const isUpToDate =
        old.length === twins.length &&
        old.every((m, i) => Modulator.isIdentical(m, twins[i], true));
    return isUpToDate ? [...modulators] : [...kept, ...twins];
}
