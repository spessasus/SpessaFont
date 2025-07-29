import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    type BasicZone
} from "spessasynth_core";
import type { HistoryAction } from "../core_backend/history.ts";
import {
    reorderInstrumentZones,
    ZONE_SORTING_FUNCTION
} from "../utils/reorder_zones.ts";

export class CreateZoneAction<
    ElementType extends BasicInstrument | BasicPreset,
    ChildType extends BasicInstrument | BasicSample
> implements HistoryAction
{
    private readonly zone: BasicZone;
    private readonly child: ChildType;
    private readonly el: ElementType;
    private clonedZone?: BasicZone;
    private readonly callback: () => unknown;

    constructor(
        el: ElementType,
        zone: BasicZone,
        child: ChildType,
        callback: () => unknown
    ) {
        this.el = el;
        this.zone = zone;
        this.child = child;
        this.callback = callback;
    }

    do() {
        const isInst = this.el instanceof BasicInstrument;
        if (isInst && this.child instanceof BasicSample) {
            this.clonedZone = this.el.createZone(this.child);
        } else if (!isInst && this.child instanceof BasicInstrument) {
            this.clonedZone = this.el.createZone(this.child);
        } else {
            throw new Error("Parent and child types do not match.");
        }
        this.clonedZone.copyFrom(this.zone);
        this.applyChanges();
    }

    undo() {
        if (!this.clonedZone) {
            throw new Error("Undoing zone creation before doing it.");
        }
        const zones: BasicZone[] = this.el.zones;
        const index = zones.indexOf(this.clonedZone);
        if (index < 0) {
            throw new Error("Invalid index for undoing zone creation.");
        }
        this.el.deleteZone(index, true);
        this.applyChanges();
    }

    private applyChanges() {
        if (this.el instanceof BasicInstrument) {
            this.el.zones = reorderInstrumentZones(this.el.zones);
        } else {
            this.el.zones = this.el.zones.toSorted(ZONE_SORTING_FUNCTION);
        }
        this.callback();
    }
}
