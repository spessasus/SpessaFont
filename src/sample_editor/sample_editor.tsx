import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    generatorTypes,
    type SampleType,
    sampleTypes
} from "spessasynth_core";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import "./sample_editor.css";
import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import { WaveView } from "./wave_view/wave_view.tsx";
import SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { KEYBOARD_TARGET_CHANNEL } from "../keyboard/target_channel.ts";
import { WaitingInput } from "../fancy_inputs/waiting_input/waiting_input.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { TypeSelector } from "./type_selector/type_selector.tsx";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import { SampleTools } from "./sample_tools.tsx";
import { midiNoteToPitchClass } from "../utils/note_name.ts";

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 192000;

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

interface SampleEditorProps {
    manager: SoundBankManager;
    sample: BasicSample;
    engine: AudioEngine;
    setView: SetViewType;
    setSamples: (s: BasicSample[]) => void;
    samples: BasicSample[];
}

export const SampleEditor = React.memo(function ({
    engine,
    sample,
    setView,
    manager,
    setSamples,
    samples
}: SampleEditorProps) {
    const { t } = useTranslation();
    const [sampleData, setSampleDataLocal] = useState(sample.getAudioData());

    useEffect(() => {
        setSampleDataLocal(sample.getAudioData());
    }, [sample]);

    const setSampleData = (data: Float32Array, rate: number) => {
        setSampleRate(rate);
        sample.setAudioData(data, rate);
        setSampleDataLocal(data);
    };

    const updateSamples = useCallback(
        () => setSamples([...samples]),
        [samples, setSamples]
    );

    // make the sample playable
    useEffect(() => {
        const preset = new BasicPreset(manager);
        preset.name = "Sample Dummy Preset";
        const instrument = new BasicInstrument();
        instrument.name = "Sample Dummy Instrument";
        preset.createZone(instrument);
        // unlink here as we don't want to mark it as linked
        // hacky, but works
        instrument.unlinkFrom(preset);
        const instZone = instrument.createZone(sample);
        // unlink here as we don't want to mark it as linked
        sample.unlinkFrom(instrument);
        instZone.setGenerator(generatorTypes.sampleModes, 1);
        engine.processor.midiChannels[KEYBOARD_TARGET_CHANNEL].preset = preset;

        engine.processor.clearCache();
        return () => {
            engine.processor.clearCache();
            if (manager?.presets?.length > 0) {
                engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
            }
        };
    }, [engine.processor, engine.processor.midiChannels, manager, sample]);

    const sampleType = sample.sampleType;
    const linkedSample = sample.linkedSample;

    const setLinkedSample = (type: SampleType, s?: BasicSample) => {
        // no need to use two actions a setSampleType automatically adjusts the second sample
        const action = [
            new SetSampleTypeAction(
                sample,
                sample.linkedSample,
                sample.sampleType,
                s,
                type,
                () => setSamples([...samples])
            )
        ];
        manager.modifyBank(action);
    };

    const changeSampleProp = useCallback(
        function <K extends keyof BasicSample>(
            prop: K,
            oldValue: BasicSample[K],
            newValue: BasicSample[K]
        ) {
            const actions = [
                new EditSampleAction(
                    sample,
                    prop,
                    oldValue,
                    newValue,
                    updateSamples
                )
            ];
            if (linkedSample) {
                actions.push(
                    new EditSampleAction(
                        linkedSample,
                        prop,
                        linkedSample[prop],
                        newValue,
                        updateSamples
                    )
                );
            }
            manager.modifyBank(actions);
        },
        [linkedSample, manager, sample, updateSamples]
    );

    const loopStart = sample.loopStart;
    const setLoopStart = (newStart: number) => {
        newStart = Math.max(
            Math.min(newStart, loopEnd, sampleData.length - 1),
            0
        );
        if (newStart === loopStart) {
            return newStart;
        }
        changeSampleProp("loopStart", loopStart, newStart);
        return newStart;
    };

    const loopEnd = sample.loopEnd;
    const setLoopEnd = (newEnd: number) => {
        newEnd = Math.min(
            Math.max(newEnd, loopStart, 0),
            sampleData.length - 1
        );
        if (newEnd === loopEnd) {
            return newEnd;
        }
        changeSampleProp("loopEnd", loopEnd, newEnd);
        return newEnd;
    };
    const sampleName = sample.name;
    const setName = (n: string) => {
        if (n === sampleName) {
            return n;
        }
        n = n.substring(0, 39); // keep spare space for "R" or "L"
        if (n.endsWith("R") || n.endsWith("L")) {
            n = n.substring(0, n.length - 1);
        }
        let newName = n;

        // automatically add "R" or "L" for linked stereo samples, making sure to do so for the other linked sample
        if (linkedSample) {
            if (sample.sampleType === sampleTypes.rightSample) {
                newName += "R";
            } else if (sample.sampleType === sampleTypes.leftSample) {
                newName += "L";
            }
        }

        const actions = [
            new EditSampleAction(
                sample,
                "name",
                sampleName,
                newName,
                updateSamples
            )
        ];
        if (linkedSample) {
            let secondNewName = n;
            if (sample.sampleType === sampleTypes.rightSample) {
                secondNewName += "L";
            } else if (sample.sampleType === sampleTypes.leftSample) {
                secondNewName += "R";
            }
            actions.push(
                new EditSampleAction(
                    linkedSample,
                    "name",
                    linkedSample.name,
                    secondNewName,
                    updateSamples
                )
            );
        }

        manager.modifyBank(actions);
        return newName;
    };

    const sampleRate = sample.sampleRate;
    const setSampleRate = (newRate: number) => {
        newRate = Math.min(MAX_SAMPLE_RATE, Math.max(newRate, MIN_SAMPLE_RATE));
        if (newRate === sampleRate) {
            return newRate;
        }
        changeSampleProp("sampleRate", sampleRate, newRate);
        return newRate;
    };

    const originalKey = sample.originalKey;
    const setOriginalKey = (newKey: number) => {
        newKey = Math.min(127, Math.max(0, Math.floor(newKey)));
        if (newKey === originalKey) {
            return newKey;
        }
        changeSampleProp("originalKey", originalKey, newKey);
        return newKey;
    };

    const centCorrection = sample.pitchCorrection;
    const setCentCorrection = (newTune: number) => {
        newTune = Math.min(99, Math.max(-99, Math.floor(newTune)));
        if (newTune === centCorrection) {
            return newTune;
        }
        changeSampleProp("pitchCorrection", centCorrection, newTune);
        return newTune;
    };

    const [playerState, setPlayerState] =
        useState<SamplePlayerState>("stopped");
    const [playbackStart, setPlaybackStart] = useState(0);
    const [loading, setLoading] = useState(false);
    const [zoom, setZoom] = useState(1);

    return (
        <div className={"sample_editor"}>
            <WaveView
                disabled={loading}
                zoom={zoom}
                setLoopStart={setLoopStart}
                setLoopEnd={setLoopEnd}
                data={sampleData}
                loopStart={loopStart}
                loopEnd={loopEnd}
                sampleRate={sampleRate}
                context={engine.context}
                playerState={playerState}
                playbackStartTime={playbackStart}
                centCorrection={centCorrection}
            ></WaveView>
            <div className={"info_column"}>
                <WaitingInput
                    setValue={setName}
                    value={sampleName}
                    maxLength={40}
                    className={"pretty_input sample_name monospaced"}
                    placeholder={t("sampleLocale.name")}
                />
                <div className={"info_split"}>
                    <div className={"info_column"}>
                        <div className={"info_column"}>
                            <div className={"info_field"}>
                                <span>{t("sampleLocale.sampleRate")}</span>
                                <WaitingInput
                                    setValue={setSampleRate}
                                    value={sampleRate}
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={MIN_SAMPLE_RATE}
                                    max={MAX_SAMPLE_RATE}
                                    placeholder={t("sampleLocale.sampleRate")}
                                ></WaitingInput>
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.loopStart")}</span>
                                <WaitingInput
                                    setValue={setLoopStart}
                                    value={loopStart}
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={0}
                                    max={loopEnd}
                                    placeholder={t("sampleLocale.loopStart")}
                                ></WaitingInput>
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.loopEnd")}</span>
                                <WaitingInput
                                    setValue={setLoopEnd}
                                    value={loopEnd}
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={loopStart}
                                    max={sampleData.length - 1}
                                    placeholder={t("sampleLocale.loopEnd")}
                                ></WaitingInput>
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.originalKey")}</span>
                                <WaitingInput
                                    setValue={setOriginalKey}
                                    value={originalKey}
                                    className={"pretty_input monospaced"}
                                    maxLength={7}
                                    suffix={` (${midiNoteToPitchClass(originalKey)})`}
                                    style={{ width: "5rem" }}
                                    placeholder={t("sampleLocale.originalKey")}
                                ></WaitingInput>
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.centCorrection")}</span>
                                <WaitingInput
                                    setValue={setCentCorrection}
                                    value={centCorrection}
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={-99}
                                    max={127}
                                    placeholder={t(
                                        "sampleLocale.centCorrection"
                                    )}
                                ></WaitingInput>
                            </div>

                            <TypeSelector
                                sampleType={sampleType}
                                setLinkedSample={setLinkedSample}
                                linkedSample={linkedSample}
                                sample={sample}
                                samples={manager.samples}
                            ></TypeSelector>
                        </div>
                    </div>
                    <SampleTools
                        loading={loading}
                        setLoading={setLoading}
                        zoom={zoom}
                        setZoom={setZoom}
                        playerState={playerState}
                        setPlayerState={setPlayerState}
                        setPlaybackStart={setPlaybackStart}
                        sample={sample}
                        engine={engine}
                        setLoopStart={setLoopStart}
                        setLoopEnd={setLoopEnd}
                        sampleData={sampleData}
                        setSampleData={setSampleData}
                    />
                </div>
                <LinkedInstruments
                    manager={manager}
                    setSamples={setSamples}
                    sample={sample}
                    setView={setView}
                ></LinkedInstruments>
            </div>
        </div>
    );
});
