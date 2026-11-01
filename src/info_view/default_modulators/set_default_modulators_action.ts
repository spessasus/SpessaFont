import type { Modulator } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class SetDefaultModulatorsAction implements HistoryAction {
    private readonly oldModulators: Modulator[];
    private readonly newModulators: Modulator[];

    public constructor(oldModulators: Modulator[], newModulators: Modulator[]) {
        this.oldModulators = [...oldModulators];
        this.newModulators = [...newModulators];
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.bank.defaultModulators = [...this.newModulators];
        changes.touchBankInfo();
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.bank.defaultModulators = [...this.oldModulators];
        changes.touchBankInfo();
    }
}
