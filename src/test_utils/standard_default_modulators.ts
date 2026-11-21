import { Modulator, SPESSASYNTH_DEFAULT_MODULATORS } from "spessasynth_core";

/**
 * Copies of core's standard default modulators, which are frozen.
 */
export function copyStandardDefaults() {
    return SPESSASYNTH_DEFAULT_MODULATORS.map((m) => Modulator.copyFrom(m));
}
