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
        const { actions, isClipping } = createEqualizerActions(samples, {
            ...FLAT_EQUALIZER,
            gain
        });
        apply(actions);
        if (isClipping) {
            toast.error(t("sampleLocale.equalizer.clipping"));
        }
    };

    const autoLoop = (selection: ReadonlySet<BankEntity>) => {
        const { actions, skipped } = createAutoLoopActions(
            selectionOf(selection, isSample)
        );
        if (actions.length > 0) {
            apply(actions);
        }
        if (skipped > 0) {
            toast.error(t("contextMenu.skippedShort", { count: skipped }));
        }
    };

    return (selection: ReadonlySet<BankEntity>): ContextMenuEntry[] => {
        const hasClipboard =
            contents.presets + contents.instruments + contents.samples > 0;
        const editEntries: ContextMenuEntry[] = [
            {
                label: t("contextMenu.copy"),
                onSelect: () => commands.copy(selection)
            },
            {
                label: t("contextMenu.cut"),
                onSelect: () => commands.cut(selection)
            },
            {
                label: t("contextMenu.paste"),
                onSelect: commands.paste,
                isDisabled: !hasClipboard
            },
            {
                label: t("contextMenu.duplicate"),
                onSelect: () => commands.duplicate(selection)
            },
            {
                label: t("contextMenu.delete"),
                onSelect: () => commands.remove(selection)
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
                    onSelect: () => apply(createNormalizeActions(samples))
                },
                {
                    label: t("contextMenu.autoLoop"),
                    onSelect: () => autoLoop(samples)
                },
                {
                    label: t("contextMenu.gain"),
                    onSelect: () => void changeGain(samples)
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
                }
            ];
        }
        return selectionOf(selection, isPreset).size > 0 ? editEntries : [];
    };
}
