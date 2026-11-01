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
 * bank. The wrappers are unlinked from their children, so the element's use count and
 * "used by" lists stay unchanged and it can still be deleted.
 * A public way to create an unlinked zone in spessasynth_core would remove the unlinking.
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
        preset.createZone(target);
        target.unlinkFrom(preset);
        return preset;
    }
    const instrument = new BasicInstrument();
    instrument.name = "PREVIEW INSTRUMENT";
    preset.createZone(instrument);
    instrument.unlinkFrom(preset);
    const zone = instrument.createZone(target);
    target.unlinkFrom(instrument);
    // Loop the sample so its loop points can be heard
    zone.setGenerator(GeneratorTypes.sampleModes, 1);
    return preset;
}
