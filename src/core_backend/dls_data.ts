import type { BasicSoundBank } from "spessasynth_core";
import { hasOwnDefaultModulators } from "./resonance_compensation.ts";

/**
 * What a DLS save leaves out.
 */
export type DLSLoss = "stereoLinks" | "unusedInstruments" | "defaultModulators";

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
    if (hasOwnDefaultModulators(bank.defaultModulators)) {
        losses.push("defaultModulators");
    }
    return losses;
}
