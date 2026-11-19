import type {
    BasicInstrument,
    BasicPreset,
    BasicZone,
    CustomCurve,
    Modulator
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class EditModulatorsAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly zone: BasicZone;
    private readonly oldModulators: Modulator[];
    private readonly newModulators: Modulator[];
    // The curves the new modulators bring into the bank (a paste from another bank)
    private addedCurves: CustomCurve[] | undefined;

    public readonly label = "editModulators";

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicZone,
        newModulators: readonly Modulator[]
    ) {
        this.element = element;
        this.zone = zone;
        this.oldModulators = [...zone.modulators];
        this.newModulators = [...newModulators];
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.addedCurves ??= document.adoptCurves(this.newModulators);
        this.zone.setModulators(this.newModulators);
        document.addCustomCurves(this.addedCurves);
        changes.touch(this.element);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.zone.setModulators(this.oldModulators);
        document.removeCustomCurves(this.addedCurves ?? []);
        changes.touch(this.element);
    }
}
