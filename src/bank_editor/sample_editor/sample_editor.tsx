import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    generatorTypes,
    sampleTypes,
    type SampleTypeValue
} from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import "./sample_editor.css";
import * as React from "react";
import {
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";
import { WaveView } from "./wave_view/wave_view.tsx";
import SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { audioBufferToWav } from "spessasynth_lib";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { TypeSelector } from "./type_selector/type_selector.tsx";
import type { SetViewType } from "../bank_editor.tsx";
import { SetSampleTypeAction } from "./set_sample_type_action.ts";
import { EditSampleAction } from "./edit_sample_action.ts";
import type { MenuListRef } from "../../menu_list/menu_list.tsx";

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;
const DEFAULT_SAMPLE_GAIN = 0.4;
const ZOOM_PER_SAMPLE = 50000 / 6_000_000;

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

type SampleEditorProps = {
    manager: SoundBankManager;
    sample: BasicSample;
    engine: AudioEngine;
    setView: SetViewType;
    setSamples: (s: BasicSample[]) => void;
    samples: BasicSample[];
    menuRef: RefObject<MenuListRef | null>;
};

export const SampleEditor = React.memo(function ({
    engine,
    sample,
    setView,
    manager,
    setSamples,
    samples,
    menuRef
}: SampleEditorProps) {
    const { t } = useTranslation();
    const sampleIndex = useMemo(
        () => samples.indexOf(sample),
        [samples, sample]
    );
    const [sampleData, setSampleDataInternal] = useState(sample.getAudioData());
    const setSampleData = (data: Float32Array, rate: number) => {
        setSampleRate(rate);
        setLoopStart(0);
        setLoopEnd(data.length - 1);
        sample.setAudioData(data);
        setSampleDataInternal(data);
    };
    const [zoom, setZoom] = useState(1);
    const [inputZoom, setInputZoom] = useState(100);

    // make the sample playable
    useEffect(() => {
        engine.processor.clearCache();
        const preset = new BasicPreset(manager.bank);
        preset.presetName = "Sample Dummy Preset";
        const instrument = new BasicInstrument();
        instrument.instrumentName = "Sample Dummy instrument";
        preset.createZone().setInstrument(instrument);
        const instZone = instrument.createZone();
        instZone.setGenerator(generatorTypes.sampleModes, 1);
        // do not use setSample() here as we don't want to mark it as linked
        instZone.sample = sample;
        engine.processor.midiAudioChannels[KEYBOARD_TARGET_CHANNEL].setPreset(
            preset
        );
        return () => {
            engine.processor.clearCache();
            engine.processor.programChange(KEYBOARD_TARGET_CHANNEL, 0);
        };
    }, [
        engine.processor,
        engine.processor.midiAudioChannels,
        manager.bank,
        sample
    ]);

    const [sampleType, setSampleTypeInternal] = useState(
        sample.sampleType as SampleTypeValue
    );
    const [linkedSample, setLinkedSampleInternal] = useState(
        sample.linkedSample
    );
    const setLinkedSample = (type: SampleTypeValue, s?: BasicSample) => {
        // no need to use two actions a setSampleType automatically adjusts the second sample
        const action = [
            new SetSampleTypeAction(
                sampleIndex,
                sample.linkedSample,
                sample.sampleType,
                s,
                type
            )
        ];
        manager.modifyBank(action);
        setSampleTypeInternal(sample.sampleType);
        setLinkedSampleInternal(s);
    };
    const linkedIndex = useMemo(
        () => (linkedSample ? samples.indexOf(linkedSample) : -1),
        [samples, linkedSample]
    );

    const changeSampleProp = useCallback(
        function <K extends keyof BasicSample>(
            prop: K,
            oldValue: BasicSample[K],
            newValue: BasicSample[K]
        ) {
            const oldVal: Partial<BasicSample> = {};
            oldVal[prop] = oldValue;
            const newVal: Partial<BasicSample> = {};
            newVal[prop] = newValue;
            const actions = [new EditSampleAction(sampleIndex, oldVal, newVal)];
            if (linkedSample) {
                const oldLinkedVal: Partial<BasicSample> = {};
                oldLinkedVal[prop] = linkedSample[prop];
                actions.push(new EditSampleAction(linkedIndex, oldVal, newVal));
            }
            manager.modifyBank(actions);
        },
        [linkedIndex, linkedSample, manager, sampleIndex]
    );

    const [loopStart, setLoopStartInternal] = useState(
        sample.sampleLoopStartIndex
    );
    const setLoopStart = (newStart: number) => {
        newStart = Math.min(newStart, loopEnd, sampleData.length - 1);
        if (newStart === loopStart) {
            return newStart;
        }
        changeSampleProp("sampleLoopStartIndex", loopStart, newStart);
        setLoopStartInternal(newStart);
        return newStart;
    };

    const [loopEnd, setLoopEndInternal] = useState(sample.sampleLoopEndIndex);
    const setLoopEnd = (newEnd: number) => {
        newEnd = Math.max(newEnd, loopStart, 0);
        if (newEnd === loopEnd) {
            return newEnd;
        }
        changeSampleProp("sampleLoopEndIndex", loopEnd, newEnd);
        setLoopEndInternal(newEnd);
        return newEnd;
    };
    const [name, setNameInternal] = useState(sample.sampleName);
    const setName = (n: string) => {
        if (n === name) {
            return;
        }
        n = n.substring(0, 19); // keep spare space for "R" or "L"
        if (n[n.length - 1] === "R" || n[n.length - 1] === "L") {
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
                sampleIndex,
                { sampleName: name },
                { sampleName: newName }
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
                    linkedIndex,
                    { sampleName: linkedSample.sampleName },
                    { sampleName: secondNewName }
                )
            );
        }

        manager.modifyBank(actions);
        setNameInternal(n);
        menuRef?.current?.updateMenuList();
    };

    const [sampleRate, setSampleRateInternal] = useState(sample.sampleRate);
    const setSampleRate = (newRate: number) => {
        newRate = Math.min(MAX_SAMPLE_RATE, Math.max(newRate, MIN_SAMPLE_RATE));
        if (newRate === sampleRate) {
            return newRate;
        }
        changeSampleProp("sampleRate", sampleRate, newRate);
        setSampleRateInternal(newRate);
        return newRate;
    };

    const [originalKey, setOriginalKeyInternal] = useState(sample.samplePitch);
    const setOriginalKey = (newKey: number) => {
        newKey = Math.min(127, Math.max(0, Math.floor(newKey)));
        if (newKey === originalKey) {
            return newKey;
        }
        changeSampleProp("samplePitch", originalKey, newKey);
        setOriginalKeyInternal(newKey);
        return newKey;
    };

    const [centCorrection, setCentCorrectionInternal] = useState(
        sample.samplePitchCorrection
    );
    const setCentCorrection = (newTune: number) => {
        newTune = Math.min(99, Math.max(-99, Math.floor(newTune)));
        if (newTune === centCorrection) {
            return newTune;
        }
        changeSampleProp("samplePitchCorrection", centCorrection, newTune);
        setCentCorrectionInternal(newTune);
        return newTune;
    };

    const buffer = useMemo(() => {
        const buf = engine.context.createBuffer(
            1,
            sampleData.length,
            sampleRate
        );
        buf.getChannelData(0).set(sampleData);
        return buf;
    }, [engine.context, sampleRate, sampleData]);

    const [playerState, setPlayerState] =
        useState<SamplePlayerState>("stopped");
    const playerRef = useRef<AudioBufferSourceNode | null>(null);
    const [playbackStart, setPlaybackStart] = useState(0);

    const stopSampleInternal = () => {
        if (playerRef.current) {
            try {
                playerRef.current.stop();
            } catch (e) {
                console.warn("audio already stopped or invalid", e);
            }
            playerRef.current.disconnect();
        }
    };

    // stop and clean up on unmounting
    useEffect(() => {
        return stopSampleInternal;
    }, []);

    const playSample = (loop: boolean) => {
        stopSampleInternal();
        const player = engine.context.createBufferSource();
        player.detune.value = centCorrection;
        player.buffer = buffer;
        player.onended = stopPlayer;
        playerRef.current = player;
        if (loop) {
            player.loopStart = loopStart / sampleRate;
            player.loopEnd = loopEnd / sampleRate;
            player.loop = true;
        }

        const gain = new GainNode(engine.context, {
            gain: DEFAULT_SAMPLE_GAIN
        });
        player.connect(gain).connect(engine.targetNode);
        setPlaybackStart(engine.context.currentTime - 0.1);
        player.start();
        setPlayerState(loop ? "playing_loop" : "playing");
    };

    const stopPlayer = () => {
        stopSampleInternal();
        setPlaybackStart(-1);
        setPlayerState("stopped");
    };

    const exportWav = () => {
        const blob = audioBufferToWav(buffer, false);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${name}.wav`;
        console.info(a);
        a.click();
    };

    const [importError, setImportError] = useState("");
    const [loading, setLoading] = useState(false);
    const replaceData = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "audio/*";
        input.onchange = async () => {
            const file = input?.files?.[0];
            if (!file) {
                return;
            }
            stopSampleInternal();
            setImportError("");
            setLoading(true);
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await engine.context.decodeAudioData(
                    await file.arrayBuffer()
                );
            } catch {
                setImportError(t("sampleLocale.tools.invalidAudioFile"));
                return;
            } finally {
                setLoading(false);
            }

            if (audioBuffer.numberOfChannels === 2) {
                // check for linked sample
                if (
                    (sampleType === sampleTypes.leftSample ||
                        sampleType === sampleTypes.rightSample) &&
                    linkedSample
                ) {
                    const left = audioBuffer.getChannelData(0);
                    const right = audioBuffer.getChannelData(1);
                    const linked = linkedSample;

                    if (sampleType === sampleTypes.leftSample) {
                        linked.setAudioData(right);
                        linked.sampleRate = audioBuffer.sampleRate;
                        linked.sampleLoopStartIndex = 0;
                        linked.sampleLoopEndIndex = right.length - 1;

                        setSampleData(left, audioBuffer.sampleRate);
                    } else {
                        linked.setAudioData(left);
                        linked.sampleRate = audioBuffer.sampleRate;
                        linked.sampleLoopStartIndex = 0;
                        linked.sampleLoopEndIndex = left.length - 1;

                        setSampleData(right, audioBuffer.sampleRate);
                    }
                } else {
                    const finalData = new Float32Array(audioBuffer.length);
                    // mix down to mono
                    const buffers: Float32Array[] = [];
                    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                        buffers.push(audioBuffer.getChannelData(i));
                    }
                    for (let i = 0; i < audioBuffer.length; i++) {
                        const sum = buffers.reduce((s, buf) => s + buf[i], 0);
                        finalData[i] = sum / audioBuffer.numberOfChannels;
                    }
                    setSampleData(finalData, audioBuffer.sampleRate);
                }
            } else if (audioBuffer.numberOfChannels === 1) {
                audioBuffer.copyFromChannel(audioBuffer.getChannelData(0), 0);
            } else {
                setImportError(t("sampleLocale.tools.tooManyChannels"));
            }
        };
        input.click();
    };

    const maxZoom = Math.max(5, ZOOM_PER_SAMPLE * sampleData.length + 1);

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
            ></WaveView>
            <div className={"info_column"}>
                <div className={"info_split"}>
                    <div className={"info_column"}>
                        <input
                            className={"pretty_input sample_name monospaced"}
                            defaultValue={name}
                            maxLength={40}
                            placeholder={t("sampleLocale.sampleName")}
                            onBlur={(e) => setName(e.target.value)}
                        />
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
                                    type={"number"}
                                    min={0}
                                    max={127}
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
                                samples={manager.bank.samples}
                            ></TypeSelector>
                        </div>
                    </div>
                    <div className={`info_column ${loading ? "disabled" : ""}`}>
                        <h2>{t("sampleLocale.tools.title")}</h2>
                        <div className={"info_column tools"}>
                            <div
                                className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                                onClick={exportWav}
                            >
                                {t("sampleLocale.tools.wavExport")}
                            </div>
                            {playerState === "stopped" && (
                                <>
                                    <div
                                        className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                                        onClick={() => playSample(false)}
                                    >
                                        {t("sampleLocale.tools.play")}
                                    </div>

                                    <div
                                        className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                                        onClick={() => playSample(true)}
                                    >
                                        {t("sampleLocale.tools.playLooped")}
                                    </div>
                                </>
                            )}
                            {playerState !== "stopped" && (
                                // duplicated to match the count of play buttons
                                <>
                                    <div
                                        className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                                        onClick={stopPlayer}
                                    >
                                        {t("sampleLocale.tools.stop")}
                                    </div>
                                    <div
                                        className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                                        onClick={stopPlayer}
                                    >
                                        {t("sampleLocale.tools.stop")}
                                    </div>
                                </>
                            )}
                            <div
                                onClick={replaceData}
                                className={`pretty_button ${!loading ? "responsive_button hover_brightness" : ""}`}
                            >
                                {loading
                                    ? t("sampleLocale.tools.loading")
                                    : importError ||
                                      t("sampleLocale.tools.replaceAudio")}
                            </div>

                            <ControllerRange
                                max={(maxZoom - 1) * 100}
                                min={100}
                                onChange={(n) => {
                                    n /= 100;
                                    const mapped = (n - 1) / (maxZoom - 1);
                                    const exped = Math.pow(mapped, 5);
                                    setZoom(exped * (maxZoom - 1) + 1);
                                    setInputZoom(n * 100);
                                }}
                                value={inputZoom}
                                text={`${t("sampleLocale.waveZoom")}: ${Math.floor(
                                    zoom * 100
                                )}%`}
                            ></ControllerRange>
                        </div>
                    </div>
                </div>
                <LinkedInstruments
                    manager={manager}
                    samples={samples}
                    setSamples={setSamples}
                    sample={sample}
                    setView={setView}
                ></LinkedInstruments>
            </div>
        </div>
    );
});
