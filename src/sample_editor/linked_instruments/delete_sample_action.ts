import type { BasicSample } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { neighborOrInfo } from "../../core_backend/neighbor_or_info.ts";

export class DeleteSampleAction implements HistoryAction {
    private readonly sample: BasicSample;
    private index = -1;

    public constructor(sample: BasicSample) {
        this.sample = sample;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.index = document.removeSample(this.sample);
        changes.touchList("samples");
        changes.focusOn(neighborOrInfo(document.samples, this.index));
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.restoreSample(this.sample, this.index);
        changes.touchList("samples");
        changes.touch(this.sample);
        changes.focusOn(this.sample);
    }
}
