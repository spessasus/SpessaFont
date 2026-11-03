import { useTranslation } from "react-i18next";
import { audioToWav, type BasicSample } from "spessasynth_core";
import { downloadBlob } from "../utils/download_blob.ts";
import { getExportChannels } from "./sample_audio.ts";

interface SampleToolsProps {
    sample: BasicSample;
    isLoading: boolean;
    onNormalize: () => void;
    onAutoLoop: () => void;
    onReplaceAudio: () => Promise<void>;
}

/**
 * WAV export (both channels of a stereo pair), normalize, auto loop, and audio replacement.
 */
export function SampleTools({
    sample,
    isLoading,
    onNormalize,
    onAutoLoop,
    onReplaceAudio
}: SampleToolsProps) {
    const { t } = useTranslation();

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
                onClick={onNormalize}
            >
                {t("sampleLocale.tools.normalize")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                title={t("sampleLocale.tools.autoLoopTitle")}
                onClick={onAutoLoop}
            >
                {t("sampleLocale.tools.autoLoop")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={() => void onReplaceAudio()}
            >
                {isLoading
                    ? t("sampleLocale.tools.loading")
                    : t("sampleLocale.tools.replaceAudio")}
            </button>
        </div>
    );
}
