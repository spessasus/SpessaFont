import {
    BasicInstrument,
    type BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    BasicSample,
    type BasicZone
} from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

/**
 * One zone to add: the zone whose generators and modulators are copied, and its instrument
 * (for a preset) or sample (for an instrument).
 */
export interface NewZone {
    readonly template: BasicZone;
    readonly child: BasicInstrument | BasicSample;
}

/**
 * Adds many zones to one preset or instrument and sorts the zones once. Sorting stereo zones
 * takes quadratic time, so one sort per zone made adding a large selection cubic.
 */
export class CreateZonesAction implements HistoryAction {
    private readonly element: BasicPreset | BasicInstrument;
    private readonly newZones: readonly NewZone[];
    private zones = new Array<BasicPresetZone | BasicInstrumentZone>();
    private previousOrder = new Array<BasicPresetZone | BasicInstrumentZone>();

    public readonly label = "addZone";

    public constructor(
        element: BasicPreset | BasicInstrument,
        newZones: readonly NewZone[]
    ) {
        this.element = element;
        this.newZones = newZones;
    }

    private createZone({ template, child }: NewZone) {
        // Each branch narrows the pair so the matching createZone overload is used
        let zone: BasicPresetZone | BasicInstrumentZone | undefined;
        if (this.element instanceof BasicInstrument) {
            if (child instanceof BasicSample) {
                zone = this.element.createZone(child);
            }
        } else if (child instanceof BasicInstrument) {
            zone = this.element.createZone(child);
        }
        if (!zone) {
            throw new Error("Parent and child types do not match.");
        }
        zone.copyFrom(template);
        return zone;
    }

    private touch(changes: ChangeSet) {
        changes.touch(this.element, ...this.newZones.map((z) => z.child));
        changes.focusOn(this.element);
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.previousOrder = [...this.element.zones];
        if (this.zones.length > 0) {
            // Redo restores the same zone objects, so later actions that edit them stay valid
            for (const zone of this.zones) {
                document.restoreZone(
                    this.element,
                    zone,
                    this.element.zones.length
                );
            }
        } else {
            this.zones = this.newZones.map((z) => this.createZone(z));
        }
        document.sortZones(this.element);
        this.touch(changes);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        for (const zone of this.zones) {
            document.removeZone(this.element, zone);
        }
        document.setZoneOrder(this.element, this.previousOrder);
        this.touch(changes);
    }
}
