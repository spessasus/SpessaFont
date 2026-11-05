import type { BasicInstrument } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";

export class EditInstrumentNameAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
    private readonly before: string;
    private readonly after: string;

    public readonly label = "renameInstrument";

    public constructor(
        instrument: BasicInstrument,
        before: string,
        after: string
    ) {
        this.instrument = instrument;
        this.before = before;
        this.after = after;
    }

    private apply(changes: ChangeSet, name: string) {
        this.instrument.name = name;
        changes.touch(this.instrument);
        changes.touchList("instruments");
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.after);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.apply(changes, this.before);
    }
}
