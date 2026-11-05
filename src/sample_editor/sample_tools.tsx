import { useTranslation } from "react-i18next";

interface SampleToolsProps {
    isLoading: boolean;
    onExportWav: (isLoopOnly: boolean) => Promise<void>;
    onNormalize: () => Promise<void>;
    onAutoLoop: () => Promise<void>;
    onReplaceAudio: () => Promise<void>;
}

/**
 * WAV export (both channels of a stereo pair), normalize, auto loop, and audio replacement.
 */
export function SampleTools({
    isLoading,
    onExportWav,
    onNormalize,
    onAutoLoop,
    onReplaceAudio
}: SampleToolsProps) {
    const { t } = useTranslation();

    const buttonClass = `pretty_button ${isLoading ? "" : "responsive_button hover_brightness"}`;
    return (
        <div className={`sample_tools ${isLoading ? "disabled" : ""}`}>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={() => void onExportWav(false)}
            >
                {t("sampleLocale.tools.wavExport")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={() => void onExportWav(true)}
            >
                {t("sampleLocale.tools.wavExportLoop")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                onClick={() => void onNormalize()}
            >
                {t("sampleLocale.tools.normalize")}
            </button>
            <button
                type={"button"}
                className={buttonClass}
                disabled={isLoading}
                title={t("sampleLocale.tools.autoLoopTitle")}
                onClick={() => void onAutoLoop()}
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
