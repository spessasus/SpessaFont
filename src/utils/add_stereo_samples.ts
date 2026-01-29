import type { BasicSample } from "spessasynth_core";

/**
 * Adds linked samples to the list if needed, and reorders, making sure that they are in pairs
 */
export function addAndReorderStereoSamples(
    samples: BasicSample[] | Set<BasicSample>
): BasicSample[] {
    const samples1 = new Set<BasicSample>();

    for (const s of samples) {
        samples1.add(s);
        if (s.linkedSample) {
            samples1.add(s.linkedSample);
        }
    }

    const orderedSamples: BasicSample[] = [];
    // reorder the samples
    for (const sample of samples) {
        if (orderedSamples.includes(sample)) {
            continue;
        }
        orderedSamples.push(sample);
        if (
            sample.linkedSample &&
            !orderedSamples.includes(sample.linkedSample)
        ) {
            orderedSamples.push(sample.linkedSample);
        }
    }

    return orderedSamples;
}
