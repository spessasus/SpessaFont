import type { HistoryAction } from "../core_backend/history.ts";
import {
    BasicInstrument,
    type BasicInstrumentZone,
    BasicPreset,
    type BasicPresetZone,
    type BasicZone
} from "spessasynth_core";

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
        this.zone =
            element instanceof BasicInstrument
                ? element.instrumentZones[index]
                : element.presetZones[index];
    }

    do() {
        this.el.deleteZone(this.index, true);
        this.ensureImmutability();
        this.callback();
    }

    ensureImmutability() {
        if (this.el instanceof BasicInstrument) {
            this.el.instrumentZones = [...this.el.instrumentZones];
        } else {
            this.el.presetZones = [...this.el.presetZones];
        }
    }

    undo() {
        if (this.el instanceof BasicInstrument) {
            const z = this.el.createZone();
            z.copyFrom(this.zone);
            z.setSample((this.zone as BasicInstrumentZone).sample);
        } else {
            const z = this.el.createZone();
            z.copyFrom(this.zone);
            z.setInstrument((this.zone as BasicPresetZone).instrument);
        }
        this.ensureImmutability();
        this.callback();
    }
}
