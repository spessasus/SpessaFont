import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    sampleTypes
} from "spessasynth_core";
import { useCallback, useMemo, useState } from "react";
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

export type MappedPresetType = { searchString: string; preset: BasicPreset };

export function MenuList({
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
}: {
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
}) {
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
    console.log(setInstruments, setPresets);
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
    const searchQueryLower = searchQuery.toLowerCase();
    const filteredSamples = useMemo(
        () =>
            searchQueryLower === ""
                ? samples
                : samples.filter((s) =>
                      s.sampleName.toLowerCase().includes(searchQueryLower)
                  ),
        [searchQueryLower, samples]
    );
    const filteredInstruments = useMemo(
        () =>
            searchQueryLower === ""
                ? instruments
                : instruments.filter(
                      (i) =>
                          i.instrumentZones.find((z) =>
                              filteredSamples.includes(z.sample)
                          ) ||
                          i.instrumentName
                              .toLowerCase()
                              .includes(searchQueryLower)
                  ),
        [searchQueryLower, instruments, filteredSamples]
    );

    const filteredPresets = useMemo(
        () =>
            searchQueryLower === ""
                ? presetNameMap
                : presetNameMap.filter(
                      (p) =>
                          p.preset.presetZones.find((z) =>
                              filteredInstruments.includes(z.instrument)
                          ) || p.searchString.includes(searchQueryLower)
                  ),
        [filteredInstruments, presetNameMap, searchQueryLower]
    );

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

    const samplesGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredSamples.map((s, i) => (
                    <SampleDisplay
                        selected={view === s}
                        sampleName={s.sampleName}
                        onClick={() => setView(s)}
                        key={i}
                    ></SampleDisplay>
                ))}
            </div>
        ),
        [filteredSamples, setView, view]
    );

    const instrumentsGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredInstruments.map((inst, i) => (
                    <InstrumentDisplay
                        view={view}
                        instrument={inst}
                        onClick={() => setView(inst)}
                        selectSample={(s) => setView(s)}
                        key={i}
                    ></InstrumentDisplay>
                ))}
            </div>
        ),
        [filteredInstruments, view, setView]
    );

    const presetsGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredPresets.map((p, i) => (
                    <PresetDisplay
                        view={view}
                        onClick={() => setView(p.preset)}
                        p={p}
                        selectInstrument={(i) => setView(i)}
                        selectSample={(s) => setView(s)}
                        key={i}
                    ></PresetDisplay>
                ))}
            </div>
        ),
        [filteredPresets, setView, view]
    );

    const samplesOpen = showSamples;
    const instrumentsOpen = showInstruments;
    const presetsOpen = showPresets;

    return (
        <div className={"menu_list_main"}>
            <div className={"menu_list_scrollable"}>
                <div
                    onClick={() => setView("info")}
                    className={`item_group_header ${view === "info" ? "opened" : ""}`}
                >
                    <h2>{t("presetList.overview")}</h2>
                </div>

                <DropdownHeader
                    onAdd={addSample}
                    onClick={() => setShowSamples(!showSamples)}
                    text={t("presetList.samples")}
                    open={showSamples}
                />
                {samplesOpen && samplesGroup}

                <DropdownHeader
                    onAdd={() => console.log("add instrument")}
                    onClick={() => setShowInstruments(!showInstruments)}
                    open={instrumentsOpen}
                    text={t("presetList.instruments")}
                />
                {instrumentsOpen && instrumentsGroup}

                <DropdownHeader
                    onAdd={() => console.log("add preset")}
                    onClick={() => setShowPresets(!showPresets)}
                    open={presetsOpen}
                    text={t("presetList.presets")}
                />
                {presetsOpen && presetsGroup}
            </div>
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
}
