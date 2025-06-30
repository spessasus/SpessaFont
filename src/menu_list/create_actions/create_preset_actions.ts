import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";

export class CreatePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;
    private index: number;
    private readonly setPresets: (s: BasicPreset[]) => void;
    private readonly setView: SetViewType;

    constructor(
        preset: BasicPreset,
        setPresets: (s: BasicPreset[]) => void,
        index: number,
        setView: SetViewType
    ) {
        this.preset = preset;
        this.index = index;
        this.setPresets = setPresets;
        this.setView = setView;
    }

    do(b: SoundBankManager) {
        if (this.index === -1 || this.index > b.presets.length) {
            this.index = b.presets.length;
        }
        b.presets.splice(this.index, 0, this.preset);
        this.setPresets([...b.presets]);
        this.setView(this.preset);
    }

    undo(b: SoundBankManager) {
        b.presets.splice(this.index, 1);
        this.setPresets([...b.presets]);
        this.setView("info");
    }
}
