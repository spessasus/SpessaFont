import {
    type BasicInstrument,
    BasicPreset,
    type BasicSoundBank,
    GeneratorTypes,
    MIDIControllers,
    ModulatorControllerSources,
    ModulatorCurveTypes
} from "spessasynth_core";
import { isResonanceCompensator } from "./resonance_compensation.ts";
import type { ModulatorLike, SourceLike } from "./modulator_like.ts";

/**
 * Whether SF2 stores the looping mode. The alternating loop (4) and any other value outside 0 to
 * 3 are SFe's, an SF2 save writes 4 as a plain loop and the rest as no loop.
 */
export function isSF2LoopingMode(value: number) {
    return value >= 0 && value <= 3;
}

/**
 * Generators above `endOper` are SFe's (61 to 89). Only SFe files store them, so SF2, SF3 and
 * DLS saves leave them out, together with the modulators that target them.
 */
export function isSFeGenerator(type: number) {
    return type > GeneratorTypes.endOper;
}

function isDepthRange(source: SourceLike) {
    return (
        !source.isCC &&
        source.index === ModulatorControllerSources.modulationDepthRange
    );
}

/**
 * Whether an SF2 file can store the Modulation Depth Range of the modulator. It can only as the
 * plain amount source of a mod wheel vibrato, which core writes without it (its
 * `withoutModulationDepth`, which is internal). The amount is left to core's count, as SF2
 * rounds it to a step of 32, which is no reason to hide the modulator.
 */
function isStoredDepthRange({
    primarySource,
    secondarySource,
    destination
}: ModulatorLike) {
    return (
        primarySource.isCC &&
        primarySource.index === MIDIControllers.modulationWheel &&
        (destination === GeneratorTypes.modLfoToPitch ||
            destination === GeneratorTypes.vibLfoToPitch) &&
        secondarySource.curveType === ModulatorCurveTypes.linear &&
        !secondarySource.isBipolar &&
        !secondarySource.isNegative
    );
}

/**
 * Whether only an SFe file stores the modulator: it targets an SFe generator, a source has a
 * custom curve, or it uses the Modulation Depth Range in a way SF2 cannot store. SF2 mode
 * hides these.
 */
export function isSFeModulator(modulator: ModulatorLike) {
    return (
        isSFeGenerator(modulator.destination) ||
        modulator.primarySource.curveType === ModulatorCurveTypes.custom ||
        modulator.secondarySource.curveType === ModulatorCurveTypes.custom ||
        isDepthRange(modulator.primarySource) ||
        (isDepthRange(modulator.secondarySource) &&
            !isStoredDepthRange(modulator))
    );
}

/**
 * Whether the modulator is SFe data that a save in another format loses. The resonance twins
 * (amount 0 CC 71 to filterQOffset) are not: in SF2 mode `SyncResonanceTwinsAction` keeps them
 * where core's SF2 reader makes them again. `hasSFeOnlyData` asks core for the exact
 * answer.
 */
export function isLostSFeModulator(modulator: ModulatorLike) {
    return isSFeModulator(modulator) && !isResonanceCompensator(modulator);
}

/**
 * Whether a zone, or its view, sets something only an SFe save keeps. The alternating loop is
 * a value of an SF2 generator that only SFe has, like any other looping mode above 3.
 */
export function hasZoneSFeData(zone: {
    readonly generators: readonly {
        readonly type: number;
        readonly value: number;
    }[];
    readonly modulators: readonly ModulatorLike[];
}) {
    return (
        zone.generators.some(
            (g) =>
                isSFeGenerator(g.type) ||
                (g.type === GeneratorTypes.sampleModes &&
                    !isSF2LoopingMode(g.value))
        ) || zone.modulators.some((m) => isLostSFeModulator(m))
    );
}

function hasElementSFeData(element: BasicPreset | BasicInstrument) {
    return (
        hasZoneSFeData(element.globalZone) ||
        element.zones.some((z) => hasZoneSFeData(z))
    );
}

/**
 * Whether copying the elements brings SFe data along: their own, or that of the instruments
 * a preset uses, which are copied with it.
 */
export function hasCopiedSFeData(
    elements: Iterable<BasicPreset | BasicInstrument>
) {
    for (const element of elements) {
        if (hasElementSFeData(element)) {
            return true;
        }
        if (
            element instanceof BasicPreset &&
            element.zones.some((z) => hasElementSFeData(z.instrument))
        ) {
            return true;
        }
    }
    return false;
}

/**
 * The modulators the editor shows in SF2 mode, which leaves out those only SFe stores.
 */
export function getShownModulators<M extends ModulatorLike>(
    modulators: readonly M[],
    isSFe: boolean
) {
    return isSFe ? modulators : modulators.filter((m) => !isSFeModulator(m));
}

/**
 * Puts the hidden modulators of `all` back around an edited list of the shown ones. Each hidden
 * modulator keeps its index while it can, so a linked modulator that points to it still does.
 */
export function mergeHiddenModulators<M extends ModulatorLike>(
    all: readonly M[],
    shown: readonly M[]
) {
    const result = new Array<M>();
    let next = 0;
    for (const modulator of all) {
        if (isSFeModulator(modulator)) {
            result.push(modulator);
        } else if (next < shown.length) {
            result.push(shown[next++]);
        }
    }
    for (; next < shown.length; next++) {
        result.push(shown[next]);
    }
    return result;
}

/**
 * Whether the bank holds something that only an SFe save keeps. Core counts what an SF2 save
 * and a load would lose, which leaves out what its SF2 reader adds by itself (the resonance
 * twins and the default modulators SF2 cannot store). The bank numbers and the changed
 * send amounts are not SFe data, the first have a warning of their own. A lost curve that a
 * modulator uses counts with that modulator, and one that nothing uses is no loss.
 */
export function hasSFeOnlyData(bank: BasicSoundBank) {
    const losses = bank.getSF2Losses();
    return (
        losses.generators > 0 ||
        losses.alternatingLoops > 0 ||
        losses.modulators > 0 ||
        losses.defaultModulators > 0
    );
}
