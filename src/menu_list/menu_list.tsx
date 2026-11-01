import { BasicInstrument, BasicPreset, BasicSample } from "spessasynth_core";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import { useClipboard } from "../clipboard/clipboard_context.ts";
import type { BankEditView } from "../core_backend/bank_view.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { SampleList } from "./sample_list.tsx";
import { InstrumentList } from "./instrument_list.tsx";
import { PresetList } from "./preset_list.tsx";
import type { HistoryAction } from "../core_backend/history.ts";
import { DeleteInstrumentAction } from "../instrument_editor/linked_presets/delete_instrument_action.ts";
import { DeleteSampleAction } from "../sample_editor/linked_instruments/delete_sample_action.ts";
import { DeletePresetAction } from "../preset_editor/bottom_bar/delete_preset_action.ts";
import toast from "react-hot-toast";

export const ESTIMATED_ROW_HEIGHT = 30;
export const OVERSCAN = 5;

export interface MappedPresetType {
    searchString: string;
    preset: BasicPreset;
}

interface MenuListProps {
    view: BankEditView;
}

export const MenuList = React.memo(function ({ view }: MenuListProps) {
    const { t } = useTranslation();
    const { session, apply, setView } = useBankEditor();
    const { clipboard } = useClipboard();
    const samples = useBankSnapshot(session.store, (s) => s.samples);
    const instruments = useBankSnapshot(session.store, (s) => s.instruments);
    const presets = useBankSnapshot(session.store, (s) => s.presets);
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

    // useeffect for delete, copy and paste
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                default: {
                    return;
                }

                case "Delete": {
                    {
                        let action: HistoryAction;
                        if (view instanceof BasicInstrument) {
                            if (view.useCount > 0) {
                                return;
                            }
                            action = new DeleteInstrumentAction(view);
                        } else if (view instanceof BasicSample) {
                            if (view.useCount > 0) {
                                return;
                            }
                            action = new DeleteSampleAction(view);
                        } else if (view instanceof BasicPreset) {
                            action = new DeletePresetAction(view);
                        } else {
                            return;
                        }
                        apply([action]);
                    }
                    break;
                }

                case "c": {
                    {
                        if (e.ctrlKey) {
                            if (selectedSamples.size > 0) {
                                clipboard.copySamples(selectedSamples);
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
                }

                case "v": {
                    if (e.ctrlKey) {
                        if (clipboard.hasPresets()) {
                            apply(clipboard.pastePresets(session.document));

                            toast.success(
                                t("clipboardLocale.pastedPresets", {
                                    count: clipboard.presetCount
                                })
                            );
                        }

                        if (clipboard.hasInstruments()) {
                            apply(clipboard.pasteInstruments(session.document));
                            toast.success(
                                t("clipboardLocale.pastedInstruments", {
                                    count: clipboard.instrumentCount
                                })
                            );
                        }

                        if (clipboard.hasSamples()) {
                            apply(clipboard.pasteSamples(session.document));
                            toast.success(
                                t("clipboardLocale.pastedSamples", {
                                    count: clipboard.sampleCount
                                })
                            );
                        }
                    }
                }
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [
        apply,
        clipboard,
        selectedInstruments,
        selectedPresets,
        selectedSamples,
        session.document,
        t,
        view
    ]);

    const presetNameMap: MappedPresetType[] = useMemo(() => {
        return presets.map((p) => {
            return {
                searchString: p.toString().toLowerCase(),
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
            for (const p of presetNameMap) {
                if (p.searchString.includes(searchQueryLower)) {
                    matchedPresetSet.add(p);
                }
            }

            // match instruments directly
            for (const i of instruments) {
                if (i.name.toLowerCase().includes(searchQueryLower)) {
                    matchedInstrumentSet.add(i);
                }
            }

            // match samples directly
            for (const s of samples) {
                if (s.name.toLowerCase().includes(searchQueryLower)) {
                    matchedSampleSet.add(s);
                }
            }

            // backfill the presets' instruments
            for (const p of matchedPresetSet)
                for (const z of p.preset.zones)
                    matchedInstrumentSet.add(z.instrument);

            // backfill the instruments' samples
            for (const i of matchedInstrumentSet)
                for (const z of i.zones) matchedSampleSet.add(z.sample);

            return {
                filteredSamples: Array.from(matchedSampleSet),
                filteredInstruments: Array.from(matchedInstrumentSet),
                filteredPresets: Array.from(matchedPresetSet)
            };
        }, [searchQueryLower, samples, instruments, presetNameMap]);

    if (!open) {
        return (
            <div className={"menu_list_closed"} onClick={() => setOpen(true)}>
                {"\u{25B6}"}
            </div>
        );
    }
    return (
        <>
            <div className={`menu_list_main`}>
                <div
                    onClick={() => setView("info")}
                    className={`item_group_header hover_brightness ${view === "info" ? "opened" : ""}`}
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
                            {"\u{25C0}"}
                        </div>
                    </div>
                </div>

                <SampleList
                    samples={filteredSamples}
                    view={view}
                    selectedSamples={selectedSamples}
                    setSelectedSamples={setSelectedSamples}
                />

                <InstrumentList
                    instruments={filteredInstruments}
                    view={view}
                    selectedInstruments={selectedInstruments}
                    setSelectedInstruments={setSelectedInstruments}
                    selectedSamples={selectedSamples}
                />

                <PresetList
                    view={view}
                    presets={filteredPresets}
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
