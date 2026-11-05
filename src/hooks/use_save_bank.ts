import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { SaveFormat } from "../core_backend/persistence.ts";
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
 * How a save ended. "canceled" means a warning was declined or the file picker closed.
 */
export type SaveResult = "saved" | "canceled" | "failed";

/**
 * Saves a bank with its warnings and toasts, and resolves to how it went.
 */
export function useSaveBank() {
    const { t } = useTranslation();

    const performSave = async (
        session: BankSession,
        format: SaveFormat
    ): Promise<SaveResult> => {
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
                return "canceled";
            }
            logError("Failed to save the sound bank.", error);
            // The details first, so the summary ends up below them
            toast.error(String(error));
            toast.error(t("loadingAndSaving.writingFailed"), { id });
            return "failed";
        }
        toast.success(t("loadingAndSaving.savedSuccessfully"), { id });
        return "saved";
    };

    /**
     * Asks about each warning in turn, and saves once all of them are confirmed.
     */
    const confirmAndSave = (
        session: BankSession,
        format: SaveFormat,
        warnings: string[]
    ): Promise<SaveResult> => {
        const [warning, ...rest] = warnings;
        if (warning === undefined) {
            return performSave(session, format);
        }
        return new Promise((resolve) => {
            showToastDialog({
                content: warning,
                buttons: [
                    {
                        label: t("yes"),
                        onClick: () =>
                            void confirmAndSave(session, format, rest).then(
                                resolve
                            )
                    },
                    { label: t("no"), onClick: () => resolve("canceled") }
                ]
            });
        });
    };

    return (session: BankSession, format: SaveFormat) => {
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
        return confirmAndSave(session, format, warnings);
    };
}
