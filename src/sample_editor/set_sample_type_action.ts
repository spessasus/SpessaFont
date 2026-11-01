import type { BasicSample, SampleType } from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

interface SampleLink {
    linkedSample: BasicSample | undefined;
    type: SampleType;
}

export class SetSampleTypeAction implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly after: SampleLink;
    private before: SampleLink;

    /**
     * @param sample the sample to change
     * @param after the new linked sample (undefined for mono) and type
     */
    public constructor(sample: BasicSample, after: SampleLink) {
        this.sample = sample;
        this.before = {
            linkedSample: sample.linkedSample,
            type: sample.sampleType
        };
        this.after = after;
    }

    private apply(changes: ChangeSet, { linkedSample, type }: SampleLink) {
        const previousLink = this.sample.linkedSample;
        if (linkedSample) {
            this.sample.setLinkedSample(linkedSample, type);
        } else {
            this.sample.unlinkSample();
        }
        changes.touch(this.sample);
        if (previousLink) {
            changes.touch(previousLink);
        }
        if (linkedSample) {
            changes.touch(linkedSample);
        }
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        // Captured here, as an earlier action in the same group may have changed the link
        this.before = {
            linkedSample: this.sample.linkedSample,
            type: this.sample.sampleType
        };
        this.apply(changes, this.after);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.before);
    }
}
