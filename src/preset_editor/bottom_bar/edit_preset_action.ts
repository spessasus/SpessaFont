import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";

export class EditPresetAction<K extends keyof BasicPreset>
    implements HistoryAction
{
    private readonly preset: BasicPreset;
    private readonly propertyName: K;
    private readonly before: BasicPreset[K];
    private readonly after: BasicPreset[K];
    private readonly callback: () => unknown;

    constructor(
        preset: BasicPreset,
        propertyName: K,
        before: BasicPreset[K],
        after: BasicPreset[K],
        callback: () => unknown
    ) {
        this.preset = preset;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do() {
        this.preset[this.propertyName] = this.after;
        this.callback();
    }

    undo() {
        this.preset[this.propertyName] = this.before;
        this.callback();
    }
}
