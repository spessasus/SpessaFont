import {
    GeneratorTypes,
    ModulatorControllerSources,
    ModulatorCurveTypes,
    ModulatorTransformTypes
} from "spessasynth_core";
import { ILLEGAL_CC_DESTINATIONS } from "../utils/midi_constants.ts";
import type { ModulatorLike } from "./modulator_like.ts";

/*
 * A modulator SFe 4.0 ignores (section 7.4), which core's SF2 writer leaves out and its reader
 * does not count. Core's `isIgnoredModulator` (internal), for the zones of an instrument and the
 * default list. Keep the two the same.
 */

const KNOWN_DESTINATIONS = new Set<number>(Object.values(GeneratorTypes));
KNOWN_DESTINATIONS.delete(GeneratorTypes.invalid);
KNOWN_DESTINATIONS.delete(GeneratorTypes.endOper);

/**
 * Destinations core reads before a voice starts, which no modulator can change.
 */
const PRE_VOICE_GENERATORS = new Set<number>([
    GeneratorTypes.keyRange,
    GeneratorTypes.velRange,
    GeneratorTypes.keyNum,
    GeneratorTypes.velocity,
    GeneratorTypes.instrument,
    GeneratorTypes.sampleID,
    GeneratorTypes.instrumentMSB,
    GeneratorTypes.sampleIDMSB
]);

/**
 * The general controllers a modulator may use, the rest are reserved.
 */
const GENERAL_SOURCES = new Set<number>([
    ModulatorControllerSources.noController,
    ModulatorControllerSources.noteOnVelocity,
    ModulatorControllerSources.noteOnKeyNum,
    ModulatorControllerSources.polyPressure,
    ModulatorControllerSources.channelPressure,
    ModulatorControllerSources.pitchWheel,
    ModulatorControllerSources.pitchWheelRange,
    ModulatorControllerSources.modulationDepthRange
]);

/**
 * Whether core ignores the modulator: an unknown destination or transform, a destination no
 * modulator can change, an unknown source type, or an illegal or reserved controller as a source.
 */
export function isIgnoredModulator(modulator: ModulatorLike) {
    return (
        !KNOWN_DESTINATIONS.has(modulator.destination) ||
        PRE_VOICE_GENERATORS.has(modulator.destination) ||
        (modulator.transformType !== ModulatorTransformTypes.linear &&
            modulator.transformType !== ModulatorTransformTypes.absolute) ||
        [modulator.primarySource, modulator.secondarySource].some(
            (s) =>
                s.curveType > ModulatorCurveTypes.custom ||
                (s.isCC
                    ? ILLEGAL_CC_DESTINATIONS.some((cc) => cc === s.index)
                    : !GENERAL_SOURCES.has(s.index))
        )
    );
}
