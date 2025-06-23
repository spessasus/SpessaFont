import { useEffect, useMemo, useRef, useState } from "react";
import type { SamplePlayerState } from "./sample_editor.tsx";
import { ControllerRange } from "../../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";
import {
    type BasicSample,
    sampleTypes,
    type SampleTypeValue
} from "spessasynth_core";
import type { AudioEngine } from "../../core_backend/audio_engine.ts";
import { audioBufferToWav } from "spessasynth_lib";

const DEFAULT_SAMPLE_GAIN = 0.4;

const ZOOM_PER_SAMPLE = 50000 / 6_000_000;

export function SampleTools({
    sample,
    engine,
    playerState,
    setPlayerState,
    setPlaybackStart,
    loading,
    setLoading,
    zoom,
    setZoom,
    setSampleData
}: {
    sample: BasicSample;
    engine: AudioEngine;
    playerState: SamplePlayerState;
    setPlayerState: (s: SamplePlayerState) => unknown;
    setPlaybackStart: (s: number) => unknown;
    loading: boolean;
    setLoading: (l: boolean) => unknown;
    zoom: number;
    setZoom: (z: number) => unknown;
    setSampleData: (d: Float32Array, rate: number) => unknown;
}) {
    const { t } = useTranslation();
    const sampleData = sample.getAudioData();
    const sampleName = sample.sampleName;
    const sampleRate = sample.sampleRate;
    const centCorrection = sample.samplePitchCorrection;
    const loopStart = sample.sampleLoopStartIndex;
    const loopEnd = sample.sampleLoopEndIndex;
    const sampleType = sample.sampleType as SampleTypeValue;
    const linkedSample = sample.linkedSample;

    const [inputZoom, setInputZoom] = useState(100);

    const buffer = useMemo(() => {
        // resample if sample range is ridiculous
        // test case: Calm 4 with a whopping 384 kHz

        let audioData = sampleData;
        let bufferRate = sampleRate;
        if (sampleRate < 8000 || sampleRate > 96000) {
            // resample to 48kHz
            const ratio = 48000 / sampleRate;
            const resampled = new Float32Array(
                Math.floor(audioData.length * ratio)
            );
            for (let i = 0; i < resampled.length; i++) {
                resampled[i] = audioData[Math.floor(i * (1 / ratio))];
            }
            audioData = resampled;
            bufferRate = 48000;
        }

        const buf = engine.context.createBuffer(
            1,
            sampleData.length,
            bufferRate
        );
        buf.getChannelData(0).set(audioData);
        return buf;
    }, [engine.context, sampleRate, sampleData]);

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

    // stop and clean up on unmounting or sample change
    useEffect(() => {
        return () => {
            stopSampleInternal();
            setZoom(1);
            setInputZoom(100);
        };
    }, [sample, setZoom]);

    // update loop
    useEffect(() => {
        if (playerState === "playing_loop" && playerRef.current) {
            playerRef.current.loopStart = loopStart / sampleRate;
            playerRef.current.loopEnd = loopEnd / sampleRate;
        }
    }, [loopEnd, loopStart, playerState, sampleRate]);

    useEffect(() => {
        if (playerState !== "stopped" && playerRef.current) {
            playerRef.current.detune.value = centCorrection;
        }
    }, [centCorrection, playerState]);

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
        a.download = `${sampleName}.wav`;
        console.info(a);
        a.click();
    };

    const [importError, setImportError] = useState("");
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
                        : importError || t("sampleLocale.tools.replaceAudio")}
                </div>

                <ControllerRange
                    max={(maxZoom - 1) * 100}
                    min={100}
                    onChange={(n) => {
                        n /= 100;
                        const mapped = (n - 1) / (maxZoom - 1);
                        const exponent = Math.pow(mapped, 5);
                        setZoom(exponent * (maxZoom - 1) + 1);
                        setInputZoom(n * 100);
                    }}
                    value={inputZoom}
                    text={`${t("sampleLocale.waveZoom")}: ${
                        Math.floor(zoom * 100_00) / 100
                    }%`}
                ></ControllerRange>
            </div>
        </div>
    );
}
