import type { HistoryAction } from "../../../core_backend/history.ts";
import type { BasicPreset, BasicSoundBank } from "spessasynth_core";
import type { SetViewType } from "../../bank_editor.tsx";

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

    do(b: BasicSoundBank) {
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

    undo(b: BasicSoundBank) {
        if (!this.removed) {
            return;
        }
        b.presets.splice(this.index, 0, this.removed);
        this.setPresets([...b.presets]);
        this.setView(this.removed);
    }
}
