import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { SaveFormat } from "../core_backend/persistence.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import {
    createAutoLinkActions,
    createRemoveUnusedActions
} from "../core_backend/bank_maintenance.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { yieldToPaint } from "../utils/yield_to_paint.ts";
import { logError } from "../utils/core_utils.ts";
import { hasSFEOnlyData } from "../core_backend/sfe_data.ts";
import { hasBankNumbersLostInSF2 } from "../core_backend/sf2_bank_numbers.ts";
import { hasTextOutsideLatin1 } from "../core_backend/latin1_text.ts";

const FORMAT_NAMES = {
    sf2: "SF2",
    sf3: "SF3",
    dls: "DLS",
    sf4: "SFE"
} as const;

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

    const performSave = async (format: SaveFormat) => {
        if (!session) return;
        const id = toast.loading(t("loadingAndSaving.savingSoundBank"));
        // Encoding blocks the main thread, so let the toast show first
        await yieldToPaint();
        try {
            await session.save(format, t("bankInfo.unnamed"), (progress) => {
                toast.loading(
                    `${t("loadingAndSaving.writingSamples")} (${
                        Math.floor(progress * 10_000) / 100 + "%"
                    })`,
                    { id }
                );
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                // the user closed the file picker
                toast.dismiss(id);
                return;
            }
            logError("Failed to save the sound bank.", error);
            // The details first, so the summary ends up below them
            toast.error(String(error));
            toast.error(t("loadingAndSaving.writingFailed"), { id });
            return;
        }
        toast.success(t("loadingAndSaving.savedSuccessfully"), { id });
    };

    /**
     * Asks about each warning in turn, and saves once all of them are confirmed.
     */
    const confirmAndSave = (format: SaveFormat, warnings: string[]) => {
        const [warning, ...rest] = warnings;
        if (warning === undefined) {
            void performSave(format);
            return;
        }
        showToastDialog({
            content: warning,
            buttons: [
                {
                    label: t("yes"),
                    onClick: () => confirmAndSave(format, rest)
                },
                { label: t("no") }
            ]
        });
    };

    const save = (format: SaveFormat) => {
        if (!session) return;
        const target = session.getWriteFormat(format);
        const warnings = new Array<string>();
        if (target !== "sf4" && hasSFEOnlyData(session.document.bank)) {
            warnings.push(
                t("menuBarLocale.file.warnSFEData", {
                    format: FORMAT_NAMES[target]
                })
            );
        }
        if (
            (target === "sf2" || target === "sf3") &&
            hasBankNumbersLostInSF2(session.document.bank)
        ) {
            warnings.push(
                t("menuBarLocale.file.warnBankNumbers", {
                    format: FORMAT_NAMES[target]
                })
            );
        }
        if (
            format === "sf2" &&
            session.document.samples.some((s) => s.isCompressed)
        ) {
            warnings.push(t("menuBarLocale.file.warnSF2"));
        }
        if (hasTextOutsideLatin1(session.document.bank)) {
            warnings.push(t("menuBarLocale.file.warnText"));
        }
        confirmAndSave(format, warnings);
    };

    const removeUnusedElements = () => {
        if (!session) return;
        const { actions, instrumentCount, sampleCount } =
            createRemoveUnusedActions(session.document);
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
