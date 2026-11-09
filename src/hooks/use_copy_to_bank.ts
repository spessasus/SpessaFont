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

/**
 * Copies elements of one bank into another, like a paste: a drop on a tab, or "Copy to bank…"
 * on phones. The copy is one undo step in the target, the source stays as it is.
 */
export function useCopyToBank() {
    const { t } = useTranslation();
    const { clipboard } = useClipboard();
    return (
        source: BankSession,
        target: BankSession,
        entities: readonly BankEntity[]
    ) => {
        // An undo or a delete since they were picked may have removed some
        const copied = entities.filter((e) => source.document.contains(e));
        if (copied.length === 0) {
            return;
        }
        const presets = copied.filter(isPreset);
        // Counted before the copy, after it the copies take the patches
        const moved = clipboard.countMovedPresets(target.document, presets);
        target.history.do(
            clipboard.cloneElements(
                target,
                {
                    presets,
                    instruments: copied.filter(isInstrument),
                    samples: copied.filter(isSample)
                },
                source
            )
        );
        const name = target.store.getSnapshot().info.name;
        toast.success(
            t("clipboardLocale.copiedToBank", {
                count: copied.length,
                name: name.length > 0 ? name : t("bankInfo.unnamed")
            })
        );
        if (moved > 0) {
            toast(t("clipboardLocale.movedPresets", { count: moved }));
        }
    };
}
