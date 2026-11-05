import {
    BasicInstrument,
    type BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    BasicSample,
    type BasicZone
} from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import type { BankDocument } from "../core_backend/bank_document.ts";
import type { ChangeSet } from "../core_backend/change_set.ts";

export class CreateZoneAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly template: BasicZone;
    private readonly child: BasicInstrument | BasicSample;
    private zone: BasicPresetZone | BasicInstrumentZone | undefined;
    private previousOrder = new Array<BasicPresetZone | BasicInstrumentZone>();

    /**
     * @param element the preset or instrument to add the zone to
     * @param template the zone whose generators and modulators are copied
     * @param child the instrument (for a preset) or sample (for an instrument) of the new zone
     */
    public readonly label = "addZone";

    public constructor(
        element: BasicPreset | BasicInstrument,
        template: BasicZone,
        child: BasicInstrument | BasicSample
    ) {
        this.element = element;
        this.template = template;
        this.child = child;
    }

    private createZone() {
        // Each branch narrows the pair so the matching createZone overload is used
        if (this.element instanceof BasicInstrument) {
            if (this.child instanceof BasicSample) {
                return this.element.createZone(this.child);
            }
        } else if (this.child instanceof BasicInstrument) {
            return this.element.createZone(this.child);
        }
        throw new Error("Parent and child types do not match.");
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.previousOrder = [...this.element.zones];
        if (this.zone) {
            // Redo restores the same zone object, so later actions that edit it stay valid
            document.restoreZone(
                this.element,
                this.zone,
                this.element.zones.length
            );
        } else {
            this.zone = this.createZone();
            this.zone.copyFrom(this.template);
        }
        document.sortZones(this.element);
        changes.touch(this.element, this.child);
        changes.focusOn(this.element);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        if (!this.zone) {
            throw new Error("Undoing zone creation before doing it.");
        }
        document.removeZone(this.element, this.zone);
        document.setZoneOrder(this.element, this.previousOrder);
        changes.touch(this.element, this.child);
        changes.focusOn(this.element);
    }
}
