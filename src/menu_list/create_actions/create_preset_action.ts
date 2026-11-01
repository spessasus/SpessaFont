import type { BasicPreset } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export class CreatePresetAction implements HistoryAction {
    private readonly preset: BasicPreset;

    public constructor(preset: BasicPreset) {
        this.preset = preset;
    }

    public do(document: BankDocument, changes: ChangeSet) {
        document.addPreset(this.preset);
        changes.touchList("presets");
        changes.touch(
            this.preset,
            ...this.preset.zones.map((z) => z.instrument)
        );
        changes.focusOn(this.preset);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        document.removePreset(this.preset);
        changes.touchList("presets");
        changes.touch(...this.preset.zones.map((z) => z.instrument));
        changes.focusOn(document.presets[0] ?? "info");
    }
}
