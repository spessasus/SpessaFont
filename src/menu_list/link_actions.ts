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
import { findFreePatch, getTakenPatches } from "../core_backend/free_patch.ts";

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
 * Shorter loops are taken as no loop.
 */
const MIN_LOOP_LENGTH = 32;

/**
 * Whether the sample has a loop of its own. An imported file loops its whole length, which is
 * no loop, so a drum hit is not looped.
 */
function hasRealLoop(sample: BasicSample) {
    const isWholeSample =
        sample.loopStart === 0 && sample.loopEnd >= sample.sampleLength - 1;
    return (
        !isWholeSample && sample.loopEnd - sample.loopStart >= MIN_LOOP_LENGTH
    );
}

/**
 * A new instrument with a zone for each sample, named after the first one. It loops when every
 * sample has a loop of its own.
 */
export function createInstrumentFromSamples(samples: Iterable<BasicSample>) {
    const ordered = addAndReorderStereoSamples(samples);
    const instrument = new BasicInstrument();
    const [firstSample] = ordered;
    instrument.name = firstSample.linkedSample
        ? firstSample.name.replace(STEREO_REGEX, "")
        : firstSample.name;
    if (ordered.every((s) => hasRealLoop(s))) {
        instrument.globalZone.setGenerator(GeneratorTypes.sampleModes, 1);
    }
    for (const sample of ordered) {
        setStereoPan(instrument.createZone(sample), sample);
    }
    return new CreateInstrumentAction(instrument);
}

/**
 * A new preset with a zone for each instrument, named after the first one, on the first free
 * program of bank 0 (or a later bank when bank 0 is full).
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
    const patch = findFreePatch(
        { program: 0, bankMSB: 0, bankLSB: 0, isGMGSDrum: false },
        getTakenPatches(document.presets)
    );
    if (!patch) {
        throw new Error(
            "Every MIDI patch is taken, there is no room for a preset."
        );
    }
    preset.program = patch.program;
    preset.bankMSB = patch.bankMSB;
    preset.bankLSB = patch.bankLSB;
    return new CreatePresetAction(preset);
}
