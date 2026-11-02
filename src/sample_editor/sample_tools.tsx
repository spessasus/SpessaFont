import { useTranslation } from "react-i18next";
import { audioToWav, type BasicSample } from "spessasynth_core";
import { downloadBlob } from "../utils/download_blob.ts";
import type { useSamplePlayer } from "./use_sample_player.ts";
import { useSampleAudioCommands } from "./use_sample_audio_commands.ts";
import { ZoomSlider } from "./zoom_slider.tsx";

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
    const { isLoading, replaceAudio, normalize } = useSampleAudioCommands(
        sample,
        player.stop
    );
    const { buffer } = player;

    const exportLoop = () => {
        const loop = buffer
            .getChannelData(0)
            .slice(sample.loopStart, sample.loopEnd);
        exportWav(loop, buffer.sampleRate, `${sample.name}_loop`);
    };

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

            <ZoomSlider
                sampleLength={sample.getAudioData().length}
                zoom={zoom}
                onZoomChange={onZoomChange}
            />
        </div>
    );
}
