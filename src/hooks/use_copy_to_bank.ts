import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankSession } from "../core_backend/bank_session.ts";
import type { BankEntity } from "../core_backend/bank_view.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import {
    isInstrument,
    isPreset,
    isSample
} from "../menu_list/menu_selection.ts";
import { getSwitchCause, useSFeSwitch } from "./use_sfe_switch.ts";
import { hasCopiedSFeData } from "../core_backend/sfe_data.ts";
import { isTwinQuestionNeeded } from "../core_backend/resonance_compensation.ts";
import { useTwinPasteQuestion } from "./use_twin_paste_question.ts";

/**
 * Copies elements of one bank into another, like a paste: a drop on a tab, or "Copy to bank…"
 * on phones. The copy is one undo step in the target, the source stays as it is.
 */
export function useCopyToBank() {
    const { t } = useTranslation();
    const { clipboard } = useClipboard();
    const applyWithSFeSwitch = useSFeSwitch();
    const askAboutTwins = useTwinPasteQuestion("copy");
    return (
        source: BankSession,
        target: BankSession,
        entities: readonly BankEntity[]
    ) => {
        // The target's tab may have closed while the bank sheet was open
        if (target.closeSignal.aborted) {
            return;
        }
        // An undo or a delete since they were picked may have removed some
        const getCopied = () =>
            entities.filter((e) => source.document.contains(e));
        const copied = getCopied();
        if (copied.length === 0) {
            return;
        }
        const presets = copied.filter(isPreset);
        const instruments = copied.filter(isInstrument);
        // A copy that brings SFe data switches to SFe mode anyway, so it asks nothing. Another
        // bank gets copies of every instrument
        const isQuestionNeeded =
            !hasCopiedSFeData([...presets, ...instruments]) &&
            isTwinQuestionNeeded(
                target.document,
                new Set([
                    ...instruments,
                    ...presets.flatMap((p) => p.zones.map((z) => z.instrument))
                ]),
                source.document.bank.defaultModulators
            );
        const copy = (isConverting: boolean) => {
            // The source may have changed while the question was open
            const current = getCopied();
            if (current.length === 0) {
                toast.error(t("clipboardLocale.copySourceGone"));
                return;
            }
            const presets = current.filter(isPreset);
            const instruments = current.filter(isInstrument);
            // Counted before the copy, after it the copies take the patches
            const moved = clipboard.countMovedPresets(target.document, presets);
            const actions = clipboard.cloneElements(
                target,
                {
                    presets,
                    instruments,
                    samples: current.filter(isSample)
                },
                source
            );
            applyWithSFeSwitch(
                target,
                actions,
                getSwitchCause(
                    isConverting,
                    hasCopiedSFeData([...presets, ...instruments])
                ),
                (group) => target.history.do(group),
                true
            );
            const name = target.store.getSnapshot().info.name;
            toast.success(
                t("clipboardLocale.copiedToBank", {
                    count: current.length,
                    name: name.length > 0 ? name : t("bankInfo.unnamed")
                })
            );
            if (moved > 0) {
                toast(t("clipboardLocale.movedPresets", { count: moved }));
            }
        };
        askAboutTwins(target, isQuestionNeeded, copy, [source.closeSignal]);
    };
}
