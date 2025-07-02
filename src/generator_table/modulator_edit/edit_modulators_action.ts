import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicZone, Modulator } from "spessasynth_core";

export class EditModulatorsAction implements HistoryAction {
    private readonly oldMods: Modulator[];
    private readonly newMods: Modulator[];
    private readonly callback: () => unknown;
    private readonly zone: BasicZone;

    constructor(
        zone: BasicZone,
        newMods: Modulator[],
        callback: () => unknown
    ) {
        this.oldMods = [...zone.modulators];
        this.newMods = newMods;
        this.callback = callback;
        this.zone = zone;
    }

    do() {
        this.zone.modulators = [...this.newMods];
        this.callback();
    }

    undo() {
        this.zone.modulators = [...this.oldMods];
        this.callback();
    }
}
