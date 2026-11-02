import { useTranslation } from "react-i18next";
import { audioToWav, type BasicSample } from "spessasynth_core";
import { downloadBlob } from "../utils/download_blob.ts";
import { useSampleAudioCommands } from "./use_sample_audio_commands.ts";
import { getExportChannels } from "./sample_audio.ts";

interface SampleToolsProps {
    sample: BasicSample;
    /**
     * Replacing or normalizing the audio stops the playback first.
     */
    onStop: () => void;
}

/**
 * WAV export (both channels of a stereo pair), normalize, and audio replacement.
 */
export function SampleTools({ sample, onStop }: SampleToolsProps) {
    const { t } = useTranslation();
    const { isLoading, replaceAudio, normalize } = useSampleAudioCommands(
        sample,
        onStop
    );

    // The original audio and rate, not the playback buffer, which may be resampled
    const exportWav = (isLoopOnly: boolean) => {
        const wav = audioToWav(
            getExportChannels(sample, isLoopOnly),
            sample.sampleRate,
            { normalizeAudio: false }
        );
        const name = isLoopOnly ? `${sample.name}_loop` : sample.name;
        downloadBlob(new Blob([wav], { type: "audio/wav" }), `${name}.wav`);
    };

    const buttonClass = `pretty_button ${isLoading ? "" : "responsive_button hover_brightness"}`;
    return (
        <div className={`sample_tools ${isLoading ? "disabled" : ""}`}>
            <button
                type={"button"}
                className={buttonClass}
                onClick={() => exportWav(false)}
            >
                {t("sampleLocale.tools.wavExport")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                onClick={() => exportWav(true)}
            >
                {t("sampleLocale.tools.wavExportLoop")}
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
        </div>
    );
}
