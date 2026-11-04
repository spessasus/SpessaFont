import {
    ModulatorControllerSources,
    type ModulatorSourceIndex
} from "spessasynth_core";

export interface SpessaFontModulatorSource {
    usesCC: boolean;
    sourceIndex: ModulatorSourceIndex;
}

/**
 * The sources a modulator can pick besides the MIDI controllers, in the order the picker shows them.
 */
export const NON_CC_SOURCES = [
    ModulatorControllerSources.noController,
    ModulatorControllerSources.noteOnVelocity,
    ModulatorControllerSources.noteOnKeyNum,
    ModulatorControllerSources.polyPressure,
    ModulatorControllerSources.channelPressure,
    ModulatorControllerSources.pitchWheel,
    ModulatorControllerSources.pitchWheelRange
] as const;

/**
 * One select holds both kinds of source. A CC is its number, any other source is
 * `-(index + 1)`, so "no controller" (index 0) does not collide with CC 0.
 */
export function toSourceOptionValue({
    usesCC,
    sourceIndex
}: SpessaFontModulatorSource) {
    return (usesCC ? sourceIndex : -(sourceIndex + 1)).toString();
}

export function fromSourceOptionValue(
    value: string
): SpessaFontModulatorSource {
    const num = Number.parseInt(value);
    if (!Number.isSafeInteger(num)) {
        throw new TypeError(`Not a modulator source option: ${value}`);
    }
    return num >= 0
        ? { usesCC: true, sourceIndex: num as ModulatorSourceIndex }
        : { usesCC: false, sourceIndex: (-num - 1) as ModulatorSourceIndex };
}
