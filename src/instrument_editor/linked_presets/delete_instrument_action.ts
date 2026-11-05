import type { BasicInstrument } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { neighborOrInfo } from "../../core_backend/neighbor_or_info.ts";

export class DeleteInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
    private index = -1;

    public readonly label = "deleteInstrument";

    public constructor(instrument: BasicInstrument) {
        this.instrument = instrument;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.index = document.removeInstrument(this.instrument);
        changes.touchList("instruments");
        changes.touch(...this.instrument.zones.map((z) => z.sample));
        changes.focusOn(neighborOrInfo(document.instruments, this.index));
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.restoreInstrument(this.instrument, this.index);
        changes.touchList("instruments");
        changes.touch(
            this.instrument,
            ...this.instrument.zones.map((z) => z.sample)
        );
        changes.focusOn(this.instrument);
    }
}
