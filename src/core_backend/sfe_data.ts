import {
    type BasicInstrument,
    BasicPreset,
    type BasicSoundBank,
    GeneratorTypes
} from "spessasynth_core";

/**
 * Generators above `endOper` are SpessaSynth's own (61 to 88). Only SFE files store them, so
 * SF2, SF3 and DLS saves leave them out, together with the modulators that target them.
 */
export function isSFEGenerator(type: number) {
    return type > GeneratorTypes.endOper;
}

/**
 * Whether a zone, or its view, sets something only an SFE save keeps.
 */
export function hasZoneSFEData(zone: {
    readonly generators: readonly { readonly type: number }[];
    readonly modulators: readonly { readonly destination: number }[];
}) {
    return (
        zone.generators.some((g) => isSFEGenerator(g.type)) ||
        zone.modulators.some((m) => isSFEGenerator(m.destination))
    );
}

function hasElementSFEData(element: BasicPreset | BasicInstrument) {
    return (
        hasZoneSFEData(element.globalZone) ||
        element.zones.some((z) => hasZoneSFEData(z))
    );
}

/**
 * Whether copying the elements brings SFE data along: their own, or that of the instruments
 * a preset uses, which are copied with it.
 */
export function hasCopiedSFEData(
    elements: Iterable<BasicPreset | BasicInstrument>
) {
    for (const element of elements) {
        if (hasElementSFEData(element)) {
            return true;
        }
        if (
            element instanceof BasicPreset &&
            element.zones.some((z) => hasElementSFEData(z.instrument))
        ) {
            return true;
        }
    }
    return false;
}

/**
 * The modulators the editor shows in SF2 mode, which leaves out those with an SFE destination.
 */
export function getShownModulators<M extends { readonly destination: number }>(
    modulators: readonly M[],
    isSFE: boolean
) {
    return isSFE
        ? modulators
        : modulators.filter((m) => !isSFEGenerator(m.destination));
}

/**
 * Puts the hidden modulators of `all` back around an edited list of the shown ones. Each hidden
 * modulator keeps its index while it can, so a linked modulator that points to it still does.
 */
export function mergeHiddenModulators<
    M extends { readonly destination: number }
>(all: readonly M[], shown: readonly M[]) {
    const result = new Array<M>();
    let next = 0;
    for (const modulator of all) {
        if (isSFEGenerator(modulator.destination)) {
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
 * Whether the bank sets a generator or a modulator that only an SFE save keeps.
 */
export function hasSFEOnlyData(bank: BasicSoundBank) {
    const elements = [...bank.presets, ...bank.instruments];
    return (
        elements.some((e) => hasElementSFEData(e)) ||
        bank.defaultModulators.some((m) => isSFEGenerator(m.destination))
    );
}
