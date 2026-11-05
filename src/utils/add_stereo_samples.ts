import type { BasicSample } from "spessasynth_core";

/**
 * The samples in their order, each followed by the other half of its stereo pair (added when
 * it was not given), so pairs stay together.
 */
export function addAndReorderStereoSamples(samples: Iterable<BasicSample>) {
    const ordered = new Array<BasicSample>();
    const added = new Set<BasicSample>();
    const add = (sample: BasicSample) => {
        if (added.has(sample)) {
            return;
        }
        added.add(sample);
        ordered.push(sample);
    };
    for (const sample of samples) {
        if (added.has(sample)) {
            continue;
        }
        add(sample);
        if (sample.linkedSample) {
            add(sample.linkedSample);
        }
    }
    return ordered;
}
