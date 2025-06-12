import {
    BasicInstrument,
    BasicPreset,
    type BasicSample,
    generatorTypes
} from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import "./sample_editor.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { WaveView } from "./wave_view.tsx";
import SoundBankManager, {
    type BankEditView
} from "../../core_backend/sound_bank_manager.ts";
import { useTranslation } from "react-i18next";
import { audioBufferToWav } from "spessasynth_lib";
import { KEYBOARD_TARGET_CHANNEL } from "../../keyboard/target_channel.ts";

const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 96000;
const DEFAULT_SAMPLE_GAIN = 0.4;

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

type SamplePlayerState = "stopped" | "playing" | "playing_loop";

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
    const sampleData = sample.getAudioData();

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
    const [lsText, setLsText] = useState(loopStart.toString());
    const setLoopStart = (s: number) => {
        s = Math.floor(Math.min(s, loopEnd, sampleData.length - 1));
        sample.sampleLoopStartIndex = s;
        setLoopStartInternal(s);
        setLsText(s.toString());
    };

    const [loopEnd, setLoopEndInternal] = useState(sample.sampleLoopEndIndex);
    const [leText, setLeText] = useState(loopEnd.toString());
    const setLoopEnd = (e: number) => {
        e = Math.floor(Math.max(e, loopStart, 0));
        sample.sampleLoopEndIndex = e;
        setLoopEndInternal(e);
        setLeText(e.toString());
    };
    const [name, setNameInternal] = useState(sample.sampleName);
    const setName = (n: string) => {
        sample.sampleName = n;
        setNameInternal(n);
    };

    const [sampleRate, setSampleRateInternal] = useState(sample.sampleRate);
    const [srText, setSrText] = useState(sample.sampleRate.toString());
    const setSampleRate = (r: number) => {
        const newRate = Math.min(MAX_SAMPLE_RATE, Math.max(r, MIN_SAMPLE_RATE));
        sample.sampleRate = newRate;
        setSampleRateInternal(newRate);
        setSrText(newRate.toString());
    };

    const originalKey = sample.samplePitch;
    const [okText, setOkText] = useState(originalKey.toString());
    const setOriginalKey = (k: number) => {
        const key = Math.min(127, Math.max(0, Math.floor(k)));
        sample.samplePitch = key;
        setOkText(key.toString());
    };

    const [centTuning, setCentTuningInternal] = useState(
        sample.samplePitchCorrection
    );
    const [ccText, setCcText] = useState(centTuning.toString());
    const setCentCorrection = (t: number) => {
        const tune = Math.min(99, Math.max(-99, Math.floor(t)));
        sample.samplePitchCorrection = tune;
        setCentTuningInternal(tune);
        setCcText(tune.toString());
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
        player.detune.value = centTuning;
        player.buffer = buffer;
        player.onended = stopPlayer;
        playerRef.current = player;

        const gain = new GainNode(engine.context, {
            gain: DEFAULT_SAMPLE_GAIN
        });
        player.connect(gain).connect(engine.targetNode);
        player.start();
        setPlayerState("playing");
    };

    const playLoop = () => {
        stopSampleInternal();
        const player = engine.context.createBufferSource();
        player.detune.value = centTuning;
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
        player.start();
        setPlayerState("playing_loop");
    };

    const stopPlayer = () => {
        stopSampleInternal();
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
    return (
        <div className={"sample_editor"}>
            <WaveView
                setLoopStart={setLoopStart}
                setLoopEnd={setLoopEnd}
                data={sampleData}
                loopStart={loopStart}
                loopEnd={loopEnd}
                sampleRate={sampleRate}
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
                            <div className={"info_field"}>
                                <span>{t("sampleLocale.sampleRate")}</span>
                                <input
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={MIN_SAMPLE_RATE}
                                    max={MAX_SAMPLE_RATE}
                                    placeholder={t("sampleLocale.sampleRate")}
                                    value={srText}
                                    onBlur={(e) =>
                                        setSampleRate(
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    onChange={(e) => setSrText(e.target.value)}
                                />
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.loopStart")}</span>
                                <input
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={0}
                                    max={loopEnd}
                                    placeholder={t("sampleLocale.loopStart")}
                                    value={lsText}
                                    onBlur={(e) =>
                                        setLoopStart(
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    onChange={(e) => setLsText(e.target.value)}
                                />
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.loopEnd")}</span>
                                <input
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={loopStart}
                                    max={sampleData.length - 1}
                                    placeholder={t("sampleLocale.loopEnd")}
                                    value={leText}
                                    onBlur={(e) =>
                                        setLoopEnd(
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    onChange={(e) => setLeText(e.target.value)}
                                />
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.originalKey")}</span>
                                <input
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={0}
                                    max={12700} /* to even out the width */
                                    placeholder={t("sampleLocale.originalKey")}
                                    value={okText}
                                    onBlur={(e) =>
                                        setOriginalKey(
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    onChange={(e) => setOkText(e.target.value)}
                                />
                            </div>

                            <div className={"info_field"}>
                                <span>{t("sampleLocale.centCorrection")}</span>
                                <input
                                    className={"pretty_input monospaced"}
                                    type={"number"}
                                    min={-99}
                                    max={12700} /* to even out the width */
                                    placeholder={t(
                                        "sampleLocale.centCorrection"
                                    )}
                                    value={ccText}
                                    onBlur={(e) =>
                                        setCentCorrection(
                                            parseInt(e.target.value) || 0
                                        )
                                    }
                                    onChange={(e) => setCcText(e.target.value)}
                                />
                            </div>

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
                    <div className={"info_column tools"}>
                        <h2>{t("sampleLocale.tools.title")}</h2>
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
                    </div>
                </div>
                <div className={"linked_instruments"}>
                    {sample.linkedInstruments.length === 0 && (
                        <div>{t("sampleLocale.notLinkedToAnything")}:</div>
                    )}
                    {sample.linkedInstruments.length > 0 && (
                        <>
                            <div>
                                <b>{t("sampleLocale.linkedTo")}</b>
                            </div>
                            {sample.linkedInstruments.map((inst, i) => (
                                <div
                                    className={"monospaced"}
                                    onClick={() => setView(inst)}
                                    key={i}
                                >
                                    {inst.instrumentName}
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
