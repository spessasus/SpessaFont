import type { CustomCurve } from "spessasynth_core";
import type { HistoryAction } from "./history.ts";
import type { BankDocument } from "./bank_document.ts";

/**
 * Adds the custom curves that pasted elements use to the bank. It goes before the actions
 * that add the elements, so an undo takes the curves out after their users are gone.
 */
export class AddCustomCurvesAction implements HistoryAction {
    private readonly curves: readonly CustomCurve[];

    // Never the last action of a group, which is the one the group is named after
    public readonly label = "editModulators";

    public constructor(curves: readonly CustomCurve[]) {
        this.curves = curves;
    }

    public do(document: BankDocument) {
        document.addCustomCurves(this.curves);
    }

    public undo(document: BankDocument) {
        document.removeCustomCurves(this.curves);
    }
}
