import type { BasicSample, SampleType } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";
import {
    captureSampleLinks,
    restoreSampleLinks
} from "../core_backend/sample_links.ts";

interface SampleLink {
    linkedSample: BasicSample | undefined;
    type: SampleType;
}

/**
 * Changes a sample's type and stereo partner. The sample and the new partner are unlinked from
 * their current partners first, so no half link is left behind. Undo restores all of them.
 */
export class SetSampleTypeAction implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly after: SampleLink;
    private links = captureSampleLinks([]);

    /**
     * @param sample the sample to change
     * @param after the new linked sample (undefined for mono) and type
     */
    public readonly label = "changeSampleType";

    public constructor(sample: BasicSample, after: SampleLink) {
        this.sample = sample;
        this.after = after;
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        const { linkedSample, type } = this.after;
        // Captured here, as an earlier action in the same group may have changed the links
        this.links = captureSampleLinks([
            this.sample,
            this.sample.linkedSample,
            linkedSample,
            linkedSample?.linkedSample
        ]);
        this.sample.unlinkSample();
        // Without a partner the sample stays mono, a left or right half needs one
        if (linkedSample) {
            linkedSample.unlinkSample();
            this.sample.setLinkedSample(linkedSample, type);
        }
        changes.touch(...this.links.map((l) => l.sample));
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        restoreSampleLinks(this.links);
        changes.touch(...this.links.map((l) => l.sample));
    }
}
