import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import type { BankEntity } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import { useDialogs } from "../dialogs/dialogs_context.ts";
import type { ContextMenuEntry } from "../context_menu/context_menu_context.ts";
import {
    isInstrument,
    isPreset,
    isSample,
    selectionOf
} from "./menu_selection.ts";
import { useSelectionCommands } from "./use_selection_commands.ts";
import {
    createInstrumentFromSamples,
    createInstrumentLinkActions,
    createPresetFromInstruments,
    createSampleLinkActions
} from "./link_actions.ts";
import {
    createAutoLoopActions,
    createEqualizerActions,
    createNormalizeActions
} from "../sample_editor/sample_audio.ts";
import {
    EQ_MAX_GAIN,
    FLAT_EQUALIZER
} from "../sample_editor/equalizer/equalizer.ts";
import { logError } from "../utils/core_utils.ts";
import { createRootKeyActions } from "../sample_editor/root_key_actions.ts";
import { createSpreadActions } from "../instrument_editor/spread_actions.ts";
import { shortcutText } from "../utils/shortcut_text.ts";

/**
 * Runs an audio tool, which reads the audio first, and reports a failed read.
 */
async function runAudioTool(task: () => Promise<void>) {
    try {
        await task();
    } catch (error) {
        logError("Failed to process the sample audio.", error);
        toast.error(String(error));
    }
}

/**
 * Builds the right-click menu of the element lists for a selection.
 */
export function useListMenu() {
    const { t } = useTranslation();
    const { session, apply, playSample } = useBankEditor();
    const { contents } = useClipboard();
    const { pickElement, askNumber } = useDialogs();
    const commands = useSelectionCommands();
    const { document } = session;

    const addSamplesToInstrument = async (samples: ReadonlySet<BankEntity>) => {
        const picked = await pickElement({
            title: t("contextMenu.pickInstrument"),
            items: document.instruments,
            getLabel: (i) => i.name
        });
        if (picked) {
            apply(
                createSampleLinkActions(picked, selectionOf(samples, isSample))
            );
        }
    };

    const addInstrumentsToPreset = async (
        instruments: ReadonlySet<BankEntity>
    ) => {
        const picked = await pickElement({
            title: t("contextMenu.pickPreset"),
            items: document.presets,
            getLabel: (p) => p.toString()
        });
        if (picked) {
            apply(
                createInstrumentLinkActions(
                    picked,
                    selectionOf(instruments, isInstrument)
                )
            );
        }
    };

    const changeGain = async (selection: ReadonlySet<BankEntity>) => {
        const samples = selectionOf(selection, isSample);
        const gain = await askNumber({
            title: t("contextMenu.gainTitle"),
            label: t("contextMenu.gainLabel"),
            initial: 0,
            min: -EQ_MAX_GAIN,
            max: EQ_MAX_GAIN,
            step: 0.5
        });
        if (gain === undefined || gain === 0) {
            return;
        }
        await runAudioTool(async () => {
            const { actions, isClipping } = await createEqualizerActions(
                session,
                samples,
                { ...FLAT_EQUALIZER, gain }
            );
            apply(actions);
            if (isClipping) {
                toast.error(t("sampleLocale.equalizer.clipping"));
            }
        });
    };

    const autoLoop = (selection: ReadonlySet<BankEntity>) =>
        runAudioTool(async () => {
            const { actions, skipped } = await createAutoLoopActions(
                session,
                selectionOf(selection, isSample)
            );
            if (actions.length > 0) {
                apply(actions);
            }
            if (skipped > 0) {
                toast.error(t("contextMenu.skippedShort", { count: skipped }));
            }
        });

    const setRootKeysFromNames = (selection: ReadonlySet<BankEntity>) => {
        const { actions, skipped } = createRootKeyActions(
            selectionOf(selection, isSample)
        );
        if (actions.length > 0) {
            apply(actions);
            toast.success(
                t("contextMenu.rootKeysSet", { count: actions.length })
            );
        }
        if (skipped > 0) {
            toast.error(t("contextMenu.skippedNoNote", { count: skipped }));
        }
    };

    const normalize = (samples: ReadonlySet<BankEntity>) =>
        runAudioTool(async () => {
            const actions = await createNormalizeActions(
                session,
                selectionOf(samples, isSample)
            );
            apply(actions);
        });

    return (selection: ReadonlySet<BankEntity>): ContextMenuEntry[] => {
        const hasClipboard =
            contents.presets + contents.instruments + contents.samples > 0;
        const editEntries: ContextMenuEntry[] = [
            {
                label: t("contextMenu.copy"),
                onSelect: () => commands.copy(selection),
                shortcut: shortcutText("C")
            },
            {
                label: t("contextMenu.cut"),
                onSelect: () => commands.cut(selection),
                shortcut: shortcutText("X")
            },
            {
                label: t("contextMenu.paste"),
                onSelect: commands.paste,
                isDisabled: !hasClipboard,
                shortcut: shortcutText("V")
            },
            {
                label: t("contextMenu.duplicate"),
                onSelect: () => commands.duplicate(selection),
                shortcut: shortcutText("D")
            },
            {
                label: t("contextMenu.delete"),
                onSelect: () => commands.remove(selection),
                shortcut: "Del"
            }
        ];
        const samples = selectionOf(selection, isSample);
        if (samples.size > 0) {
            const [first] = samples;
            return [
                ...(samples.size === 1
                    ? [
                          {
                              label: t("contextMenu.play"),
                              onSelect: () => playSample(first)
                          },
                          "separator" as const
                      ]
                    : []),
                ...editEntries,
                "separator",
                {
                    label: t("contextMenu.addToInstrument"),
                    onSelect: () => void addSamplesToInstrument(samples),
                    isDisabled: document.instruments.length === 0
                },
                {
                    label: t("contextMenu.newInstrument"),
                    onSelect: () =>
                        apply([createInstrumentFromSamples(samples)])
                },
                "separator",
                {
                    label: t("contextMenu.normalize"),
                    onSelect: () => void normalize(samples)
                },
                {
                    label: t("contextMenu.autoLoop"),
                    onSelect: () => void autoLoop(samples)
                },
                {
                    label: t("contextMenu.gain"),
                    onSelect: () => void changeGain(samples)
                },
                {
                    label: t("contextMenu.rootKeysFromNames"),
                    onSelect: () => setRootKeysFromNames(samples)
                }
            ];
        }
        const instruments = selectionOf(selection, isInstrument);
        if (instruments.size > 0) {
            return [
                ...editEntries,
                "separator",
                {
                    label: t("contextMenu.addToPreset"),
                    onSelect: () => void addInstrumentsToPreset(instruments),
                    isDisabled: document.presets.length === 0
                },
                {
                    label: t("contextMenu.newPreset"),
                    onSelect: () =>
                        apply([
                            createPresetFromInstruments(document, instruments)
                        ])
                },
                "separator",
                {
                    label: t("contextMenu.spreadSamples"),
                    onSelect: () =>
                        apply(
                            [...instruments].flatMap((i) =>
                                createSpreadActions(i)
                            )
                        )
                }
            ];
        }
        return selectionOf(selection, isPreset).size > 0 ? editEntries : [];
    };
}
