import type { BasicPreset } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { BankDocument } from "../../core_backend/bank_document.ts";
import type { ChangeSet } from "../../core_backend/change_set.ts";

export type EditablePresetProperty =
    "name" | "program" | "bankMSB" | "bankLSB" | "isGMGSDrum";

export class EditPresetAction<
    K extends EditablePresetProperty
> implements HistoryAction {
    private readonly preset: BasicPreset;
    private readonly propertyName: K;
    private readonly before: BasicPreset[K];
    private readonly after: BasicPreset[K];

    public constructor(
        preset: BasicPreset,
        propertyName: K,
        before: BasicPreset[K],
        after: BasicPreset[K]
    ) {
        this.preset = preset;
        this.propertyName = propertyName;
        this.before = before;
        this.after = after;
    }

    private apply(
        document: BankDocument,
        changes: ChangeSet,
        value: BasicPreset[K]
    ) {
        this.preset[this.propertyName] = value;
        // Every property except the name is part of the MIDI patch, which sets the order
        if (this.propertyName !== "name") {
            document.sortPresets();
        }
        changes.touch(this.preset);
        changes.touchList("presets");
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.apply(document, changes, this.after);
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.apply(document, changes, this.before);
    }
}
