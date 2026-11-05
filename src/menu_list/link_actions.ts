import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    BasicZone,
    GeneratorTypes,
    SampleTypes
} from "spessasynth_core";
import { addAndReorderStereoSamples } from "../utils/add_stereo_samples.ts";
import { getStereoBaseName } from "../utils/stereo_regex.ts";
import { CreateInstrumentAction } from "./create_actions/create_instrument_action.ts";
import { CreatePresetAction } from "./create_actions/create_preset_action.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import { getSpreadRanges } from "../instrument_editor/spread_actions.ts";
import { findFreePatch, getTakenPatches } from "../core_backend/free_patch.ts";
import { CreateZonesAction } from "./create_actions/create_zones_action.ts";
import { getFreeName } from "../utils/element_name.ts";

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
 * Adds the samples (and the other halves of stereo pairs) to the instrument as new zones, in
 * one action.
 */
export function createSampleLinkActions(
    instrument: BasicInstrument,
    samples: Iterable<BasicSample>
) {
    const newZones = addAndReorderStereoSamples(samples).map((sample) => {
        const template = new BasicZone();
        setStereoPan(template, sample);
        return { template, child: sample };
    });
    return newZones.length > 0
        ? [new CreateZonesAction(instrument, newZones)]
        : [];
}

/**
 * Adds the instruments to the preset as new zones, in one action.
 */
export function createInstrumentLinkActions(
    preset: BasicPreset,
    instruments: Iterable<BasicInstrument>
) {
    const newZones = Array.from(instruments, (instrument) => ({
        template: new BasicZone(),
        child: instrument
    }));
    return newZones.length > 0 ? [new CreateZonesAction(preset, newZones)] : [];
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
 * A new instrument with a zone for each sample, named after the first one (with a number when
 * an instrument has that name). It loops when every sample has a loop of its own, and samples
 * with different root keys are spread across the keyboard, as playing them all on every key is
 * rarely what a multisample wants.
 */
export function createInstrumentFromSamples(
    document: BankDocument,
    samples: Iterable<BasicSample>
) {
    const ordered = addAndReorderStereoSamples(samples);
    const [firstSample] = ordered;
    if (!firstSample) {
        throw new Error("An instrument needs at least one sample.");
    }
    const instrument = new BasicInstrument();
    const name = firstSample.linkedSample
        ? getStereoBaseName(firstSample.name, firstSample.linkedSample.name)
        : firstSample.name;
    const taken = new Set(document.instruments.map((i) => i.name));
    instrument.name = getFreeName(name, (n) => taken.has(n));
    if (ordered.every((s) => hasRealLoop(s))) {
        instrument.globalZone.setGenerator(GeneratorTypes.sampleModes, 1);
    }
    for (const sample of ordered) {
        setStereoPan(instrument.createZone(sample), sample);
    }
    const ranges = getSpreadRanges(instrument);
    if (new Set(ranges.values()).size > 1) {
        for (const [zone, range] of ranges) {
            zone.keyRange = range;
        }
        // Zones are always sorted by key range, the selection was in name order
        document.sortZones(instrument);
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
