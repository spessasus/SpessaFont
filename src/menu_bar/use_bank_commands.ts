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
import { HISTORY_LABEL_KEYS } from "./history_label_keys.ts";

const HISTORY_TOAST = "history";
import { mergeDuplicateSamples } from "../sample_editor/merge_duplicates_command.ts";

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
        const { undoLabel } = session.history.state;
        if (!undoLabel) {
            toast(t("menuBarLocale.edit.nothingToUndo"));
            return;
        }
        const focus = session.history.undo();
        // One toast that each undo replaces, holding Ctrl+Z would stack them otherwise
        toast(
            t("menuBarLocale.edit.undone", {
                what: t(HISTORY_LABEL_KEYS[undoLabel])
            }),
            { id: HISTORY_TOAST }
        );
        if (focus) setView(focus);
    };

    const redo = () => {
        if (!session) return;
        const { redoLabel } = session.history.state;
        if (!redoLabel) {
            toast(t("menuBarLocale.edit.nothingToRedo"));
            return;
        }
        const focus = session.history.redo();
        toast(
            t("menuBarLocale.edit.redone", {
                what: t(HISTORY_LABEL_KEYS[redoLabel])
            }),
            { id: HISTORY_TOAST }
        );
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

    const mergeDuplicateSamplesOfBank = () => {
        if (!session) return;
        void mergeDuplicateSamples(session, undefined, t, (actions) =>
            session.history.do(actions)
        );
    };

    return {
        undo,
        redo,
        save,
        removeUnusedElements,
        autoLinkSamples,
        mergeDuplicateSamples: mergeDuplicateSamplesOfBank
    };
}
