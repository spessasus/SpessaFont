import type { CustomCurve, Modulator } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class SetDefaultModulatorsAction implements HistoryAction {
    private readonly oldModulators: Modulator[];
    private readonly newModulators: Modulator[];
    // The curves the new modulators bring into the bank (a paste, core's standard list)
    private addedCurves: CustomCurve[] | undefined;

    public readonly label = "editDefaultModulators";

    public constructor(
        oldModulators: readonly Modulator[],
        newModulators: readonly Modulator[]
    ) {
        this.oldModulators = [...oldModulators];
        this.newModulators = [...newModulators];
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.addedCurves ??= document.adoptCurves(this.newModulators);
        document.bank.defaultModulators = this.newModulators;
        document.addCustomCurves(this.addedCurves);
        changes.touchBankInfo();
        // The resonance twins it brings along touch instruments, the edit is still the list's
        changes.focusOn("info");
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.bank.defaultModulators = this.oldModulators;
        document.removeCustomCurves(this.addedCurves ?? []);
        changes.touchBankInfo();
        changes.focusOn("info");
    }
}
