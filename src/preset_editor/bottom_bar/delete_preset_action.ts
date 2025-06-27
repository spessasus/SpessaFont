import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class DeletePresetAction implements HistoryAction {
    private removed?: BasicPreset;
    private readonly index: number;
    private readonly setPresets: (s: BasicPreset[]) => void;
    private readonly setView: SetViewType;

    constructor(
        index: number,
        setPresets: (s: BasicPreset[]) => void,
        setView: SetViewType
    ) {
        this.index = index;
        this.setPresets = setPresets;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        this.removed = b.presets[this.index];
        b.deletePreset(this.removed);
        this.setPresets([...b.presets]);
        // check if there are elements to switch to
        if (b.presets.length > 0) {
            this.setView(b.presets[Math.max(this.index - 1, 0)]);
        } else {
            this.setView("info");
        }
    }

    undo(b: SoundBankManager) {
        if (!this.removed) {
            return;
        }
        b.presets.splice(this.index, 0, this.removed);
        this.setPresets([...b.presets]);
        this.setView(this.removed);
    }
}
