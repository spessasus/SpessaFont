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

    /**
     * Copies the selection and returns the message that says what was copied.
     */
    const copyToClipboard = (selection: ReadonlySet<BankEntity>) => {
        // A selection holds one kind, and copying one kind clears the others
        const presets = selectionOf(selection, isPreset);
        if (presets.size > 0) {
            clipboard.copyPresets(presets, session);
            return t("clipboardLocale.copiedPresets", { count: presets.size });
        }
        const instruments = selectionOf(selection, isInstrument);
        if (instruments.size > 0) {
            clipboard.copyInstruments(instruments, session);
            return t("clipboardLocale.copiedInstruments", {
                count: instruments.size
            });
        }
        const samples = selectionOf(selection, isSample);
        if (samples.size > 0) {
            clipboard.copySamples(samples, session);
            return t("clipboardLocale.copiedSamples", {
                count: samples.size
            });
        }
        return undefined;
    };

    const copy = (selection: ReadonlySet<BankEntity>) => {
        const message = copyToClipboard(selection);
        if (message) {
            toast.success(message);
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

    const pastePresets = () => {
        // Counted before the paste, after it the copies take the patches
        const moved = clipboard.countMovedPresets(session.document);
        apply(clipboard.pastePresets(session));
        toast.success(
            t("clipboardLocale.pastedPresets", {
                count: clipboard.presetCount
            })
        );
        if (moved > 0) {
            toast(t("clipboardLocale.movedPresets", { count: moved }));
        }
    };

    const paste = () => {
        if (clipboard.hasPresets()) {
            pastePresets();
        }
        if (clipboard.hasInstruments()) {
            apply(clipboard.pasteInstruments(session));
            toast.success(
                t("clipboardLocale.pastedInstruments", {
                    count: clipboard.instrumentCount
                })
            );
        }
        if (!clipboard.hasSamples()) {
            return;
        }
        apply(clipboard.pasteSamples(session));
        toast.success(
            t("clipboardLocale.pastedSamples", {
                count: clipboard.sampleCount
            })
        );
    };

    // Leaves the clipboard alone. Instruments and samples are shared with the original.
    const duplicate = (selection: ReadonlySet<BankEntity>) => {
        apply(
            clipboard.cloneElements(session, {
                presets: selectionOf(selection, isPreset),
                instruments: selectionOf(selection, isInstrument),
                samples: selectionOf(selection, isSample)
            })
        );
    };

    return {
        copy,
        pastePresets,
        // Elements still in use stay, so the cut says that they were only copied
        cut: (selection: ReadonlySet<BankEntity>) => {
            const message = copyToClipboard(selection);
            const { actions, skipped } =
                createDeleteSelectionActions(selection);
            if (actions.length > 0) {
                apply(actions);
            }
            if (skipped > 0) {
                toast.error(t("presetList.cutKept", { count: skipped }));
            } else if (message) {
                toast.success(message);
            }
        },
        paste,
        duplicate,
        remove
    };
}
