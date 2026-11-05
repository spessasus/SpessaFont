import type { BasicPreset } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class CreatePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;
    // Where undo removed it from, so redo puts it back there with its links
    private removedIndex: number | undefined;

    public readonly label = "addPreset";

    public constructor(preset: BasicPreset) {
        this.preset = preset;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        if (this.removedIndex === undefined) {
            document.addPreset(this.preset);
        } else {
            document.restorePreset(this.preset, this.removedIndex);
        }
        changes.touchList("presets");
        changes.touch(
            this.preset,
            ...this.preset.zones.map((z) => z.instrument)
        );
        changes.focusOn(this.preset);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.removedIndex = document.removePreset(this.preset);
        changes.touchList("presets");
        changes.touch(...this.preset.zones.map((z) => z.instrument));
        changes.focusOn(document.presets[0] ?? "info");
    }
}
