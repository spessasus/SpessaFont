import type {
    BasicInstrument,
    BasicInstrumentZone,
    BasicPreset,
    BasicPresetZone
} from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

export class DeleteZoneAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly zone: BasicPresetZone | BasicInstrumentZone;
    private index = -1;

    public readonly label = "deleteZone";

    public constructor(
        element: BasicPreset | BasicInstrument,
        zone: BasicPresetZone | BasicInstrumentZone
    ) {
        this.element = element;
        this.zone = zone;
    }

    private get child() {
        return "sample" in this.zone ? this.zone.sample : this.zone.instrument;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.index = document.removeZone(this.element, this.zone);
        changes.touch(this.element, this.child);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.restoreZone(this.element, this.zone, this.index);
        changes.touch(this.element, this.child);
    }
}
