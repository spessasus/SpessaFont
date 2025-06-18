import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    sampleTypes
} from "spessasynth_core";
import * as React from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import SoundBankManager, {
    type BankEditView
} from "../core_backend/sound_bank_manager.ts";
import { PresetDisplay } from "./preset_display/preset_display.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";
import { SampleDisplay } from "./sample_display/sample_display.tsx";
import { DropdownHeader } from "./dropdown_header/dropdown_header.tsx";
import { CreateSampleAction } from "./create_sample_action.ts";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { useVirtualizer } from "@tanstack/react-virtual";

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
    setPresets
}: MenuListProps) {
    const [open, setOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPresets, setShowPresets] = useState(view instanceof BasicPreset);
    const [showInstruments, setShowInstruments] = useState(
        view instanceof BasicInstrument
    );
    const [showSamples, setShowSamples] = useState(view instanceof BasicSample);
    const { t } = useTranslation();
    const setView = useCallback(
        (v: BankEditView) => {
            sv(v);
        },
        [sv]
    );
    // make it compile
    void setInstruments;
    void setPresets;
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

            // match samples directly
            samples.forEach((s) => {
                if (s.sampleName.toLowerCase().includes(searchQueryLower)) {
                    matchedSampleSet.add(s);
                }
            });

            // match instruments directly or via matched samples
            instruments.forEach((i) => {
                const sampleMatch = i.instrumentZones.some((z) =>
                    matchedSampleSet.has(z.sample)
                );
                const nameMatch = i.instrumentName
                    .toLowerCase()
                    .includes(searchQueryLower);

                if (sampleMatch || nameMatch) {
                    matchedInstrumentSet.add(i);
                    i.instrumentZones.forEach((z) =>
                        matchedSampleSet.add(z.sample)
                    );
                }
            });

            // match presets directly or via matched instruments
            presetNameMap.forEach((p) => {
                const instMatch = p.preset.presetZones.some((z) =>
                    matchedInstrumentSet.has(z.instrument)
                );
                const nameMatch = p.searchString.includes(searchQueryLower);

                if (instMatch || nameMatch) {
                    matchedPresetSet.add(p);
                    p.preset.presetZones.forEach((z) =>
                        matchedInstrumentSet.add(z.instrument)
                    );
                }
            });

            // backfill their instruments' samples
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

    const addSample = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = async () => {
            const file = input?.files?.[0];
            if (!file) {
                return;
            }
            const buffer = await file.arrayBuffer();
            const audioBuffer = await engine.context.decodeAudioData(buffer);
            const out = audioBuffer.getChannelData(0);
            let sampleName = file.name;
            const lastDotIndex = sampleName.lastIndexOf(".");
            if (lastDotIndex !== -1) {
                sampleName = sampleName.substring(0, lastDotIndex);
            }
            sampleName = sampleName.substring(0, 19);

            const sample = new BasicSample(
                sampleName + (audioBuffer.numberOfChannels > 1 ? "L" : ""),
                audioBuffer.sampleRate,
                60,
                0,
                sampleTypes.monoSample,
                0,
                out.length - 1
            );
            sample.setAudioData(out);
            const actions = [
                new CreateSampleAction(
                    sample,
                    setSamples,
                    samples.length - 1,
                    setView
                )
            ];
            // add the stereo sample if more channels
            if (audioBuffer.numberOfChannels > 1) {
                const otherOut = audioBuffer.getChannelData(1);
                const sample2 = new BasicSample(
                    sampleName + "R",
                    audioBuffer.sampleRate,
                    60,
                    0,
                    sampleTypes.monoSample,
                    0,
                    out.length - 1
                );
                sample2.setAudioData(otherOut);
                sample2.setLinkedSample(sample, sampleTypes.rightSample);
                actions.push(
                    new CreateSampleAction(
                        sample2,
                        setSamples,
                        samples.length,
                        setView
                    )
                );
            }
            manager.modifyBank(actions);
            setShowSamples(true);
        };
        input.click();
    };

    const samplesOpen = showSamples;
    const instrumentsOpen = showInstruments;
    const presetsOpen = showPresets;

    const ESTIMATED_ROW_HEIGHT = 30;
    const OVERSCAN = 5;
    // virtualize everything
    const samplesParentRef = useRef<HTMLDivElement>(null);
    const samplesVirtualizer = useVirtualizer({
        count: filteredSamples.length,
        getScrollElement: () => samplesParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    const instrumentsParentRef = useRef<HTMLDivElement>(null);
    const instrumentsVirtualizer = useVirtualizer({
        count: filteredInstruments.length,
        getScrollElement: () => instrumentsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    const presetsParentRef = useRef<HTMLDivElement>(null);
    const presetsVirtualizer = useVirtualizer({
        count: filteredPresets.length,
        getScrollElement: () => presetsParentRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        overscan: OVERSCAN
    });

    if (!open) {
        return (
            <div className={"menu_list_closed"} onClick={() => setOpen(true)}>
                {"\u25B6"}
            </div>
        );
    }

    const setSample = (s: BasicSample) => setView(s);
    const setInstrument = (i: BasicInstrument) => setView(i);

    return (
        <div className={"menu_list_main"}>
            <div
                onClick={() => setView("info")}
                className={`item_group_header ${view === "info" ? "opened" : ""}`}
            >
                <h2>{t("presetList.overview")}</h2>
                <div
                    className={"dropdown_button"}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setOpen(false);
                    }}
                >
                    {"\u25C0"}
                </div>
            </div>

            <DropdownHeader
                onAdd={addSample}
                onClick={() => setShowSamples(!showSamples)}
                text={t("presetList.samples")}
                open={showSamples}
            />
            {samplesOpen && (
                <div className="menu_list_scrollable" ref={samplesParentRef}>
                    <div
                        className="item_group"
                        style={{
                            height: `${samplesVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {samplesVirtualizer.getVirtualItems().map((row) => {
                            const sample = filteredSamples[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={samplesVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <SampleDisplay
                                        view={view}
                                        sample={sample}
                                        onClick={() => setView(sample)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <DropdownHeader
                onAdd={() => console.log("add instrument")}
                onClick={() => setShowInstruments(!showInstruments)}
                open={instrumentsOpen}
                text={t("presetList.instruments")}
            />
            {instrumentsOpen && (
                <div
                    className={"menu_list_scrollable"}
                    ref={instrumentsParentRef}
                >
                    <div
                        className={"item_group"}
                        style={{
                            height: `${instrumentsVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {instrumentsVirtualizer.getVirtualItems().map((row) => {
                            const inst = filteredInstruments[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={instrumentsVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <InstrumentDisplay
                                        view={view}
                                        instrument={inst}
                                        onClick={() => setView(inst)}
                                        selectSample={setSample}
                                    ></InstrumentDisplay>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <DropdownHeader
                onAdd={() => console.log("add preset")}
                onClick={() => setShowPresets(!showPresets)}
                open={presetsOpen}
                text={t("presetList.presets")}
            />
            {presetsOpen && (
                <div className={"menu_list_scrollable"} ref={presetsParentRef}>
                    <div
                        className={"item_group"}
                        style={{
                            height: `${presetsVirtualizer.getTotalSize()}px`
                        }}
                    >
                        {presetsVirtualizer.getVirtualItems().map((row) => {
                            const p = filteredPresets[row.index];
                            return (
                                <div
                                    key={row.key}
                                    ref={presetsVirtualizer.measureElement}
                                    data-index={row.index}
                                    className={"virtual_item"}
                                    style={{
                                        transform: `translateY(${row.start}px)`
                                    }}
                                >
                                    <PresetDisplay
                                        onClick={() => setView(p.preset)}
                                        p={p}
                                        selectInstrument={setInstrument}
                                        selectSample={setSample}
                                        view={view}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
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
    );
});
