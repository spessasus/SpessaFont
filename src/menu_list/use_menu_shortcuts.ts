import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { useEventListener } from "../hooks/use_event_listener.ts";
import { selectionOf } from "./menu_selection.ts";
import { createDeleteSelectionActions } from "./delete_selection.ts";

/**
 * Keys typed into a field belong to the field, not to the element list.
 */
function isTypingTarget(target: EventTarget | null) {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target instanceof HTMLSelectElement)
    );
}

const isPreset = (e: BankEntity) => e instanceof BasicPreset;
const isInstrument = (e: BankEntity) => e instanceof BasicInstrument;
const isSample = (e: BankEntity) => e instanceof BasicSample;

/**
 * Delete removes the selection (except what is still used), Ctrl+C copies the selection,
 * and Ctrl+V pastes what the clipboard holds.
 */
export function useMenuShortcuts(selection: ReadonlySet<BankEntity>) {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const { clipboard } = useClipboard();

    const deleteSelection = () => {
        const { actions, skipped } = createDeleteSelectionActions(selection);
        if (actions.length > 0) {
            apply(actions);
        }
        if (skipped > 0) {
            toast.error(t("presetList.deleteSkipped", { count: skipped }));
        }
    };

    const copySelection = () => {
        const presets = selectionOf(selection, isPreset);
        const instruments = selectionOf(selection, isInstrument);
        const samples = selectionOf(selection, isSample);
        if (presets.size > 0) clipboard.copyPresets(presets);
        if (instruments.size > 0) clipboard.copyInstruments(instruments);
        if (samples.size > 0) clipboard.copySamples(samples);
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

    useEventListener(document, "keydown", (e) => {
        if (isTypingTarget(e.target)) {
            return;
        }
        if (e.key === "Delete") {
            deleteSelection();
        } else if (e.ctrlKey && e.key === "c") {
            copySelection();
        } else if (e.ctrlKey && e.key === "v") {
            paste();
        }
    });
}
