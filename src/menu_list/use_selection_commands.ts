import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import {
    isInstrument,
    isPreset,
    isSample,
    selectionOf
} from "./menu_selection.ts";
import { createDeleteSelectionActions } from "./delete_selection.ts";

/**
 * Copy, cut, paste, duplicate and delete for the selected elements, shared by the keyboard
 * shortcuts and the right-click menu.
 */
export function useSelectionCommands() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard } = useClipboard();

    const copy = (selection: ReadonlySet<BankEntity>) => {
        // A selection holds one kind, and copying one kind clears the others
        const presets = selectionOf(selection, isPreset);
        const instruments = selectionOf(selection, isInstrument);
        const samples = selectionOf(selection, isSample);
        if (presets.size > 0) {
            clipboard.copyPresets(presets);
            toast.success(
                t("clipboardLocale.copiedPresets", { count: presets.size })
            );
        } else if (instruments.size > 0) {
            clipboard.copyInstruments(instruments);
            toast.success(
                t("clipboardLocale.copiedInstruments", {
                    count: instruments.size
                })
            );
        } else if (samples.size > 0) {
            clipboard.copySamples(samples);
            toast.success(
                t("clipboardLocale.copiedSamples", { count: samples.size })
            );
        }
    };

    const remove = (selection: ReadonlySet<BankEntity>) => {
        const { actions, skipped } = createDeleteSelectionActions(selection);
        if (actions.length > 0) {
            apply(actions);
        }
        if (skipped > 0) {
            toast.error(t("presetList.deleteSkipped", { count: skipped }));
        }
    };

    const paste = () => {
        const { document } = session;
        if (clipboard.hasPresets()) {
            apply(clipboard.pastePresets(document));
            toast.success(
                t("clipboardLocale.pastedPresets", {
                    count: clipboard.presetCount
                })
            );
        }
        if (clipboard.hasInstruments()) {
            apply(clipboard.pasteInstruments(document));
            toast.success(
                t("clipboardLocale.pastedInstruments", {
                    count: clipboard.instrumentCount
                })
            );
        }
        if (!clipboard.hasSamples()) {
            return;
        }
        apply(clipboard.pasteSamples(document));
        toast.success(
            t("clipboardLocale.pastedSamples", {
                count: clipboard.sampleCount
            })
        );
    };

    // Leaves the clipboard alone. Instruments and samples are shared with the original.
    const duplicate = (selection: ReadonlySet<BankEntity>) => {
        const { document } = session;
        apply([
            ...clipboard.clonePresets(
                document,
                selectionOf(selection, isPreset)
            ),
            ...clipboard.cloneInstruments(
                document,
                selectionOf(selection, isInstrument)
            ),
            ...clipboard.cloneSamples(
                document,
                selectionOf(selection, isSample)
            )
        ]);
    };

    return {
        copy,
        cut: (selection: ReadonlySet<BankEntity>) => {
            copy(selection);
            remove(selection);
        },
        paste,
        duplicate,
        remove
    };
}
