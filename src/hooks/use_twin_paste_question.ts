import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import { useScopedToastDialog } from "./use_scoped_toast_dialog.ts";

/**
 * Returns a function for a paste into an SF2-mode bank where only SFe mode keeps how the pasted
 * instruments play CC 71 (`isTwinQuestionNeeded`). It asks first, and pastes only when the user
 * converts the bank to SFe. Without the question it pastes at once. `paste` gets
 * whether the bank goes to SFe mode with it. The question belongs to the calling component, so
 * it closes when the user leaves the editor. Each bank has one per flow, asking again from any
 * button replaces it, so one answer pastes once.
 * @param flow a paste from the clipboard, or a copy from another bank, which ends on other
 * signals
 * @param cancelSignals what else ends the question, like a new copy or the source bank closing,
 * as `paste` would then paste something else
 */
export function useTwinPasteQuestion(flow: "paste" | "copy") {
    const { t } = useTranslation();
    const showToastDialog = useScopedToastDialog();
    // The open question's listeners, which must not close the question that replaces it
    const open = useRef<AbortController>(undefined);
    useEffect(() => () => open.current?.abort(), []);
    return (
        session: BankSession,
        isQuestionNeeded: boolean,
        paste: (isConverting: boolean) => void,
        cancelSignals: readonly AbortSignal[]
    ) => {
        const toastId = `twin-${flow}-${session.id}`;
        if (!isQuestionNeeded) {
            // A question still open would paste a second time
            open.current?.abort();
            toast.dismiss(toastId);
            paste(false);
            return;
        }
        // Not AbortSignal.any, which older Safari and Firefox lack
        const signals = [session.closeSignal, ...cancelSignals];
        const isCanceled = () => signals.some((s) => s.aborted);
        if (isCanceled()) {
            return;
        }
        open.current?.abort();
        const answered = new AbortController();
        open.current = answered;
        const { name } = session.store.getSnapshot().info;
        showToastDialog({
            id: toastId,
            // A copy to another bank converts that one, not the one shown
            content: t("bankInfo.format.twinPaste", {
                name: name.length > 0 ? name : t("bankInfo.unnamed")
            }),
            buttons: [
                {
                    label: t("bankInfo.format.convertToSFe"),
                    onClick: () => {
                        answered.abort();
                        if (!isCanceled()) {
                            paste(true);
                        }
                    }
                },
                {
                    label: t("contextMenu.cancel"),
                    onClick: () => answered.abort()
                }
            ]
        });
        for (const signal of signals) {
            signal.addEventListener("abort", () => toast.dismiss(toastId), {
                once: true,
                signal: answered.signal
            });
        }
    };
}
