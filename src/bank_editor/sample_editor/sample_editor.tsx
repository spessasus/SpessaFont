import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    generatorTypes
} from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import "./sample_editor.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { WaveView } from "./wave_view/wave_view.tsx";
import SoundBankManager, {
    type BankEditView
} from "../../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { audioBufferToWav } from "spessasynth_lib";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";
import { SampleControl } from "./sample_control/sample_control.tsx";
import { LinkedInstruments } from "./linked_instruments/linked_instruments.tsx";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;
const DEFAULT_SAMPLE_GAIN = 0.4;
const ZOOM_PER_SAMPLE = 5000 / 6_000_000;

const sampleTypes = {
    mono: 0,
    right: 2,
    left: 4,
    linked: 8,
    romMono: 32769,
    romRight: 32770,
    romLeft: 32772,
    romLinked: 32776
};

type SampleType = keyof typeof sampleTypes;
type SampleTypeValue = (typeof sampleTypes)[SampleType];

export type SamplePlayerState = "stopped" | "playing" | "playing_loop";

export function SampleEditor({
    engine,
    sample,
    setView,
    manager
}: {
    manager: SoundBankManager;
    sample: BasicSample;
    engine: AudioEngine;
    setView: (v: BankEditView) => void;
}) {
    const { t } = useTranslation();
    const [sampleData, setSampleDataInternal] = useState(sample.getAudioData());
    const setSampleData = (data: Float32Array, rate: number) => {
        setSampleRate(rate);
        setLoopStart(0);
        setLoopEnd(data.length - 1);
        sample.setAudioData(data);
        setSampleDataInternal(data);
    };

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

    const [loopStart, setLoopStartInternal] = useState(
        sample.sampleLoopStartIndex
    );
    const setLoopStart = (s: number) => {
        s = Math.floor(Math.min(s, loopEnd, sampleData.length - 1));
        sample.sampleLoopStartIndex = s;
        setLoopStartInternal(s);
        return s;
    };

    const [loopEnd, setLoopEndInternal] = useState(sample.sampleLoopEndIndex);
    const setLoopEnd = (e: number) => {
        e = Math.floor(Math.max(e, loopStart, 0));
        sample.sampleLoopEndIndex = e;
        setLoopEndInternal(e);
        return e;
    };
    const [name, setNameInternal] = useState(sample.sampleName);
    const setName = (n: string) => {
        sample.sampleName = n;
        setNameInternal(n);
    };

    const [sampleRate, setSampleRateInternal] = useState(sample.sampleRate);
    const setSampleRate = (r: number) => {
        const newRate = Math.min(MAX_SAMPLE_RATE, Math.max(r, MIN_SAMPLE_RATE));
        sample.sampleRate = newRate;
        setSampleRateInternal(newRate);
        return newRate;
    };

    const originalKey = sample.samplePitch;
    const setOriginalKey = (k: number) => {
        const key = Math.min(127, Math.max(0, Math.floor(k)));
        sample.samplePitch = key;
        return key;
    };

    const [centCorrection, setCentCorrectionInternal] = useState(
        sample.samplePitchCorrection
    );
    const setCentCorrection = (t: number) => {
        const tune = Math.min(99, Math.max(-99, Math.floor(t)));
        sample.samplePitchCorrection = tune;
        setCentCorrectionInternal(tune);
        return tune;
    };

    const [sampleType, setSampleTypeInternal] = useState(
        sample.sampleType as SampleTypeValue
    );
    const setSampleType = (t: SampleTypeValue) => {
        sample.sampleType = t;
        setSampleTypeInternal(t);
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

    const playSample = () => {
        stopSampleInternal();
        const player = engine.context.createBufferSource();
        player.detune.value = centCorrection;
        player.buffer = buffer;
        player.onended = stopPlayer;
        playerRef.current = player;

        const gain = new GainNode(engine.context, {
            gain: DEFAULT_SAMPLE_GAIN
        });
        player.connect(gain).connect(engine.targetNode);
        setPlaybackStart(engine.context.currentTime - 0.1);
        player.start();
        setPlayerState("playing");
    };

    const playLoop = () => {
        stopSampleInternal();
        const player = engine.context.createBufferSource();
        player.detune.value = centCorrection;
        player.buffer = buffer;
        player.loopStart = loopStart / sampleRate;
        player.loopEnd = loopEnd / sampleRate;
        player.loop = true;
        player.onended = stopPlayer;
        playerRef.current = player;

        const gain = new GainNode(engine.context, {
            gain: DEFAULT_SAMPLE_GAIN
        });
        player.connect(gain).connect(engine.targetNode);
        setPlaybackStart(engine.context.currentTime - 0.1);
        player.start();
        setPlayerState("playing_loop");
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
        console.log(a);
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
            if (audioBuffer.numberOfChannels < 0) {
                setImportError(t("sampleLocale.tools.notEnoughChannels"));
                return;
            }
            const finalData = new Float32Array(audioBuffer.length);
            if (audioBuffer.numberOfChannels > 1) {
                const buffers: Float32Array[] = [];
                for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
                    buffers.push(audioBuffer.getChannelData(i));
                }
                for (let i = 0; i < audioBuffer.length; i++) {
                    const sum = buffers.reduce((s, buf) => s + buf[i], 0);
                    finalData[i] = sum / audioBuffer.numberOfChannels;
                }
            } else {
                audioBuffer.copyFromChannel(finalData, 0);
            }

            setSampleData(finalData, audioBuffer.sampleRate);
        };
        input.click();
    };

    const [zoom, setZoom] = useState(1);
    const [inputZoom, setInputZoom] = useState(1);
    const maxZoom = ZOOM_PER_SAMPLE * sampleData.length + 1;

    return (
        <div className={"sample_editor"}>
            <WaveView
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
                            maxLength={20}
                            placeholder={t("sampleLocale.sampleName")}
                            onBlur={(e) => setName(e.target.value)}
                        />
                        <div className={"info_row"}>
                            <SampleControl
                                setValue={setSampleRate}
                                value={sampleRate}
                                name={t("sampleLocale.sampleRate")}
                                className={"pretty_input monospaced"}
                                type={"number"}
                                min={MIN_SAMPLE_RATE}
                                max={MAX_SAMPLE_RATE}
                                placeholder={t("sampleLocale.sampleRate")}
                            ></SampleControl>

                            <SampleControl
                                setValue={setLoopStart}
                                value={loopStart}
                                name={t("sampleLocale.loopStart")}
                                className={"pretty_input monospaced"}
                                type={"number"}
                                min={0}
                                max={loopEnd}
                                placeholder={t("sampleLocale.loopStart")}
                            ></SampleControl>

                            <SampleControl
                                setValue={setLoopEnd}
                                value={loopEnd}
                                name={t("sampleLocale.loopEnd")}
                                className={"pretty_input monospaced"}
                                type={"number"}
                                min={loopStart}
                                max={sampleData.length - 1}
                                placeholder={t("sampleLocale.loopEnd")}
                            ></SampleControl>

                            <SampleControl
                                setValue={setOriginalKey}
                                value={originalKey}
                                name={t("sampleLocale.originalKey")}
                                className={"pretty_input monospaced"}
                                type={"number"}
                                min={0}
                                max={12700} /* to even out the width */
                                placeholder={t("sampleLocale.originalKey")}
                            ></SampleControl>

                            <SampleControl
                                setValue={setCentCorrection}
                                value={centCorrection}
                                name={t("sampleLocale.centCorrection")}
                                className={"pretty_input monospaced"}
                                type={"number"}
                                min={-99}
                                max={12700} /* to even out the width */
                                placeholder={t("sampleLocale.centCorrection")}
                            ></SampleControl>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.type")}</span>
                                <select
                                    className={"pretty_input monospaced"}
                                    value={sampleType}
                                    onChange={(e) =>
                                        setSampleType(
                                            parseInt(
                                                e.target.value
                                            ) as SampleTypeValue
                                        )
                                    }
                                >
                                    <option value={sampleTypes.mono}>
                                        {t("sampleLocale.types.mono")}
                                    </option>
                                    <option value={sampleTypes.left}>
                                        {t("sampleLocale.types.left")}
                                    </option>
                                    <option value={sampleTypes.right}>
                                        {t("sampleLocale.types.right")}
                                    </option>
                                    <option value={sampleTypes.linked}>
                                        {t("sampleLocale.types.linked")}
                                    </option>

                                    <option
                                        disabled={true}
                                        value={sampleTypes.romMono}
                                    >
                                        {t("sampleLocale.types.romMono")}
                                    </option>
                                    <option
                                        disabled={true}
                                        value={sampleTypes.romLeft}
                                    >
                                        {t("sampleLocale.types.romLeft")}
                                    </option>
                                    <option
                                        disabled={true}
                                        value={sampleTypes.romRight}
                                    >
                                        {t("sampleLocale.types.romRight")}
                                    </option>
                                    <option
                                        disabled={true}
                                        value={sampleTypes.romLinked}
                                    >
                                        {t("sampleLocale.types.romLinked")}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className={"info_column"}>
                        <h2>{t("sampleLocale.tools.title")}</h2>
                        <div className={"info_column tools"}>
                            <div
                                className={
                                    "pretty_button responsive_button hover_brightness"
                                }
                                onClick={exportWav}
                            >
                                {t("sampleLocale.tools.wavExport")}
                            </div>
                            {playerState === "stopped" && (
                                <>
                                    <div
                                        className={
                                            "pretty_button responsive_button hover_brightness"
                                        }
                                        onClick={playSample}
                                    >
                                        {t("sampleLocale.tools.play")}
                                    </div>

                                    <div
                                        className={
                                            "pretty_button responsive_button hover_brightness"
                                        }
                                        onClick={playLoop}
                                    >
                                        {t("sampleLocale.tools.playLooped")}
                                    </div>
                                </>
                            )}
                            {playerState !== "stopped" && (
                                <div
                                    className={
                                        "pretty_button responsive_button hover_brightness"
                                    }
                                    onClick={stopPlayer}
                                >
                                    {t("sampleLocale.tools.stop")}
                                </div>
                            )}
                            <div
                                onClick={replaceData}
                                className={
                                    "pretty_button responsive_button hover_brightness"
                                }
                            >
                                {loading
                                    ? t("sampleLocale.tools.loading")
                                    : importError ||
                                      t("sampleLocale.tools.replaceAudio")}
                            </div>

                            <ControllerRange
                                max={maxZoom - 1}
                                min={1}
                                onChange={(n) => {
                                    const mapped = (n - 1) / (maxZoom - 1);
                                    const exped = Math.pow(mapped, 5);
                                    setZoom(exped * (maxZoom - 1) + 1);
                                    setInputZoom(n);
                                }}
                                value={inputZoom}
                                text={`${t("sampleLocale.waveZoom")}: ${Math.floor(zoom * 100)}%`}
                            ></ControllerRange>
                        </div>
                    </div>
                </div>
                <LinkedInstruments
                    sample={sample}
                    setView={setView}
                ></LinkedInstruments>
            </div>
        </div>
    );
}
