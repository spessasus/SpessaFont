import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { SaveFormat } from "../core_backend/persistence.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import {
    createAutoLinkActions,
    createRemoveUnusedActions
} from "../core_backend/bank_maintenance.ts";
import { useSaveBank } from "../hooks/use_save_bank.ts";

/**
 * The menu bar commands for the active bank, with their toasts.
 * Every command does nothing when no bank is open.
 * @param session the active bank
 * @param setView selects an element, used for the focus hints of undo and redo
 */
export function useBankCommands(
    session: BankSession | undefined,
    setView: (view: BankEditView) => void
) {
    const { t } = useTranslation();
    const saveBank = useSaveBank();

    const undo = () => {
        if (!session) return;
        if (!session.history.canUndo) {
            toast(t("menuBarLocale.edit.nothingToUndo"));
            return;
        }
        const focus = session.history.undo();
        if (focus) setView(focus);
    };

    const redo = () => {
        if (!session) return;
        if (!session.history.canRedo) {
            toast(t("menuBarLocale.edit.nothingToRedo"));
            return;
        }
        const focus = session.history.redo();
        if (focus) setView(focus);
    };

    const save = (format: SaveFormat) => {
        if (session) void saveBank(session, format);
    };

    const removeUnusedElements = () => {
        if (!session) return;
        const { actions, instrumentCount, sampleCount } =
            createRemoveUnusedActions(session.document);
        if (actions.length === 0) {
            toast(t("soundBankLocale.nothingToRemove"));
            return;
        }
        // The selection only changes if the selected element was removed
        session.history.do(actions);
        toast.success(
            t("soundBankLocale.removedElements", {
                instruments: instrumentCount,
                samples: sampleCount
            })
        );
    };

    const autoLinkSamples = () => {
        if (!session) return;
        const actions = createAutoLinkActions(session.document.samples);
        if (actions.length === 0) {
            toast(t("soundBankLocale.noSamplesWereChanged"));
            return;
        }
        session.history.do(actions);
        toast.success(
            t("soundBankLocale.modifiedSamples", {
                count: actions.length
            })
        );
    };

    return { undo, redo, save, removeUnusedElements, autoLinkSamples };
}
