import { BasicSoundBank, Modulator } from "spessasynth_core";

/**
 * What a DLS save leaves out.
 */
export type DLSLoss = "stereoLinks" | "unusedInstruments" | "defaultModulators";

const STANDARD_MODULATORS = new BasicSoundBank().defaultModulators;

/**
 * Whether the default modulators differ from core's, as core's SF2 writer decides when it
 * writes them.
 */
function hasCustomDefaultModulators(bank: BasicSoundBank) {
    const modulators = bank.defaultModulators;
    return (
        modulators.length !== STANDARD_MODULATORS.length ||
        modulators.some((m) =>
            STANDARD_MODULATORS.every((s) => !Modulator.isIdentical(s, m, true))
        )
    );
}

/**
 * What a DLS save of the bank would leave out. DLS samples are mono, it writes the presets
 * flattened into instruments of their own (so an instrument no preset uses is gone), and it has
 * no place for default modulators.
 */
export function getDLSLosses(bank: BasicSoundBank) {
    const losses = new Array<DLSLoss>();
    if (bank.samples.some((s) => s.isLinked)) {
        losses.push("stereoLinks");
    }
    if (bank.instruments.some((i) => i.linkedTo.length === 0)) {
        losses.push("unusedInstruments");
    }
    if (hasCustomDefaultModulators(bank)) {
        losses.push("defaultModulators");
    }
    return losses;
}
