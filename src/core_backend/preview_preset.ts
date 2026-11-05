import {
    BasicInstrument,
    BasicPreset,
    type BasicSoundBank,
    GeneratorTypes
} from "spessasynth_core";
import type { BankEntity } from "./bank_view.ts";

/**
 * Returns the preset that plays the element on the preview channel.
 * Instruments and samples are wrapped in a preset (and an instrument) that is not part of the
 * bank. The wrapper zones do not link their children, so the element's use count and
 * "used by" lists stay unchanged and it can still be deleted.
 */
export function createPreviewPreset(
    target: BankEntity,
    bank: BasicSoundBank
): BasicPreset {
    if (target instanceof BasicPreset) {
        return target;
    }
    const preset = new BasicPreset(bank);
    // A distinct name makes a leaked wrapper easy to spot
    preset.name = "PREVIEW PRESET";
    if (target instanceof BasicInstrument) {
        preset.createZone(target, false);
        return preset;
    }
    const instrument = new BasicInstrument();
    instrument.name = "PREVIEW INSTRUMENT";
    preset.createZone(instrument, false);
    const zone = instrument.createZone(target, false);
    // Loop the sample so its loop points can be heard
    zone.setGenerator(GeneratorTypes.sampleModes, 1);
    return preset;
}
