import {
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    SPESSASYNTH_DEFAULT_MODULATORS
} from "spessasynth_core";
import { isSFeModulator } from "./sfe_data.ts";
import type { ModulatorLike, SourceLike } from "./modulator_like.ts";
import {
    hasOwnDefaultModulators,
    isStandardList
} from "./resonance_compensation.ts";
import { isIgnoredModulator } from "./ignored_modulator.ts";

/*
 * SF2 mode hides the standard default modulators SF2 cannot store. An SF2 file with its own
 * default list (a DMOD chunk) only gets some of them back when core reads it: the envelope time
 * ones unless the list has a CC 72, 73 or 75 modulator, the variation send unless it has a CC 94
 * one, and none at all for an empty list. So an edit in SF2 mode drops the rest, or the bank
 * plays unlike the saved file. This is core's rule (`restoredDefaults` in its
 * sf2_compatibility.ts, internal there), keep the two the same.
 */

const ENVELOPE_TIMES = new Set<number>([
    MIDIControllers.attackTime,
    MIDIControllers.decayTime,
    MIDIControllers.releaseTime
]);

function hasController(m: ModulatorLike, controllers: ReadonlySet<number>) {
    return [m.primarySource, m.secondarySource].some(
        (s) => s.isCC && controllers.has(s.index)
    );
}

const VARIATION = new Set<number>([MIDIControllers.variationDepth]);

/**
 * Which standard default modulators core puts back when it reads an SF2 file with this default
 * list in its DMOD chunk.
 */
function getRestoreRule(defaults: readonly ModulatorLike[]) {
    // What the writer puts in the DMOD chunk, without what core ignores
    const stored = defaults.filter(
        (m) => !isSFeModulator(m) && !isIgnoredModulator(m)
    );
    const hasEnvelopeTime = stored.some((m) =>
        hasController(m, ENVELOPE_TIMES)
    );
    const hasVariation = stored.some((m) => hasController(m, VARIATION));
    return (m: ModulatorLike) =>
        stored.length > 0 &&
        (m.destination === GeneratorTypes.variationEffectsSend
            ? !hasVariation
            : !hasEnvelopeTime &&
              m.primarySource.isCC &&
              ENVELOPE_TIMES.has(m.primarySource.index));
}

/**
 * The default list as an SF2 save and load give it back, for SF2 mode. A list that writes no DMOD
 * comes back whole, as do the modulators SF2 stores and hidden ones of the bank's own (SFe data
 * the save warns about). Core adds the restored standard ones a list lacks.
 */
export function getSF2DefaultModulators(defaults: readonly Modulator[]) {
    // A list whose shown part is the standard one again gets its hidden defaults back, as an
    // earlier edit in SF2 mode may have dropped them
    const full = [...defaults, ...getMissingHiddenDefaults(defaults)];
    if (!hasOwnDefaultModulators(full)) {
        return full;
    }
    const isRestored = getRestoreRule(defaults);
    const kept = defaults.filter(
        (m) =>
            !isSFeModulator(m) ||
            SPESSASYNTH_DEFAULT_MODULATORS.every(
                (d) => !Modulator.isIdentical(d, m, true)
            ) ||
            isRestored(m)
    );
    const added = SPESSASYNTH_DEFAULT_MODULATORS.filter(
        (d) =>
            isRestored(d) &&
            kept.every((m) => !Modulator.isIdentical(d, m, true))
    ).map((d) => Modulator.copyFrom(d));
    return [...kept, ...added];
}

/**
 * The standard default modulators SF2 mode hides, which a reset there puts back where they are
 * missing.
 */
export function getMissingHiddenDefaults(defaults: readonly Modulator[]) {
    return SPESSASYNTH_DEFAULT_MODULATORS.filter(
        (d) =>
            isSFeModulator(d) &&
            defaults.every((m) => !Modulator.isIdentical(d, m, true))
    ).map((d) => Modulator.copyFrom(d));
}

function isSameSource(a: SourceLike, b: SourceLike) {
    return (
        a.index === b.index &&
        a.isCC === b.isCC &&
        a.isBipolar === b.isBipolar &&
        a.isNegative === b.isNegative &&
        a.curveType === b.curveType
    );
}

function isStandardShape(standard: Modulator, m: ModulatorLike) {
    return (
        standard.destination === m.destination &&
        standard.transformAmount === m.transformAmount &&
        standard.transformType === m.transformType &&
        isSameSource(standard.primarySource, m.primarySource) &&
        isSameSource(standard.secondarySource, m.secondarySource)
    );
}

/**
 * The default modulators an SF2 save loses, SFe data the bank check and SF2 mode warn about.
 * The standard ones come back when the list writes no DMOD chunk, and otherwise the ones core
 * restores for that list. It takes views too, so the points of a custom curve are not compared,
 * only core can tell a changed curve. A twin counts too, the exception for twins is for zones.
 */
export function getLostSFeDefaultModulators<T extends ModulatorLike>(
    defaults: readonly T[]
) {
    // The standard list writes no DMOD chunk and comes back whole
    if (isStandardList(defaults, isStandardShape)) {
        return [];
    }
    const isRestored = getRestoreRule(defaults);
    return defaults.filter(
        (m) =>
            isSFeModulator(m) &&
            (!isRestored(m) ||
                SPESSASYNTH_DEFAULT_MODULATORS.every(
                    (standard) => !isStandardShape(standard, m)
                ))
    );
}
