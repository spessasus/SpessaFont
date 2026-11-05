import type { BasicSample } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { neighborOrInfo } from "../../core_backend/neighbor_or_info.ts";
import {
    captureSampleLinks,
    restoreSampleLinks
} from "../../core_backend/sample_links.ts";

/**
 * Removes a sample. A stereo partner that stays in the bank becomes mono, as it would otherwise
 * point at a sample that is gone (and save a link to sample 0). Undo restores the pair.
 */
export class DeleteSampleAction implements HistoryAction {
    private readonly sample: BasicSample;
    private index = -1;
    private links = captureSampleLinks([]);

    public readonly label = "deleteSample";

    public constructor(sample: BasicSample) {
        this.sample = sample;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        const partner = this.sample.linkedSample;
        this.links = captureSampleLinks([this.sample, partner]);
        this.sample.unlinkSample();
        this.index = document.removeSample(this.sample);
        changes.touchList("samples");
        if (partner) {
            changes.touch(partner);
        }
        changes.focusOn(neighborOrInfo(document.samples, this.index));
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.restoreSample(this.sample, this.index);
        restoreSampleLinks(this.links);
        changes.touchList("samples");
        changes.touch(...this.links.map((l) => l.sample));
        changes.focusOn(this.sample);
    }
}
