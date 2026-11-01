import type {
    BasicInstrument,
    BasicPreset,
    BasicZone,
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

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicZone,
        newModulators: Modulator[]
    ) {
        this.element = element;
        this.zone = zone;
        this.oldModulators = [...zone.modulators];
        this.newModulators = [...newModulators];
    }

    public do(_document: BankDocument, changes: ChangeSet) {
        this.zone.modulators = [...this.newModulators];
        changes.touch(this.element);
    }

    public undo(_document: BankDocument, changes: ChangeSet) {
        this.zone.modulators = [...this.oldModulators];
        changes.touch(this.element);
    }
}
