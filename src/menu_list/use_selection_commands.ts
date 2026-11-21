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
import { getSwitchCause, useSFeSwitch } from "../hooks/use_sfe_switch.ts";
import { useTwinPasteQuestion } from "../hooks/use_twin_paste_question.ts";

/**
 * Copy, cut, paste, duplicate and delete for the selected elements, shared by the keyboard
 * shortcuts and the right-click menu.
 */
export function useSelectionCommands() {
    const { t } = useTranslation();
    const { session, apply } = useBankEditor();
    const applyWithSFeSwitch = useSFeSwitch();
    const askAboutTwins = useTwinPasteQuestion("paste");
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

    // Runs when the user acts, or once they answered the question about resonance twins
    const pastePresets = (isConverting: boolean) => {
        // Counted before the paste, after it the copies take the patches
        const moved = clipboard.countMovedPresets(session.document);
        applyWithSFeSwitch(
            session,
            clipboard.pastePresets(session),
            getSwitchCause(
                isConverting,
                clipboard.hasSFeData("presets", session)
            ),
            apply,
            true
        );
        toast.success(
            t("clipboardLocale.pastedPresets", {
                count: clipboard.presetCount
            })
        );
        if (moved > 0) {
            toast(t("clipboardLocale.movedPresets", { count: moved }));
        }
    };

    const pasteInstruments = (isConverting: boolean) => {
        applyWithSFeSwitch(
            session,
            clipboard.pasteInstruments(session),
            getSwitchCause(
                isConverting,
                clipboard.hasSFeData("instruments", session)
            ),
            apply,
            true
        );
        toast.success(
            t("clipboardLocale.pastedInstruments", {
                count: clipboard.instrumentCount
            })
        );
    };

    const paste = () => {
        // A paste that brings SFe data switches to SFe mode anyway, so it asks nothing. A copy
        // while the question is open ends it, Convert would paste the new copy
        if (clipboard.hasPresets()) {
            askAboutTwins(
                session,
                !clipboard.hasSFeData("presets", session) &&
                    clipboard.isTwinQuestionNeeded("presets", session),
                pastePresets,
                [clipboard.changeSignal]
            );
        }
        if (clipboard.hasInstruments()) {
            askAboutTwins(
                session,
                !clipboard.hasSFeData("instruments", session) &&
                    clipboard.isTwinQuestionNeeded("instruments", session),
                pasteInstruments,
                [clipboard.changeSignal]
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
