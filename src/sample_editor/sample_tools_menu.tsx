import { useTranslation } from "react-i18next";
import { ToolsMenu } from "../menu_bar/tools_menu.tsx";
import { MenuBarIcon } from "../menu_bar/menu_bar_icon.tsx";
import { EditIcon } from "../utils/icons/edit_icons.tsx";
import { DownloadIcon } from "../utils/icons/file_icons.tsx";

interface SampleToolsMenuProps {
    isLoading: boolean;
    /**
     * The loop export has nothing to write without a loop.
     */
    hasLoop: boolean;
    onExportWav: (isLoopOnly: boolean) => Promise<void>;
    onNormalize: () => Promise<void>;
    onAutoLoop: () => Promise<void>;
    onRemoveSilence: () => Promise<void>;
    onTrimAfterLoop: () => Promise<void>;
    onReplaceAudio: () => Promise<void>;
}

/**
 * The "Sample Tools" menu: WAV export (both channels of a stereo pair), normalize, auto loop,
 * trimming, and audio replacement. Everything waits while one of them runs.
 */
export function SampleToolsMenu({
    isLoading,
    hasLoop,
    onExportWav,
    onNormalize,
    onAutoLoop,
    onRemoveSilence,
    onTrimAfterLoop,
    onReplaceAudio
}: SampleToolsMenuProps) {
    const { t } = useTranslation();

    return (
        <ToolsMenu title={t("menuBarLocale.tools.sample")}>
            <MenuBarIcon
                text={t("sampleLocale.tools.wavExport")}
                isDisabled={isLoading}
                onClick={() => void onExportWav(false)}
            >
                <DownloadIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("sampleLocale.tools.wavExportLoop")}
                isDisabled={isLoading || !hasLoop}
                onClick={() => void onExportWav(true)}
            >
                <DownloadIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("sampleLocale.tools.normalize")}
                isDisabled={isLoading}
                onClick={() => void onNormalize()}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("sampleLocale.tools.autoLoop")}
                title={t("sampleLocale.tools.autoLoopTitle")}
                isDisabled={isLoading}
                onClick={() => void onAutoLoop()}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("toolsLocale.trim.removeSilence")}
                isDisabled={isLoading}
                onClick={() => void onRemoveSilence()}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={t("toolsLocale.trim.trimAfterLoop")}
                title={t("toolsLocale.trim.trimAfterLoopTitle")}
                isDisabled={isLoading}
                onClick={() => void onTrimAfterLoop()}
            >
                <EditIcon />
            </MenuBarIcon>
            <MenuBarIcon
                text={
                    isLoading
                        ? t("sampleLocale.tools.loading")
                        : t("sampleLocale.tools.replaceAudio")
                }
                isDisabled={isLoading}
                onClick={() => void onReplaceAudio()}
            >
                <EditIcon />
            </MenuBarIcon>
        </ToolsMenu>
    );
}
