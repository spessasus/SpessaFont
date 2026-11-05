import type { BasicSample } from "spessasynth_core";
import type { HistoryAction, HistoryLabel } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

export type EditableSampleProperty =
    | "name"
    | "sampleRate"
    | "originalKey"
    | "pitchCorrection"
    | "loopStart"
    | "loopEnd";

export class EditSampleAction<
    K extends EditableSampleProperty
> implements HistoryAction {
    private readonly sample: BasicSample;
    private readonly propertyName: K;
    private readonly before: BasicSample[K];
    private readonly after: BasicSample[K];
    public readonly label: HistoryLabel;

    public constructor(
        sample: BasicSample,
        propertyName: K,
        before: BasicSample[K],
        after: BasicSample[K]
    ) {
        this.sample = sample;
        this.propertyName = propertyName;
        this.before = before;
        this.after = after;
        this.label = propertyName === "name" ? "renameSample" : "editSample";
    }

    private apply(changes: ChangeSet, value: BasicSample[K]) {
        this.sample[this.propertyName] = value;
        changes.touch(this.sample);
        if (this.propertyName === "name") {
            changes.touchList("samples");
        }
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.after);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.before);
    }
}
