import {
    type BasicSoundBank,
    type BasicZone,
    GeneratorTypes
} from "spessasynth_core";

/**
 * Generators above `endOper` are SpessaSynth's own (61 to 88). Only SFE files store them, so
 * SF2, SF3 and DLS saves leave them out, together with the modulators that target them.
 */
function isSFEGenerator(type: number) {
    return type > GeneratorTypes.endOper;
}

function hasZoneSFEData(zone: BasicZone) {
    return (
        zone.generators.some((g) => isSFEGenerator(g.type)) ||
        zone.modulators.some((m) => isSFEGenerator(m.destination))
    );
}

/**
 * Whether the bank sets a generator or a modulator that only an SFE save keeps.
 */
export function hasSFEOnlyData(bank: BasicSoundBank) {
    const elements = [...bank.presets, ...bank.instruments];
    return (
        elements.some(
            (e) =>
                hasZoneSFEData(e.globalZone) ||
                e.zones.some((z) => hasZoneSFEData(z))
        ) || bank.defaultModulators.some((m) => isSFEGenerator(m.destination))
    );
}
