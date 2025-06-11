import {
    BasicInstrument,
    BasicPreset,
    BasicSample,
    BasicSoundBank
} from "spessasynth_core";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import "./menu_list.css";
import type { BankEditView } from "../core_backend/sound_bank_manager.ts";
import { PresetDisplay } from "./preset_display/preset_display.tsx";
import { InstrumentDisplay } from "./instrument_display/instrument_display.tsx";
import { SampleDisplay } from "./sample_display/sample_display.tsx";

export type MappedPresetType = { searchString: string; preset: BasicPreset };

export function MenuList({
    bank,
    view,
    sv
}: {
    bank: BasicSoundBank;
    view: BankEditView;
    sv: (v: BankEditView) => unknown;
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
            setSearchQuery("");
        },
        [sv]
    );

    const presets = bank.presets;
    const instruments = bank.instruments;
    const samples = bank.samples;

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
            samples.filter((s) =>
                s.sampleName.toLowerCase().includes(searchQueryLower)
            ),
        [searchQueryLower, samples]
    );
    const filteredInstruments = useMemo(
        () =>
            instruments.filter(
                (i) =>
                    i.instrumentZones.find((z) =>
                        filteredSamples.includes(z.sample)
                    ) ||
                    i.instrumentName.toLowerCase().includes(searchQueryLower)
            ),
        [searchQueryLower, instruments, filteredSamples]
    );

    const filteredPresets = useMemo(
        () =>
            presetNameMap.filter(
                (p) =>
                    p.preset.presetZones.find((z) =>
                        filteredInstruments.includes(z.instrument)
                    ) || p.searchString.includes(searchQueryLower)
            ),
        [filteredInstruments, presetNameMap, searchQueryLower]
    );

    const samplesGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredSamples.map((s, i) => (
                    <SampleDisplay
                        sample={s}
                        onClick={() => setView(s)}
                        key={i}
                    ></SampleDisplay>
                ))}
            </div>
        ),
        [filteredSamples, setView]
    );

    const instrumentsGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredInstruments.map((inst, i) => (
                    <InstrumentDisplay
                        instrument={inst}
                        onClick={() => setView(inst)}
                        selectSample={(s) => setView(s)}
                        key={i}
                    ></InstrumentDisplay>
                ))}
            </div>
        ),
        [setView, filteredInstruments]
    );

    const presetsGroup = useMemo(
        () => (
            <div className={"item_group"}>
                {filteredPresets.map((p, i) => (
                    <PresetDisplay
                        onClick={() => setView(p.preset)}
                        p={p}
                        selectInstrument={(i) => setView(i)}
                        selectSample={(s) => setView(s)}
                        key={i}
                    ></PresetDisplay>
                ))}
            </div>
        ),
        [filteredPresets, setView]
    );

    return (
        <div className={"menu_list_main"}>
            <div className={"menu_list_scrollable"}>
                <div
                    onClick={() => setView("info")}
                    className={`item_group_header ${view === "info" ? "opened" : ""}`}
                >
                    <h2>{t("presetList.overview")}</h2>
                </div>

                <div
                    onClick={() => setShowSamples(!showSamples)}
                    className={`item_group_header`}
                >
                    <h2>{t("presetList.samples")}</h2>
                    <div>{showSamples ? "\u25B2" : "\u25BC"}</div>
                </div>
                {showSamples && samplesGroup}

                <div
                    onClick={() => setShowInstruments(!showInstruments)}
                    className={`item_group_header`}
                >
                    <h2>{t("presetList.instruments")}</h2>
                    <div>{showInstruments ? "\u25B2" : "\u25BC"}</div>
                </div>
                {showInstruments && instrumentsGroup}

                <div
                    onClick={() => setShowPresets(!showPresets)}
                    className={`item_group_header`}
                >
                    <h2>{t("presetList.presets")}</h2>
                    <div>{showPresets ? "\u25B2" : "\u25BC"}</div>
                </div>
                {showPresets && presetsGroup}
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
