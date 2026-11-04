import type { BasicSample, SampleType } from "spessasynth_core";

interface SampleLinkState {
    sample: BasicSample;
    linkedSample: BasicSample | undefined;
    sampleType: SampleType;
}

/**
 * The stereo links and types of the samples, so undo can put them back exactly.
 * Core's link calls change both samples of a pair and refuse some states (ROM types, a link
 * to an already linked sample), so restoring through them is not exact.
 */
export function captureSampleLinks(samples: Iterable<BasicSample | undefined>) {
    const states = new Array<SampleLinkState>();
    // A pair can be passed from both sides, each sample is captured once
    const unique = new Set(samples);
    for (const sample of unique) {
        if (sample) {
            states.push({
                sample,
                linkedSample: sample.linkedSample,
                sampleType: sample.sampleType
            });
        }
    }
    return states;
}

export function restoreSampleLinks(states: readonly SampleLinkState[]) {
    for (const { sample, linkedSample, sampleType } of states) {
        sample.linkedSample = linkedSample;
        sample.sampleType = sampleType;
    }
}
