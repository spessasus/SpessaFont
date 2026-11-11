import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { SetBankFormatAction } from "../core_backend/set_bank_format_action.ts";

/**
 * Returns a function that runs the actions, and puts an SF2-mode bank in SFE mode with them
 * when they bring in SFE data (a paste, a copy from another bank), as one undo step. The switch
 * goes first, so the group keeps the name of what was added. The toast waits for the run, a
 * group that throws is rolled back.
 */
export function useSFESwitch() {
    const { t } = useTranslation();
    return (
        session: BankSession,
        actions: HistoryActionGroup,
        isAddingSFEData: boolean,
        run: (group: HistoryActionGroup) => void
    ) => {
        const { format } = session.document;
        if (!isAddingSFEData || format === "sfe" || actions.length === 0) {
            run(actions);
            return;
        }
        run([new SetBankFormatAction(format, "sfe"), ...actions]);
        toast(t("bankInfo.format.switchedOnPaste"));
    };
}
