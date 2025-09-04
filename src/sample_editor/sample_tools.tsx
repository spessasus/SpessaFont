import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SamplePlayerState } from "./sample_editor.tsx";
import { ControllerRange } from "../fancy_inputs/controller_range/controller_range.tsx";
import { useTranslation } from "react-i18next";
import { type BasicSample, sampleTypes } from "spessasynth_core";
import type { AudioEngine } from "../core_backend/audio_engine.ts";
import { audioBufferToWav } from "spessasynth_lib";
import toast from "react-hot-toast";

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
    sampleData,
    setSampleData,
    setLoopStart,
    setLoopEnd
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
    sampleData: Float32Array;
    setSampleData: (d: Float32Array, rate: number) => unknown;
    setLoopStart: (s: number) => unknown;
    setLoopEnd: (e: number) => unknown;
}) {
    const { t } = useTranslation();
    const sampleName = sample.name;
    const sampleRate = sample.sampleRate;
    const centCorrection = sample.originalKey;
    const loopStart = sample.loopStart;
    const loopEnd = sample.loopEnd;
    const sampleType = sample.sampleType;
    const linkedSample = sample.linkedSample;

    const [inputZoom, setInputZoom] = useState(100);

    const buffer = useMemo(() => {
        // resample if sample range is ridiculous
        // test case: Calm 4 with a whopping 384 kHz

        let audioData = sample.getAudioData();
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
            Math.max(sample.getAudioData().length, 2),
            bufferRate
        );
        buf.getChannelData(0).set(audioData);
        return buf;
    }, [sample, sampleRate, engine.context]);

    const playerRef = useRef<AudioBufferSourceNode | null>(null);

    const stopSampleInternal = useCallback(() => {
        if (playerRef.current) {
            try {
                playerRef.current.stop();
            } catch (e) {
                console.warn("audio already stopped or invalid", e);
            }
            playerRef.current.disconnect();
            playerRef.current = null;
        }
    }, []);

    // stop and clean up on unmounting or sample change
    useEffect(() => {
        return () => {
            // don't stop the sample automatically
            if (playerRef.current) {
                playerRef.current.onended = null;
            }
            stopSampleInternal();
            setZoom(1);
            setInputZoom(100);
        };
    }, [sample, setZoom, stopSampleInternal]);

    // update loop
    useEffect(() => {
        if (playerState === "playing_loop" && playerRef.current) {
            playerRef.current.loopStart = loopStart / sampleRate;
            playerRef.current.loopEnd = loopEnd / sampleRate;
        }
    }, [loopEnd, loopStart, playerState, sampleRate]);

    // update detune
    useEffect(() => {
        if (playerState !== "stopped" && playerRef.current) {
            playerRef.current.detune.value = centCorrection;
        }
    }, [centCorrection, playerState]);

    const stopPlayer = useCallback(() => {
        stopSampleInternal();
        setPlaybackStart(-1);
        setPlayerState("stopped");
    }, [setPlaybackStart, setPlayerState, stopSampleInternal]);

    const playSample = useCallback(
        (loop: boolean) => {
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
        },
        [
            buffer,
            centCorrection,
            engine.context,
            engine.targetNode,
            loopEnd,
            loopStart,
            sampleRate,
            setPlaybackStart,
            setPlayerState,
            stopPlayer,
            stopSampleInternal
        ]
    );

    // restart loop playback
    useEffect(() => {
        if (playerState === "playing_loop" && !playerRef.current) {
            playSample(true);
        } else if (!playerRef.current) {
            stopPlayer();
        }
    }, [playSample, playerState, stopPlayer]);

    const exportWav = () => {
        const blob = audioBufferToWav(buffer, {
            normalizeAudio: false
        });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${sampleName}.wav`;
        console.info(a);
        a.click();
    };

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
            setLoading(true);
            let audioBuffer: AudioBuffer;
            try {
                audioBuffer = await engine.context.decodeAudioData(
                    await file.arrayBuffer()
                );
            } catch {
                toast.error(t("sampleLocale.tools.invalidAudioFile"));
                return;
            } finally {
                setLoading(false);
            }

            if (audioBuffer.numberOfChannels === 2) {
                const left = audioBuffer.getChannelData(0);
                const right = audioBuffer.getChannelData(1);
                // check for linked sample
                if (
                    (sampleType === sampleTypes.leftSample ||
                        sampleType === sampleTypes.rightSample) &&
                    linkedSample
                ) {
                    const linked = linkedSample;

                    if (sampleType === sampleTypes.leftSample) {
                        linked.setAudioData(right, audioBuffer.sampleRate);
                        linked.loopStart = 0;
                        linked.loopEnd = right.length - 1;

                        setSampleData(left, audioBuffer.sampleRate);
                    } else {
                        linked.setAudioData(left, audioBuffer.sampleRate);
                        linked.loopStart = 0;
                        linked.loopEnd = left.length - 1;

                        setSampleData(right, audioBuffer.sampleRate);
                    }
                } else {
                    const finalData = new Float32Array(audioBuffer.length);
                    // mix down to mono
                    for (let i = 0; i < audioBuffer.length; i++) {
                        finalData[i] = (left[i] + right[i]) / 2;
                    }
                    setSampleData(finalData, audioBuffer.sampleRate);
                    setLoopStart(0);
                    setLoopEnd(finalData.length - 1);
                }
            } else if (audioBuffer.numberOfChannels === 1) {
                audioBuffer.copyFromChannel(audioBuffer.getChannelData(0), 0);
            } else {
                toast.error(t("sampleLocale.tools.tooManyChannels"));
            }
        };
        input.click();
    };

    const normalizeAudio = () => {
        const maxSample = sampleData.reduce((max, cur) =>
            Math.max(max, Math.abs(cur))
        );
        const gain = 1 / maxSample;
        const newData = new Float32Array(sampleData);
        for (let i = 0; i < newData.length; i++) {
            newData[i] *= gain;
        }
        setSampleData(newData, sampleRate);
    };

    const maxZoom = Math.max(5, ZOOM_PER_SAMPLE * sampleData.length + 1);
    return (
        <div className={`info_column ${loading ? "disabled" : ""} tools`}>
            <div
                className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
                onClick={exportWav}
            >
                {t("sampleLocale.tools.wavExport")}
            </div>
            {playerState === "stopped" && (
                <>
                    <div
                        className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
                        onClick={() => playSample(false)}
                    >
                        {t("sampleLocale.tools.play")}
                    </div>

                    <div
                        className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
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
                        className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
                        onClick={stopPlayer}
                    >
                        {t("sampleLocale.tools.stop")}
                    </div>
                    <div
                        className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
                        onClick={stopPlayer}
                    >
                        {t("sampleLocale.tools.stop")}
                    </div>
                </>
            )}
            <div
                onClick={normalizeAudio}
                className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
            >
                {t("sampleLocale.tools.normalize")}
            </div>

            <div
                onClick={replaceData}
                className={`pretty_button monospaced ${!loading ? "responsive_button hover_brightness" : ""}`}
            >
                {loading
                    ? t("sampleLocale.tools.loading")
                    : t("sampleLocale.tools.replaceAudio")}
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
    );
}
