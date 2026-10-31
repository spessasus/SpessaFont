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
> implements HistoryAction {
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

    private applyChanges() {
        this.el.zones =
            this.el instanceof BasicInstrument
                ? reorderInstrumentZones(this.el.zones)
                : this.el.zones.slice().sort(ZONE_SORTING_FUNCTION);
        this.callback();
    }

    private createZone(): BasicZone {
        // Each branch narrows the pair so the matching createZone overload is used
        if (this.el instanceof BasicInstrument) {
            if (this.child instanceof BasicSample) {
                return this.el.createZone(this.child);
            }
        } else if (this.child instanceof BasicInstrument) {
            return this.el.createZone(this.child);
        }
        throw new Error("Parent and child types do not match.");
    }

    do() {
        this.clonedZone = this.createZone();
        this.clonedZone.copyFrom(this.zone);
        this.applyChanges();
    }

    undo() {
        if (!this.clonedZone) {
            throw new Error("Undoing zone creation before doing it.");
        }
        const zones: BasicZone[] = this.el.zones;
        const index = zones.indexOf(this.clonedZone);
        if (index === -1) {
            throw new Error("Invalid index for undoing zone creation.");
        }
        this.el.deleteZone(index, true);
        this.applyChanges();
    }
}
