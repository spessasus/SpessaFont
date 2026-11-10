import type { Dispatch } from "react";
import type { BankEditView } from "../core_backend/bank_view.ts";
import type { PhoneShellAction } from "./phone_shell_state.ts";

/**
 * Shows an element opened from inside the editor, which is one more step for back to undo.
 * Showing the same element again adds no step to the tab's trail, so it adds none here.
 * @param tabId the tab that shows the element
 * @param shownView the element shown now
 * @param setView selects the element in the tab
 * @param dispatch the shell's dispatch
 */
export function getDrillTo(
    tabId: number,
    shownView: BankEditView,
    setView: (view: BankEditView) => void,
    dispatch: Dispatch<PhoneShellAction>
) {
    return (view: BankEditView) => {
        setView(view);
        if (view !== shownView) {
            dispatch({ type: "editorChange", tabId });
        }
    };
}
