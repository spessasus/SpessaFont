import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { audioToWav, type BasicSample } from "spessasynth_core";
import { ControllerRange } from "../fancy_inputs/controller_range/controller_range.tsx";
import { useAudioEngine } from "../core_backend/audio_engine_context.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { logError } from "../utils/core_utils.ts";
import { pickFile } from "../utils/pick_file.ts";
import { downloadBlob } from "../utils/download_blob.ts";
import type { useSamplePlayer } from "./use_sample_player.ts";
import { ReplaceSampleAudioAction } from "./replace_sample_audio_action.ts";
import { createReplaceAudioActions, normalizeAudio } from "./sample_audio.ts";

const ZOOM_PER_SAMPLE = 50_000 / 6_000_000;
const MIN_MAX_ZOOM = 5;
/**
 * The zoom slider maps to the zoom exponentially, so small zooms get most of its range.
 */
const ZOOM_CURVE = 5;

function exportWav(data: Float32Array, sampleRate: number, name: string) {
    const wav = audioToWav([data], sampleRate, { normalizeAudio: false });
    downloadBlob(new Blob([wav], { type: "audio/wav" }), `${name}.wav`);
}

interface SampleToolsProps {
    sample: BasicSample;
    player: ReturnType<typeof useSamplePlayer>;
    zoom: number;
    onZoomChange: (zoom: number) => void;
}

/**
 * Playback, WAV export, normalize, audio replacement, and the waveform zoom.
 */
export function SampleTools({
    sample,
    player,
    zoom,
    onZoomChange
}: SampleToolsProps) {
    const { t } = useTranslation();
    const { audioEngine } = useAudioEngine();
    const { apply } = useBankEditor();
    const [isLoading, setIsLoading] = useState(false);
    const [sliderValue, setSliderValue] = useState(100);
    const length = sample.getAudioData().length;
    const { buffer } = player;

    const replaceAudio = async () => {
        const file = await pickFile("audio/*");
        if (!file) {
            return;
        }
        player.stop();
        setIsLoading(true);
        let decoded: AudioBuffer;
        try {
            decoded = await audioEngine.context.decodeAudioData(
                await file.arrayBuffer()
            );
        } catch (error) {
            logError("Failed to decode the audio file.", error);
            toast.error(t("sampleLocale.tools.invalidAudioFile"));
            return;
        } finally {
            setIsLoading(false);
        }
        const channels = Array.from(
            { length: decoded.numberOfChannels },
            (_, i) => decoded.getChannelData(i)
        );
        const actions = createReplaceAudioActions(
            sample,
            channels,
            decoded.sampleRate
        );
        if (actions) {
            apply(actions);
        } else {
            toast.error(t("sampleLocale.tools.tooManyChannels"));
        }
    };

    const normalize = () => {
        player.stop();
        // The length does not change, so the loop points stay
        const data = normalizeAudio(sample.getAudioData());
        apply([
            new ReplaceSampleAudioAction(sample, {
                data,
                sampleRate: sample.sampleRate,
                loopStart: sample.loopStart,
                loopEnd: sample.loopEnd
            })
        ]);
    };

    const exportLoop = () => {
        const loop = buffer
            .getChannelData(0)
            .slice(sample.loopStart, sample.loopEnd);
        exportWav(loop, buffer.sampleRate, `${sample.name}_loop`);
    };

    const maxZoom = Math.max(MIN_MAX_ZOOM, ZOOM_PER_SAMPLE * length + 1);
    const buttonClass = `pretty_button monospaced ${isLoading ? "" : "responsive_button hover_brightness"}`;
    const isStopped = player.state === "stopped";
    return (
        <div className={`info_column ${isLoading ? "disabled" : ""} tools`}>
            <button
                type={"button"}
                className={buttonClass}
                onClick={() =>
                    exportWav(
                        buffer.getChannelData(0),
                        buffer.sampleRate,
                        sample.name
                    )
                }
            >
                {t("sampleLocale.tools.wavExport")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                onClick={exportLoop}
            >
                {t("sampleLocale.tools.wavExportLoop")}
            </button>
            {/* Two stop buttons keep the layout when playback starts */}
            <button
                type={"button"}
                className={buttonClass}
                onClick={() => (isStopped ? player.play(false) : player.stop())}
            >
                {isStopped
                    ? t("sampleLocale.tools.play")
                    : t("sampleLocale.tools.stop")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                onClick={() => (isStopped ? player.play(true) : player.stop())}
            >
                {isStopped
                    ? t("sampleLocale.tools.playLooped")
                    : t("sampleLocale.tools.stop")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={normalize}
            >
                {t("sampleLocale.tools.normalize")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={() => void replaceAudio()}
            >
                {isLoading
                    ? t("sampleLocale.tools.loading")
                    : t("sampleLocale.tools.replaceAudio")}
            </button>

            <ControllerRange
                max={(maxZoom - 1) * 100}
                min={100}
                onChange={(value) => {
                    const mapped = (value / 100 - 1) / (maxZoom - 1);
                    onZoomChange(
                        Math.pow(mapped, ZOOM_CURVE) * (maxZoom - 1) + 1
                    );
                    setSliderValue(value);
                }}
                value={sliderValue}
                text={`${t("sampleLocale.waveZoom")}: ${
                    Math.floor(zoom * 10_000) / 100
                }%`}
            />
        </div>
    );
}
