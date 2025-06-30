import type { BasicSample } from "spessasynth_core";

/**
 * Adds linked samples to the list if needed, and reorders, making sure that they are in pairs
 */
export function addAndReorderStereoSamples(
    samples: BasicSample[] | Set<BasicSample>
): BasicSample[] {
    const samples1 = new Set<BasicSample>();

    samples.forEach((s) => {
        samples1.add(s);
        if (s.linkedSample) {
            samples1.add(s.linkedSample);
        }
    });

    const orderedSamples: BasicSample[] = [];
    // reorder the samples
    samples.forEach((sample) => {
        if (orderedSamples.includes(sample)) {
            return;
        }
        orderedSamples.push(sample);
        if (
            sample.linkedSample &&
            !orderedSamples.includes(sample.linkedSample)
        ) {
            orderedSamples.push(sample.linkedSample);
        }
    });

    return orderedSamples;
}
