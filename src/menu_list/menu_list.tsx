import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { ClipboardManager } from "../core_backend/clipboard_manager.ts";
import { SampleList } from "./sample_list.tsx";
import { InstrumentList } from "./instrument_list.tsx";
import { PresetList } from "./preset_list.tsx";
import type { HistoryAction } from "../core_backend/history.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";

export const ESTIMATED_ROW_HEIGHT = 30;
export const OVERSCAN = 5;

export type MappedPresetType = { searchString: string; preset: BasicPreset };

type MenuListProps = {
    manager: SoundBankManager;
    view: BankEditView;
    sv: SetViewType;
    engine: AudioEngine;
    samples: BasicSample[];
    setSamples: (s: BasicSample[]) => unknown;
    instruments: BasicInstrument[];
    setInstruments: (i: BasicInstrument[]) => unknown;
    presets: BasicPreset[];
    setPresets: (p: BasicPreset[]) => unknown;
    clipboard: ClipboardManager;
};

export const MenuList = React.memo(function ({
    view,
    sv,
    manager,
    engine,
    setSamples,
    samples,
    instruments,
    setInstruments,
    presets,
    setPresets,
    clipboard
}: MenuListProps) {
    const [open, setOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedSamples, setSelectedSamples] = useState(
        new Set<BasicSample>()
    );
    const [selectedInstruments, setSelectedInstruments] = useState(
        new Set<BasicInstrument>()
    );
    const [selectedPresets, setSelectedPresets] = useState(
        new Set<BasicPreset>()
    );

    const setView = useCallback(
        (v: BankEditView) => {
            sv(v);
        },
        [sv]
    );

    useEffect(() => {
        setSearchQuery("");
    }, [manager]);

    // useeffect for delete, copy and paste
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                default:
                    return;

                case "Delete":
                    {
                        let action: HistoryAction;
                        if (view instanceof BasicInstrument) {
                            if (view.useCount > 0) {
                                return;
                            }
                            action = new DeleteInstrumentAction(
                                view,
                                setInstruments,
                                setView
                            );
                        } else if (view instanceof BasicSample) {
                            if (view.useCount > 0) {
                                return;
                            }
                            action = new DeleteSampleAction(
                                view,
                                setSamples,
                                setView
                            );
                        } else if (view instanceof BasicPreset) {
                            action = new DeletePresetAction(
                                view,
                                setPresets,
                                setView
                            );
                        } else {
                            return;
                        }
                        manager.modifyBank([action]);
                    }
                    break;

                case "c":
                    {
                        if (e.ctrlKey) {
                            if (selectedSamples.size > 0) {
                                clipboard.copySamples(selectedSamples);
                                setSamples([...manager.samples]);
                            }
                            if (selectedPresets.size > 0) {
                                clipboard.copyPresets(selectedPresets);
                            }
                            if (selectedInstruments.size > 0) {
                                clipboard.copyInstruments(selectedInstruments);
                            }
                        }
                    }
                    break;

                case "v": {
                    if (e.ctrlKey) {
                        clipboard.pasteSamples(manager, setSamples, setView);
                        setSamples([
                            ...manager.samples.toSorted((a, b) =>
                                a.sampleName > b.sampleName
                                    ? 1
                                    : b.sampleName > a.sampleName
                                      ? -1
                                      : 0
                            )
                        ]);

                        clipboard.pastePresets(
                            manager,
                            setPresets,
                            setInstruments,
                            setSamples,
                            setView
                        );
                        setPresets([
                            ...manager.presets.toSorted((a, b) =>
                                a.presetName > b.presetName
                                    ? 1
                                    : b.presetName > a.presetName
                                      ? -1
                                      : 0
                            )
                        ]);

                        clipboard.pasteInstruments(
                            manager,
                            setSamples,
                            setInstruments,
                            setView
                        );
                        setInstruments([
                            ...manager.instruments.toSorted((a, b) =>
                                a.instrumentName > b.instrumentName
                                    ? 1
                                    : b.instrumentName > a.instrumentName
                                      ? -1
                                      : 0
                            )
                        ]);
                    }
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [
        clipboard,
        manager,
        selectedInstruments,
        selectedPresets,
        selectedSamples,
        setInstruments,
        setPresets,
        setSamples,
        setView,
        view
    ]);

    const { t } = useTranslation();

    const presetNameMap: MappedPresetType[] = useMemo(() => {
        return presets.map((p) => {
            return {
                searchString: `${p.bank.toString().padStart(3, "0")}:${p.program
                    .toString()
                    .padStart(3, "0")} ${p.presetName}`.toLowerCase(),
                preset: p
            };
        });
    }, [presets]);
    const searchQueryLower = useMemo(
        () => searchQuery.toLowerCase(),
        [searchQuery]
    );

    const { filteredSamples, filteredInstruments, filteredPresets } =
        useMemo(() => {
            if (searchQueryLower === "") {
                return {
                    filteredSamples: samples,
                    filteredInstruments: instruments,
                    filteredPresets: presetNameMap
                };
            }

            const matchedSampleSet = new Set<BasicSample>();
            const matchedInstrumentSet = new Set<BasicInstrument>();
            const matchedPresetSet = new Set<MappedPresetType>();

            // match presets directly
            presetNameMap.forEach((p) => {
                if (p.searchString.includes(searchQueryLower)) {
                    matchedPresetSet.add(p);
                }
            });

            // match instruments directly
            instruments.forEach((i) => {
                if (i.instrumentName.toLowerCase().includes(searchQueryLower)) {
                    matchedInstrumentSet.add(i);
                }
            });

            // match samples directly
            samples.forEach((s) => {
                if (s.sampleName.toLowerCase().includes(searchQueryLower)) {
                    matchedSampleSet.add(s);
                }
            });

            // backfill the presets' instruments
            matchedPresetSet.forEach((p) =>
                p.preset.presetZones.forEach((z) =>
                    matchedInstrumentSet.add(z.instrument)
                )
            );

            // backfill the instruments' samples
            matchedInstrumentSet.forEach((i) =>
                i.instrumentZones.forEach((z) => matchedSampleSet.add(z.sample))
            );

            return {
                filteredSamples: samples.filter((s) => matchedSampleSet.has(s)),
                filteredInstruments: instruments.filter((i) =>
                    matchedInstrumentSet.has(i)
                ),
                filteredPresets: presetNameMap.filter((p) =>
                    matchedPresetSet.has(p)
                )
            };
        }, [searchQueryLower, samples, instruments, presetNameMap]);

    if (!open) {
        return (
            <div className={"menu_list_closed"} onClick={() => setOpen(true)}>
                {"\u25B6"}
            </div>
        );
    }
    return (
        <>
            <div className={`menu_list_main`}>
                <div
                    onClick={() => setView("info")}
                    className={`item_group_header ${view === "info" ? "opened" : ""}`}
                >
                    <h2>{t("presetList.overview")}</h2>
                    <div className={"right_buttons"}>
                        <div
                            className={"dropdown_triangle"}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setOpen(false);
                            }}
                        >
                            {"\u25C0"}
                        </div>
                    </div>
                </div>

                <SampleList
                    samples={filteredSamples}
                    view={view}
                    manager={manager}
                    engine={engine}
                    setSamples={setSamples}
                    setView={setView}
                    clipboard={clipboard}
                    selectedSamples={selectedSamples}
                    setSelectedSamples={setSelectedSamples}
                />

                <InstrumentList
                    clipboard={clipboard}
                    instruments={filteredInstruments}
                    setSamples={setSamples}
                    setInstruments={setInstruments}
                    setView={setView}
                    view={view}
                    manager={manager}
                    selectedInstruments={selectedInstruments}
                    setSelectedInstruments={setSelectedInstruments}
                    selectedSamples={selectedSamples}
                />

                <PresetList
                    view={view}
                    setView={setView}
                    clipboard={clipboard}
                    presets={filteredPresets}
                    setSamples={setSamples}
                    setInstruments={setInstruments}
                    setPresets={setPresets}
                    manager={manager}
                    selectedInstruments={selectedInstruments}
                    selectedPresets={selectedPresets}
                    setSelectedPresets={setSelectedPresets}
                />
                <div className={"search_bar"}>
                    <input
                        className={"pretty_input"}
                        placeholder={t("presetList.search")}
                        type={"text"}
                        value={searchQuery}
                        onInput={(e) =>
                            setSearchQuery((e.target as HTMLInputElement).value)
                        }
                    />
                </div>
            </div>
        </>
    );
});
