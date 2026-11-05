import type { BasicInstrument } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { neighborOrInfo } from "../../core_backend/neighbor_or_info.ts";

export class CreateInstrumentAction implements HistoryAction {
    private readonly instrument: BasicInstrument;
    // Where undo removed it from, so redo puts it back there with its links
    private removedIndex: number | undefined;

    public readonly label = "addInstrument";

    public constructor(instrument: BasicInstrument) {
        this.instrument = instrument;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        if (this.removedIndex === undefined) {
            document.addInstrument(this.instrument);
        } else {
            document.restoreInstrument(this.instrument, this.removedIndex);
        }
        changes.touchList("instruments");
        changes.touch(
            this.instrument,
            ...this.instrument.zones.map((z) => z.sample)
        );
        changes.focusOn(this.instrument);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.removedIndex = document.removeInstrument(this.instrument);
        changes.touchList("instruments");
        changes.touch(...this.instrument.zones.map((z) => z.sample));
        changes.focusOn(
            neighborOrInfo(document.instruments, this.removedIndex)
        );
    }
}
