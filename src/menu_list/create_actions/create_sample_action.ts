import type { BasicSample } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class CreateSampleAction implements HistoryAction {
    private readonly sample: BasicSample;

    public constructor(sample: BasicSample) {
        this.sample = sample;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.addSample(this.sample);
        changes.touchList("samples");
        changes.touch(this.sample);
        changes.focusOn(this.sample);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.removeSample(this.sample);
        changes.touchList("samples");
        changes.focusOn(document.samples[0] ?? "info");
    }
}
