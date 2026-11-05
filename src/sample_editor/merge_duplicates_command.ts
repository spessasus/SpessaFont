import toast from "react-hot-toast";
import type { TFunction } from "i18next";
import type { BasicSample } from "spessasynth_core";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { HistoryActionGroup } from "../core_backend/history.ts";
import { findDuplicateSamples } from "../core_backend/merge_duplicates.ts";
import { yieldToPaint } from "../utils/yield_to_paint.ts";
import { runAudioTool } from "./run_audio_tool.ts";

/**
 * Merges duplicate samples with a loading toast while the audio is compared, then says how many
 * were merged. Shared by the edit menu (the whole bank) and the sample list (the selection).
 * @param session the bank
 * @param scope the samples to compare, all when undefined
 * @param t the translation function
 * @param apply runs the actions as one undo step
 */
export function mergeDuplicateSamples(
    session: BankSession,
    scope: ReadonlySet<BasicSample> | undefined,
    t: TFunction,
    apply: (actions: HistoryActionGroup) => void
) {
    return runAudioTool(async () => {
        const id = toast.loading(t("toolsLocale.merge.searching"));
        // Comparing a large bank takes a while, so let the toast show first
        await yieldToPaint();
        try {
            const duplicates = await findDuplicateSamples(session, scope);
            const { actions, removedCount } = duplicates.createActions();
            if (removedCount === 0) {
                toast(t("toolsLocale.merge.none"), { id });
                return;
            }
            apply(actions);
            toast.success(
                t("toolsLocale.merge.merged", { count: removedCount }),
                {
                    id
                }
            );
        } catch (error) {
            toast.dismiss(id);
            throw error;
        }
    });
}
