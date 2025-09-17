import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class DeletePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;
    private index?: number;
    private readonly setPresets: (s: BasicPreset[]) => void;
    private readonly setView: SetViewType;

    constructor(
        preset: BasicPreset,
        setPresets: (s: BasicPreset[]) => void,
        setView: SetViewType
    ) {
        this.preset = preset;
        this.setPresets = setPresets;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        this.index = b.presets.indexOf(this.preset);
        if (this.index < 0) {
            throw new Error(
                `${this.preset.name} does not exist in ${b.soundBankInfo.name!}`
            );
        }
        b.deletePreset(this.preset);
        b.flushAndSortPresets();
        this.setPresets([...b.presets]);
        // check if there are elements to switch to
        if (b.presets.length > 0) {
            this.setView(b.presets[Math.max(this.index - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: SoundBankManager) {
        if (this.index === undefined) {
            return;
        }
        b.presets.splice(this.index, 0, this.preset);
        b.flushAndSortPresets();
        this.setPresets([...b.presets]);
        this.setView(this.preset);
    }
}
