import type { BasicSample } from "spessasynth_core";
import { EditSampleAction } from "./edit_sample_action.ts";
import { getRootKeyFromName } from "../utils/root_key_from_name.ts";
import { getStereoGroup } from "./sample_audio.ts";

/**
 * Sets each sample's root key to the note its name gives. The other half of a stereo pair
 * follows, as in the sample editor, unless its own name gives a note. `skipped` counts the
 * samples that got no key.
 */
export function createRootKeyActions(samples: Iterable<BasicSample>) {
    const selected = [...samples];
    const keys = new Map<BasicSample, number>();
    for (const sample of selected) {
        const key = getRootKeyFromName(sample.name);
        if (key !== undefined) {
            keys.set(sample, key);
        }
    }
    const named = [...keys];
    for (const [sample, key] of named) {
        const [, partner] = getStereoGroup(sample);
        if (partner && !keys.has(partner)) {
            keys.set(partner, key);
        }
    }
    const actions = new Array<EditSampleAction<"originalKey">>();
    for (const [sample, key] of keys) {
        if (key !== sample.originalKey) {
            actions.push(
                new EditSampleAction(
                    sample,
                    "originalKey",
                    sample.originalKey,
                    key
                )
            );
        }
    }
    const skipped = selected.filter((sample) => !keys.has(sample)).length;
    return { actions, skipped };
}
