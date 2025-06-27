import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class EditPresetAction<K extends keyof BasicPreset>
    implements HistoryAction
{
    private readonly presetIndex: number;
    private readonly propertyName: K;
    private readonly before: BasicPreset[K];
    private readonly after: BasicPreset[K];
    private readonly callback: () => unknown;

    constructor(
        presetIndex: number,
        propertyName: K,
        before: BasicPreset[K],
        after: BasicPreset[K],
        callback: () => unknown
    ) {
        this.presetIndex = presetIndex;
        this.before = before;
        this.after = after;
        this.propertyName = propertyName;
        this.callback = callback;
    }

    do(b: SoundBankManager) {
        const preset = b.presets[this.presetIndex];
        preset[this.propertyName] = this.after;
        this.callback();
    }

    undo(b: SoundBankManager) {
        const preset = b.presets[this.presetIndex];
        preset[this.propertyName] = this.before;
        this.callback();
    }
}
