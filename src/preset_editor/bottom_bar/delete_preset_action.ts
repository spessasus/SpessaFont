import type { BasicPreset } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";
import { neighborOrInfo } from "../../core_backend/neighbor_or_info.ts";

export class DeletePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;
    private index = -1;

    public readonly label = "deletePreset";

    public constructor(preset: BasicPreset) {
        this.preset = preset;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.index = document.removePreset(this.preset);
        changes.touchList("presets");
        changes.touch(...this.preset.zones.map((z) => z.instrument));
        changes.focusOn(neighborOrInfo(document.presets, this.index));
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.restorePreset(this.preset, this.index);
        changes.touchList("presets");
        changes.touch(
            this.preset,
            ...this.preset.zones.map((z) => z.instrument)
        );
        changes.focusOn(this.preset);
    }
}
