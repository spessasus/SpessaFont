import type { BasicSample } from "spessasynth_core";
import { EditSampleAction } from "./edit_sample_action.ts";
import { getRootKeyFromName } from "../utils/root_key_from_name.ts";

/**
 * Sets each sample's root key to the note its name gives. `skipped` counts the names without one.
 */
export function createRootKeyActions(samples: Iterable<BasicSample>) {
    const actions = new Array<EditSampleAction<"originalKey">>();
    let skipped = 0;
    for (const sample of samples) {
        const key = getRootKeyFromName(sample.name);
        if (key === undefined) {
            skipped++;
        } else if (key !== sample.originalKey) {
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
    return { actions, skipped };
}
