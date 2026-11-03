import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    BasicZone,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import { CreateZoneAction } from "../generator_table/create_zone_action.ts";
import { addAndReorderStereoSamples } from "../utils/add_stereo_samples.ts";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";
import { CreateInstrumentAction } from "./create_actions/create_instrument_action.ts";
import { CreatePresetAction } from "./create_actions/create_preset_action.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";

/**
 * Stereo halves are panned fully to their side.
 */
function setStereoPan(zone: BasicZone, sample: BasicSample) {
    if (sample.sampleType === SampleTypes.leftSample) {
        zone.setGenerator(GeneratorTypes.pan, -500);
    } else if (sample.sampleType === SampleTypes.rightSample) {
        zone.setGenerator(GeneratorTypes.pan, 500);
    }
}

/**
 * Adds the samples (and the other halves of stereo pairs) to the instrument as new zones.
 */
export function createSampleLinkActions(
    instrument: BasicInstrument,
    samples: Iterable<BasicSample>
) {
    return addAndReorderStereoSamples(samples).map((sample) => {
        const zone = new BasicZone();
        setStereoPan(zone, sample);
        return new CreateZoneAction(instrument, zone, sample);
    });
}

/**
 * Adds the instruments to the preset as new zones.
 */
export function createInstrumentLinkActions(
    preset: BasicPreset,
    instruments: Iterable<BasicInstrument>
) {
    return Array.from(
        instruments,
        (instrument) =>
            new CreateZoneAction(preset, new BasicZone(), instrument)
    );
}

/**
 * A new looping instrument with a zone for each sample, named after the first one.
 */
export function createInstrumentFromSamples(samples: Iterable<BasicSample>) {
    const ordered = addAndReorderStereoSamples(samples);
    const instrument = new BasicInstrument();
    const [firstSample] = ordered;
    instrument.name = firstSample.linkedSample
        ? firstSample.name.replace(STEREO_REGEX, "")
        : firstSample.name;
    // add loop for convenience
    instrument.globalZone.setGenerator(GeneratorTypes.sampleModes, 1);
    for (const sample of ordered) {
        setStereoPan(instrument.createZone(sample), sample);
    }
    return new CreateInstrumentAction(instrument);
}

/**
 * A new preset with a zone for each instrument, named after the first one and moved to the
 * first free bank number.
 */
export function createPresetFromInstruments(
    document: BankDocument,
    instruments: Iterable<BasicInstrument>
) {
    const preset = new BasicPreset(document.bank);
    const list = [...instruments];
    preset.name = list[0].name;
    for (const instrument of list) {
        preset.createZone(instrument);
    }
    const allPresets = document.presets;
    for (let i = 1; allPresets.some((p) => p.matches(preset)); i++) {
        preset.bankMSB = i & 0x7f;
        preset.bankLSB = Math.max(i >> 7, 0);
    }
    return new CreatePresetAction(preset);
}
