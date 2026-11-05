import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import { SaveError, type SaveFormat } from "../core_backend/persistence.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import { yieldToPaint } from "../utils/yield_to_paint.ts";
import { logError } from "../utils/core_utils.ts";
import { hasSFEOnlyData } from "../core_backend/sfe_data.ts";
import { hasBankNumbersLostInSF2 } from "../core_backend/sf2_bank_numbers.ts";
import { hasTextOutsideLatin1 } from "../core_backend/latin1_text.ts";
import {
    getDLSLosses,
    hasCustomDefaultModulators
} from "../core_backend/dls_data.ts";

const FORMAT_NAMES = {
    sf2: "SF2",
    sf3: "SF3",
    dls: "DLS",
    sf4: "SFE"
} as const;

const FAILURE_KEYS = {
    encoderUnavailable: "loadingAndSaving.encoderUnavailable",
    dlsTooLarge: "loadingAndSaving.dlsTooLarge"
} as const;

const DLS_LOSS_KEYS = {
    stereoLinks: "menuBarLocale.file.dlsLossStereoLinks",
    unusedInstruments: "menuBarLocale.file.dlsLossUnusedInstruments",
    defaultModulators: "menuBarLocale.file.dlsLossDefaultModulators"
} as const;

/**
 * How a save ended. "canceled" means a warning was declined, the file picker closed, the bank
 * closed, or another save of it was running.
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
                    t("loadingAndSaving.writingSamplesProgress", {
                        percent: Math.floor(progress * 10_000) / 100
                    }),
                    { id }
                );
            });
        } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                // The user closed the file picker, or the bank
                toast.dismiss(id);
                return "canceled";
            }
            logError("Failed to save the sound bank.", error);
            const failure =
                error instanceof SaveError ? error.failure : undefined;
            // The details first, so the summary ends up below them
            toast.error(failure ? t(FAILURE_KEYS[failure]) : String(error));
            toast.error(t("loadingAndSaving.writingFailed"), { id });
            return "failed";
        }
        toast.success(t("loadingAndSaving.savedSuccessfully"), { id });
        return "saved";
    };

    /**
     * Asks about each warning in turn, and saves once all of them are confirmed. The questions
     * go away when the bank closes.
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
            const { closeSignal } = session;
            if (closeSignal.aborted) {
                resolve("canceled");
                return;
            }
            const answered = new AbortController();
            const toastId = showToastDialog({
                content: warning,
                buttons: [
                    {
                        label: t("yes"),
                        onClick: () => {
                            answered.abort();
                            void confirmAndSave(session, format, rest).then(
                                resolve
                            );
                        }
                    },
                    {
                        label: t("no"),
                        onClick: () => {
                            answered.abort();
                            resolve("canceled");
                        }
                    }
                ]
            });
            closeSignal.addEventListener(
                "abort",
                () => {
                    toast.dismiss(toastId);
                    resolve("canceled");
                },
                { once: true, signal: answered.signal }
            );
        });
    };

    const getWarnings = (session: BankSession, format: SaveFormat) => {
        const target = session.getWriteFormat(format);
        const { bank } = session.document;
        const warnings = new Array<string>();
        if (target !== "sf4" && hasSFEOnlyData(bank)) {
            warnings.push(
                t("menuBarLocale.file.warnSFEData", {
                    format: FORMAT_NAMES[target]
                })
            );
        }
        if (
            (target === "sf2" || target === "sf3") &&
            hasBankNumbersLostInSF2(bank)
        ) {
            warnings.push(
                t("menuBarLocale.file.warnBankNumbers", {
                    format: FORMAT_NAMES[target]
                })
            );
        }
        if (target === "dls") {
            const losses = getDLSLosses(bank);
            if (losses.length > 0) {
                warnings.push(
                    t("menuBarLocale.file.warnDLS", {
                        losses: losses
                            .map((loss) => t(DLS_LOSS_KEYS[loss]))
                            .join(", ")
                    })
                );
            }
        }
        // SF2 has no subject chunk, core's writer adds the subject to the comment
        if (target !== "dls" && bank.soundBankInfo.subject?.trim()) {
            warnings.push(
                t("menuBarLocale.file.warnSubject", {
                    format: FORMAT_NAMES[target]
                })
            );
        }
        // A DLS save leaves them out, which its own warning says
        if (target !== "dls" && hasCustomDefaultModulators(bank)) {
            warnings.push(t("menuBarLocale.file.warnDefaultModulators"));
        }
        if (format === "sf2" && session.hasCompressedSamples()) {
            warnings.push(t("menuBarLocale.file.warnSF2"));
        }
        if (session.has24BitSamples) {
            warnings.push(t("menuBarLocale.file.warn24Bit"));
        }
        if (hasTextOutsideLatin1(bank)) {
            warnings.push(t("menuBarLocale.file.warnText"));
        }
        return warnings;
    };

    return async (
        session: BankSession,
        format: SaveFormat
    ): Promise<SaveResult> => {
        const warnings = getWarnings(session, format);
        // One save of a bank at a time, a second click would stack its questions
        const release = session.reserveSave();
        if (!release) {
            toast(t("loadingAndSaving.saveRunning"));
            return "canceled";
        }
        const result = await confirmAndSave(session, format, warnings);
        release();
        return result;
    };
}
