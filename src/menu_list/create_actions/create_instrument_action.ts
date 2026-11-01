import type { BasicInstrument } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class CreateInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;

    public constructor(instrument: BasicInstrument) {
        this.instrument = instrument;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.addInstrument(this.instrument);
        changes.touchList("instruments");
        changes.touch(
            this.instrument,
            ...this.instrument.zones.map((z) => z.sample)
        );
        changes.focusOn(this.instrument);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.removeInstrument(this.instrument);
        changes.touchList("instruments");
        changes.touch(...this.instrument.zones.map((z) => z.sample));
        changes.focusOn(document.instruments[0] ?? "info");
    }
}
