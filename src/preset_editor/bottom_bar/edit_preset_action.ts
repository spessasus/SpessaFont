import type { BasicPreset } from "spessasynth_core";
import type { HistoryAction } from "../../core_backend/history.ts";
import type { HistoryLabel } from "../../core_backend/history_label.ts";
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
    /**
     * The preset order before the edit, which undo puts back.
     */
    private previousOrder = new Array<BasicPreset>();
    public readonly label: HistoryLabel;

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
        this.label = propertyName === "name" ? "renamePreset" : "changePatch";
    }

    public do(document: BankDocument, changes: ChangeSet) {
        this.previousOrder = [...document.presets];
        this.preset[this.propertyName] = this.after;
        // Every property except the name is part of the MIDI patch, which sets the order
        if (this.propertyName !== "name") {
            document.sortPresets();
        }
        changes.touch(this.preset);
        changes.touchList("presets");
    }

    public undo(document: BankDocument, changes: ChangeSet) {
        this.preset[this.propertyName] = this.before;
        if (this.propertyName !== "name") {
            document.setPresetOrder(this.previousOrder);
        }
        changes.touch(this.preset);
        changes.touchList("presets");
    }
}
