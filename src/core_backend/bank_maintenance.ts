import {
    type BasicInstrument,
    type BasicSample,
    type SampleType,
    SampleTypes
} from "spessasynth_core";
import type { BankDocument } from "./bank_document.ts";
import type { HistoryAction } from "./history.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { SetSampleTypeAction } from "../sample_editor/set_sample_type_action.ts";

/**
 * Maps the stereo marker at the end of a sample name
 * to the marker of its pair and the type of the sample itself.
 */
const STEREO_MARKERS = new Map<
    string,
    { pairMarker: string; type: SampleType }
>([
    ["l", { pairMarker: "r", type: SampleTypes.leftSample }],
    ["L", { pairMarker: "R", type: SampleTypes.leftSample }],
    ["r", { pairMarker: "l", type: SampleTypes.rightSample }],
    ["R", { pairMarker: "L", type: SampleTypes.rightSample }]
]);

/**
 * Builds the actions that delete every instrument no preset uses,
 * then every sample no remaining instrument uses.
 */
export function createRemoveUnusedActions(document: BankDocument) {
    const deletedInstruments = new Set<BasicInstrument>();
    for (const instrument of document.instruments) {
        if (instrument.useCount === 0) {
            deletedInstruments.add(instrument);
        }
    }

    const deletedSamples = new Array<BasicSample>();
    for (const sample of document.samples) {
        const remainingUses = sample.linkedTo.filter(
            (i) => !deletedInstruments.has(i)
        );
        if (remainingUses.length === 0) {
            deletedSamples.push(sample);
        }
    }

    // Instruments go first, as deleting them unlinks the samples
    const actions: HistoryAction[] = [
        ...Array.from(deletedInstruments, (i) => new DeleteInstrumentAction(i)),
        ...deletedSamples.map((s) => new DeleteSampleAction(s))
    ];
    return {
        actions,
        instrumentCount: deletedInstruments.size,
        sampleCount: deletedSamples.length
    };
}

/**
 * Builds the actions that link unlinked samples into stereo pairs
 * when their names differ only in a trailing L/R marker.
 */
export function createAutoLinkActions(samples: readonly BasicSample[]) {
    const actions = new Array<SetSampleTypeAction>();
    const linkedSamples = new Set<BasicSample>();
    for (const sample of samples) {
        if (sample.linkedSample || linkedSamples.has(sample)) {
            continue;
        }

        const match = /[a-zA-Z!](?=\s*$|\)|$)/.exec(sample.name)?.[0];
        const marker =
            match === undefined ? undefined : STEREO_MARKERS.get(match);
        if (!marker) {
            continue;
        }
        const { pairMarker, type } = marker;
        const linkedName = sample.name.replace(
            /([a-zA-Z!])(?!.*[a-zA-Z!])/,
            () => pairMarker
        );
        const linkedSample = samples.find(
            (s) =>
                s.name === linkedName &&
                !linkedSamples.has(s) &&
                !s.linkedSample
        );
        if (!linkedSample) {
            continue;
        }

        linkedSamples.add(sample);
        linkedSamples.add(linkedSample);
        actions.push(new SetSampleTypeAction(sample, { linkedSample, type }));
    }
    return actions;
}
