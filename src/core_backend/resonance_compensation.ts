import {
    BasicInstrument,
    type BasicPreset,
    GeneratorTypes,
    MIDIControllers,
    Modulator,
    ModulatorControllerSources,
    ModulatorCurveTypes,
    ModulatorSource,
    SPESSASYNTH_DEFAULT_MODULATORS
} from "spessasynth_core";
import { isIgnoredModulator } from "./ignored_modulator.ts";
import type { BankDocument } from "./bank_document.ts";
import type { ModulatorLike, SourceLike } from "./modulator_like.ts";

/*
 * Core's default CC 71 modulator raises filterQOffset, an SFe generator. When core reads an SF2
 * file without a DMOD chunk, it gives every instrument zone with a CC 71 to initialFilterQ
 * modulator of its own an amount 0 twin of that default, which turns it off in the zone, so the
 * resonance is not doubled (SFe 4.0, section 9.2). The SF2 writer leaves the twins out. SF2 mode
 * hides the twins, so an edit of the shown modulators has to bring them along, or the bank plays
 * unlike the saved file. This is core's rule (`upgradeSF2Bank` and `hasResonanceModulator` in its
 * sf2_compatibility.ts, internal there), keep the two the same.
 */

function isController(source: SourceLike, controller: number) {
    return source.isCC && source.index === controller;
}

/**
 * Whether the modulator is a twin as core makes them: bipolar linear CC 71 to filterQOffset with
 * CC 71 as a switch for its amount, and an amount of 0. A view or a core modulator.
 */
export function isResonanceCompensator(modulator: ModulatorLike) {
    const { primarySource: primary, secondarySource: secondary } = modulator;
    return (
        modulator.destination === GeneratorTypes.filterQOffset &&
        modulator.transformAmount === 0 &&
        modulator.transformType === 0 &&
        isController(primary, MIDIControllers.filterResonance) &&
        primary.isBipolar &&
        !primary.isNegative &&
        primary.curveType === ModulatorCurveTypes.linear &&
        isController(secondary, MIDIControllers.filterResonance) &&
        !secondary.isBipolar &&
        !secondary.isNegative &&
        secondary.curveType === ModulatorCurveTypes.switch
    );
}

/**
 * A CC 71 to initialFilterQ modulator with built-in curves that the SF2 writer keeps and that
 * core does not ignore. For this destination the writer only drops the Modulation Depth Range
 * as the amount source.
 */
function isResonanceModulator(modulator: ModulatorLike) {
    const { primarySource: primary, secondarySource: secondary } = modulator;
    return (
        modulator.destination === GeneratorTypes.initialFilterQ &&
        isController(primary, MIDIControllers.filterResonance) &&
        primary.curveType <= ModulatorCurveTypes.switch &&
        secondary.curveType <= ModulatorCurveTypes.switch &&
        !isIgnoredModulator(modulator) &&
        (secondary.isCC ||
            secondary.index !== ModulatorControllerSources.modulationDepthRange)
    );
}

function createCompensator() {
    return new Modulator(
        new ModulatorSource(
            MIDIControllers.filterResonance,
            ModulatorCurveTypes.linear,
            true,
            true
        ),
        new ModulatorSource(
            MIDIControllers.filterResonance,
            ModulatorCurveTypes.switch,
            true
        ),
        GeneratorTypes.filterQOffset,
        0,
        0
    );
}

/**
 * Whether an SF2 save writes the default modulators (a DMOD chunk): the list is not core's
 * standard one, matched one to one. Core's `sf2NeedsDefaultModulators`, internal there.
 * Core gives no twins to the zones of such a file.
 */
export function hasOwnDefaultModulators(defaults: readonly Modulator[]) {
    return !isStandardList(defaults, (standard, m) =>
        Modulator.isIdentical(standard, m, true)
    );
}

/**
 * Whether the list is core's standard default list, matched one to one by `isSame`.
 */
export function isStandardList<T>(
    defaults: readonly T[],
    isSame: (standard: Modulator, m: T) => boolean
) {
    const unmatched = [...defaults];
    for (const standard of SPESSASYNTH_DEFAULT_MODULATORS) {
        const index = unmatched.findIndex((m) => isSame(standard, m));
        if (index === -1) {
            return false;
        }
        unmatched.splice(index, 1);
    }
    return unmatched.length === 0;
}

/**
 * The list with the twin it needs at its end, or without twins. A list that is right already
 * comes back with the same objects in the same places.
 * @param isTwinNeeded an instrument zone of a bank that an SF2 save writes without default
 * modulators. Preset zones never get one.
 */
export function syncResonanceCompensators(
    modulators: readonly Modulator[],
    isTwinNeeded: boolean
) {
    const twins = modulators.filter((m) => isResonanceCompensator(m));
    const isNeeded =
        isTwinNeeded && modulators.some((m) => isResonanceModulator(m));
    if (twins.length === (isNeeded ? 1 : 0)) {
        return [...modulators];
    }
    const kept = modulators.filter((m) => !isResonanceCompensator(m));
    return isNeeded ? [...kept, createCompensator()] : kept;
}

/**
 * How much the default CC 71 to filterQOffset modulator adds in a zone: the amount of the last
 * modulator of its kind in the zone, else in the global zone, else in the default list, as an
 * identical modulator supersedes the one before it. A twin makes it 0.
 */
function getResonanceOffset(
    defaults: readonly Modulator[],
    global: readonly Modulator[],
    local: readonly Modulator[]
) {
    const shape = createCompensator();
    const find = (list: readonly Modulator[]) =>
        list.findLast((m) => Modulator.isIdentical(shape, m))?.transformAmount;
    return find(local) ?? find(global) ?? find(defaults) ?? 0;
}

/**
 * Whether only an SFe-mode paste keeps how CC 71 plays in the instruments. SF2 mode syncs their
 * twins, so a zone may play it unlike in the bank they came from, while SFe mode keeps their
 * modulators. Zones that both modes change (the two default lists differ) do not count, and a
 * zone only SF2 mode keeps makes it false, as converting would change that one. Preset zones do
 * not count, a twin there adds nothing.
 * @param instruments the instruments the paste adds to the bank, not the ones it shares
 */
export function isSoundKeptOnlyInSFe(
    instruments: Iterable<BasicInstrument>,
    sourceDefaults: readonly Modulator[],
    targetDefaults: readonly Modulator[]
) {
    const isTwinNeeded = !hasOwnDefaultModulators(targetDefaults);
    let keptOnlyInSFe = 0;
    let keptOnlyInSF2 = 0;
    for (const { globalZone, zones } of instruments) {
        const global = globalZone.modulators;
        const syncedGlobal = syncResonanceCompensators(global, isTwinNeeded);
        for (const { modulators } of zones) {
            const before = getResonanceOffset(
                sourceDefaults,
                global,
                modulators
            );
            const isKeptInSFe =
                getResonanceOffset(targetDefaults, global, modulators) ===
                before;
            const isKeptInSF2 =
                getResonanceOffset(
                    targetDefaults,
                    syncedGlobal,
                    syncResonanceCompensators(modulators, isTwinNeeded)
                ) === before;
            if (isKeptInSFe && !isKeptInSF2) {
                keptOnlyInSFe++;
            } else if (isKeptInSF2 && !isKeptInSFe) {
                keptOnlyInSF2++;
            }
        }
    }
    return keptOnlyInSFe > 0 && keptOnlyInSF2 === 0;
}

/**
 * Whether pasting or copying the instruments into the bank should ask to convert it to SFe,
 * which alone keeps how they play CC 71 (`isSoundKeptOnlyInSFe`). Only an SF2-mode bank syncs
 * the twins, and one that saves as DLS has none.
 * @param instruments the instruments the paste adds to the bank
 * @param sourceDefaults the default modulators of the bank they come from
 */
export function isTwinQuestionNeeded(
    document: BankDocument,
    instruments: Iterable<BasicInstrument>,
    sourceDefaults: readonly Modulator[]
) {
    return (
        document.format === "sf2" &&
        document.writeFormat !== "dls" &&
        isSoundKeptOnlyInSFe(
            instruments,
            sourceDefaults,
            document.bank.defaultModulators
        )
    );
}

/**
 * Whether an SF2-mode edit of a zone's modulators brings in a twin that the sync would take out
 * again, where core would not make one (a preset zone, a zone without a CC 71 to Q modulator).
 * Only SFe mode keeps it, like other SFe data.
 */
export function isLosingNewTwin(
    document: BankDocument,
    element: BasicPreset | BasicInstrument,
    before: readonly Modulator[],
    after: readonly Modulator[]
) {
    const isTwinNeeded =
        element instanceof BasicInstrument &&
        !hasOwnDefaultModulators(document.bank.defaultModulators);
    // DLS has no default for a twin to turn off, so its save drops them and nothing changes
    return (
        document.writeFormat !== "dls" &&
        after.some((m) => isResonanceCompensator(m) && !before.includes(m)) &&
        syncResonanceCompensators(after, isTwinNeeded).every(
            (m) => !isResonanceCompensator(m)
        )
    );
}
