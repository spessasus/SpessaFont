import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { SetBankFormatAction } from "../core_backend/set_bank_format_action.ts";
import { SyncResonanceTwinsAction } from "../core_backend/sync_resonance_twins_action.ts";

/**
 * Why a group puts an SF2-mode bank in SFe mode: it brings in SFe data, or the user said yes to
 * a question that offered the switch, so no toast tells them.
 */
export type SFeSwitchCause = "sfeData" | "answer";

/**
 * Returns a function that runs the actions, and puts an SF2-mode bank in SFe mode with them
 * when they bring in SFe data (a paste, a copy from another bank), as one undo step. The switch
 * goes first, so the group keeps the name of what was added. The toast waits for the run, a
 * group that throws is rolled back. A group that stays in SF2 mode ends by putting the resonance
 * twins where core's SF2 reader would (it may bring in instruments or change the default list).
 * A paste (`isPaste`) only syncs the elements it adds.
 */
export function useSFeSwitch() {
    const { t } = useTranslation();
    return (
        session: BankSession,
        actions: HistoryActionGroup,
        switchCause: SFeSwitchCause | undefined,
        run: (group: HistoryActionGroup) => void,
        isPaste = false
    ) => {
        const { format } = session.document;
        if (format === "sfe" || actions.length === 0) {
            run(actions);
            return;
        }
        if (!switchCause) {
            // A paste syncs what it adds, not the instruments it shares
            const { document } = session;
            run([
                ...actions,
                new SyncResonanceTwinsAction(
                    isPaste
                        ? new Set([
                              ...document.instruments,
                              ...document.presets
                          ])
                        : undefined
                )
            ]);
            return;
        }
        run([new SetBankFormatAction(format, "sfe"), ...actions]);
        if (switchCause === "sfeData") {
            toast(t("bankInfo.format.switchedOnPaste"));
        }
    };
}

/**
 * Why a paste or a copy switches to SFe mode: its own SFe data, or the user's yes to the
 * question about the resonance twins.
 */
export function getSwitchCause(isConverting: boolean, hasSFeData: boolean) {
    if (hasSFeData) {
        return "sfeData";
    }
    return isConverting ? "answer" : undefined;
}
