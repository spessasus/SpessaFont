import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { BankSession } from "../core_backend/bank_session.ts";
import { useBackHandler } from "../hooks/use_back_handler.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { useBackStack } from "./back_stack_context.ts";
import { BACK_LEVELS } from "./back_stack.ts";

// One toast for the whole flow, so the question and the hint replace each other
const LEAVE_TOAST_ID = "phone-leave";

/**
 * The bottom of the back stack (spec 5.4). With nothing unsaved the sentinel stays off and a
 * toast says the next back leaves. Otherwise it asks first, and Leave drops the sentinel.
 */
export function useLeaveFlow(tabs: readonly BankSession[]) {
    const { t } = useTranslation();
    const backStack = useBackStack();

    useBackHandler(true, BACK_LEVELS.leave, () => {
        const showLeaveHint = () =>
            toast(t("phoneLocale.back.pressAgain"), { id: LEAVE_TOAST_ID });
        // Read on the press, a save or an edit since the last render counts
        const count = tabs.filter((tab) => tab.history.isDirty).length;
        if (count === 0) {
            backStack?.releaseSentinel();
            showLeaveHint();
            return true;
        }
        // The provider pushes the sentinel again, so Stay only closes the question
        showToastDialog({
            id: LEAVE_TOAST_ID,
            content: t("phoneLocale.back.unsavedBanks", { count }),
            buttons: [
                {
                    label: t("phoneLocale.back.leave"),
                    onClick: () => {
                        backStack?.dropSentinel();
                        showLeaveHint();
                    }
                },
                { label: t("phoneLocale.back.stay") }
            ]
        });
        return true;
    });
}
