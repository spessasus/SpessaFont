import type { HistoryAction } from "../core_backend/history.ts";
import {
    BasicInstrument,
    type BasicInstrumentZone,
    BasicPreset,
    type BasicPresetZone,
    type BasicZone
} from "spessasynth_core";
import {
    reorderInstrumentZones,
    ZONE_SORTING_FUNCTION
} from "../utils/reorder_zones.ts";

export class DeleteZoneAction<T extends BasicInstrument | BasicPreset>
    implements HistoryAction
{
    private readonly zone: BasicZone;
    private readonly el: T;
    private readonly index: number;
    private readonly callback: () => unknown;

    constructor(element: T, index: number, callback: () => unknown) {
        this.el = element;
        this.callback = callback;
        this.index = index;
        this.zone = element.zones[index];
    }

    do() {
        this.el.deleteZone(this.index, true);
        this.applyChanges();
    }

    undo() {
        if (this.el instanceof BasicInstrument) {
            const z = this.el.createZone(
                (this.zone as BasicInstrumentZone).sample
            );
            z.copyFrom(this.zone);
        } else {
            const z = this.el.createZone(
                (this.zone as BasicPresetZone).instrument
            );
            z.copyFrom(this.zone);
        }
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
