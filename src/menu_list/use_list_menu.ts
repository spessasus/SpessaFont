import type { BasicInstrument, BasicPreset } from "spessasynth_core";
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
import { createRootKeyActions } from "../sample_editor/root_key_actions.ts";
import {
    type BatchScope,
    createBatchGeneratorActions,
    isBatchEditableRow
} from "./batch_generator_actions.ts";
import type { CellEdit } from "../generator_table/cell/parse_generator_text.ts";
import { getElementRows } from "../generator_table/tools/element_rows.ts";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { GENERATOR_UNITS } from "../generator_table/generator_unit.ts";
import { DELETE_KEY_TEXT, shortcutText } from "../utils/shortcut_text.ts";
import { runAudioTool } from "../sample_editor/run_audio_tool.ts";
import { useSampleTools } from "../sample_editor/use_sample_tools.tsx";
import { useElementTools } from "../generator_table/tools/use_element_tools.tsx";

/**
 * Builds the right-click menu of the element lists for a selection.
 */
export function useListMenu() {
    const { t } = useTranslation();
    const {
        session,
        apply,
        applyCreate: create = apply,
        playSample
    } = useBankEditor();
    const { contents } = useClipboard();
    const { pickElement, askNumber } = useDialogs();
    const commands = useSelectionCommands();
    const sampleTools = useSampleTools();
    const elementTools = useElementTools();
    const { document } = session;

    /**
     * The tools for many zones, the same for presets and instruments.
     */
    const getZoneToolEntries = (
        elements: readonly (BasicPreset | BasicInstrument)[]
    ): ContextMenuEntry[] => [
        {
            label: t("toolsLocale.keyCurve.menu"),
            onSelect: () => void elementTools.openKeyCurve(elements)
        },
        {
            label: t("toolsLocale.attenuation.menu"),
            onSelect: () => void elementTools.openAttenuation(elements)
        },
        {
            label: t("toolsLocale.split.menu"),
            onSelect: () => void elementTools.openSplitZones(elements)
        }
    ];

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

    // Many elements at once, like typing the edit into every cell of the row
    const editGenerator = async (
        elements: ReadonlySet<BasicPreset | BasicInstrument>
    ) => {
        const [first] = elements;
        const rows = getElementRows(first).filter((row) =>
            isBatchEditableRow(row)
        );
        const row = await pickElement({
            title: t("contextMenu.batchGeneratorTitle"),
            items: rows,
            getLabel: (r) => {
                const name = t(generatorLocaleMap[r.generator]);
                return r.unit
                    ? `${name} (${t(GENERATOR_UNITS[r.unit].suffix)})`
                    : name;
            }
        });
        if (!row) {
            return;
        }
        const modes: {
            label: string;
            kind: CellEdit["kind"];
            scope: BatchScope;
        }[] = [
            {
                label: t("contextMenu.batchSetGlobal"),
                kind: "set",
                scope: "global"
            },
            {
                label: t("contextMenu.batchSetZones"),
                kind: "set",
                scope: "zones"
            },
            { label: t("contextMenu.batchAdd"), kind: "add", scope: "zones" },
            {
                label: t("contextMenu.batchMultiply"),
                kind: "multiply",
                scope: "zones"
            }
        ];
        const mode = await pickElement({
            title: t(generatorLocaleMap[row.generator]),
            items: modes,
            getLabel: (m) => m.label
        });
        if (!mode) {
            return;
        }
        const value = await askNumber({
            title: mode.label,
            label: t(generatorLocaleMap[row.generator]),
            initial: mode.kind === "multiply" ? 1 : 0,
            min: -1_000_000,
            max: 1_000_000,
            step: 0.01
        });
        if (value === undefined) {
            return;
        }
        const actions = createBatchGeneratorActions(
            elements,
            row,
            { kind: mode.kind, value },
            mode.scope
        );
        if (actions.length === 0) {
            toast(t("toolsLocale.nothingChanged"));
            return;
        }
        apply(actions);
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
        if (gain === undefined) {
            return;
        }
        if (gain === 0) {
            toast(t("toolsLocale.nothingChanged"));
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
        } else if (actions.length === 0) {
            toast(t("contextMenu.rootKeysUnchanged"));
        }
    };

    const normalize = (samples: ReadonlySet<BankEntity>) =>
        runAudioTool(async () => {
            const actions = await createNormalizeActions(
                session,
                selectionOf(samples, isSample)
            );
            if (actions.length === 0) {
                toast(t("sampleLocale.tools.nothingToNormalize"));
                return;
            }
            apply(actions);
        });

    const getEntries = (
        selection: ReadonlySet<BankEntity>
    ): ContextMenuEntry[] => {
        const hasClipboard =
            contents.presets + contents.instruments + contents.samples > 0;
        const editEntries: ContextMenuEntry[] = [
            {
                label: t("contextMenu.copy"),
                icon: "copy",
                onSelect: () => commands.copy(selection),
                shortcut: shortcutText("C")
            },
            {
                label: t("contextMenu.cut"),
                icon: "cut",
                onSelect: () => commands.cut(selection),
                shortcut: shortcutText("X")
            },
            {
                label: t("contextMenu.paste"),
                icon: "paste",
                onSelect: commands.paste,
                isDisabled: !hasClipboard,
                shortcut: shortcutText("V")
            },
            {
                label: t("contextMenu.duplicate"),
                icon: "duplicate",
                onSelect: () => commands.duplicate(selection),
                shortcut: shortcutText("D")
            },
            {
                label: t("contextMenu.delete"),
                icon: "delete",
                isDestructive: true,
                onSelect: () => commands.remove(selection),
                shortcut: DELETE_KEY_TEXT
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
                              icon: "play" as const,
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
                        create([createInstrumentFromSamples(document, samples)])
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
                },
                {
                    label: t("toolsLocale.shift.menu"),
                    onSelect: () => void sampleTools.shift(samples)
                },
                "separator",
                {
                    label: t("toolsLocale.trim.removeSilence"),
                    onSelect: () => void sampleTools.removeSilence(samples)
                },
                {
                    label: t("toolsLocale.trim.trimAfterLoop"),
                    onSelect: () => void sampleTools.trimAfterLoop(samples)
                },
                {
                    label: t("toolsLocale.merge.menuSelection"),
                    onSelect: () => void sampleTools.mergeDuplicates(samples),
                    isDisabled: samples.size < 2
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
                        create([
                            createPresetFromInstruments(document, instruments)
                        ])
                },
                "separator",
                {
                    label: t("contextMenu.spreadSamples"),
                    onSelect: () => elementTools.spread([...instruments])
                },
                ...getZoneToolEntries([...instruments]),
                {
                    label: t("toolsLocale.naturalRelease.menu"),
                    onSelect: () =>
                        void elementTools.openNaturalRelease([...instruments])
                },
                {
                    label: t("contextMenu.drumMap"),
                    onSelect: () =>
                        void elementTools.openDrumMap([...instruments])
                },
                {
                    label: t("contextMenu.batchGenerator"),
                    onSelect: () => void editGenerator(instruments)
                }
            ];
        }
        const presets = selectionOf(selection, isPreset);
        return presets.size > 0
            ? [
                  ...editEntries,
                  "separator",
                  ...getZoneToolEntries([...presets]),
                  {
                      label: t("contextMenu.batchGenerator"),
                      onSelect: () => void editGenerator(presets)
                  }
              ]
            : [];
    };

    // The menu stays open while the bank changes (an undo from the menu bar), so a picked entry
    // acts on the part of the selection still in the bank, and does nothing when none is left
    return (selection: ReadonlySet<BankEntity>): ContextMenuEntry[] =>
        getEntries(selection).map((entry) =>
            entry === "separator"
                ? entry
                : {
                      ...entry,
                      onSelect: () => {
                          const live = new Set(
                              [...selection].filter((e) => document.contains(e))
                          );
                          if (live.size === selection.size) {
                              entry.onSelect();
                              return;
                          }
                          if (live.size === 0) {
                              return;
                          }
                          const current = getEntries(live).find(
                              (e) =>
                                  e !== "separator" && e.label === entry.label
                          );
                          if (
                              current &&
                              current !== "separator" &&
                              !current.isDisabled
                          ) {
                              current.onSelect();
                          }
                      }
                  }
        );
}
