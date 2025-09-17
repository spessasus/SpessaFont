import type { HistoryAction } from "../../core_backend/history.ts";
import type { BasicPreset } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import { presetSorter } from "../../utils/preset_sorter.ts";

export class CreatePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;
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
        b.presets = [...b.presets, this.preset];
        b.flushAndSortPresets();
        b.presets.sort(presetSorter);
        this.setPresets(b.presets);
        this.setView(this.preset);
    }

    undo(b: SoundBankManager) {
        b.presets = b.presets.filter((p) => p !== this.preset);
        b.flushAndSortPresets();
        b.presets.sort(presetSorter);
        this.setPresets(b.presets);
        this.setView(b.presets?.[0] ?? "info");
    }
}
