import { useTranslation } from "react-i18next";
import "./welcome.css";
import {
    DownloadIcon,
    NewFileIcon,
    OpenFileIcon
} from "../utils/icons/file_icons.tsx";
import { IS_ELECTRON } from "../utils/environment_detection.ts";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";
import {
    DEFAULT_RELEASE_URL,
    type DesktopDownloads,
    fetchDesktopDownloads
} from "./desktop_downloads.ts";
import { logError } from "../utils/core_utils.ts";

const DOWNLOAD_LABELS = {
    windowsInstaller: "downloadDesktop.windowsInstaller",
    windowsPortable: "downloadDesktop.windowsPortable",
    linuxAppImage: "downloadDesktop.linuxAppImage",
    debianPackage: "downloadDesktop.debianPackage"
} as const satisfies Record<keyof DesktopDownloads, string>;

interface WelcomeProps {
    onOpenFile: () => void;
    onNewFile: () => void;
}

export function Welcome({ onOpenFile, onNewFile }: WelcomeProps) {
    const { t } = useTranslation();

    const handleDownload = async () => {
        let downloads: DesktopDownloads | undefined;
        try {
            downloads = await fetchDesktopDownloads();
        } catch (error) {
            logError("Failed to fetch the latest release.", error);
        }
        if (!downloads) {
            window.open(DEFAULT_RELEASE_URL);
            return;
        }
        const links = Object.entries(DOWNLOAD_LABELS).map(([key, label]) => (
            <a
                key={key}
                className={"pretty_outline"}
                target={"_blank"}
                href={downloads[key as keyof DesktopDownloads]}
            >
                {t(label)}
            </a>
        ));
        showToastDialog({
            content: (
                <>
                    <span>
                        <strong>{t("downloadDesktop.chooseFormat")}</strong>
                    </span>
                    {links}
                </>
            ),
            buttons: [{ label: t("menuBarLocale.file.close") }]
        });
    };

    return (
        <div className="welcome">
            <div className={"grouped"}>
                <h1>{t("welcome.main")}</h1>
                <div className={"flex"}>
                    <button
                        type={"button"}
                        className={"action_button"}
                        onClick={onOpenFile}
                    >
                        <OpenFileIcon />
                        <span>{t("welcome.openPrompt")}</span>
                    </button>
                    <button
                        type={"button"}
                        className={"action_button"}
                        onClick={onNewFile}
                    >
                        <NewFileIcon />
                        <span>{t("welcome.newPrompt")}</span>
                    </button>
                </div>
                {IS_ELECTRON ? null : (
                    <button
                        type={"button"}
                        className={"action_button"}
                        onClick={() => void handleDownload()}
                    >
                        <DownloadIcon />
                        <span>{t("welcome.downloadPrompt")}</span>
                    </button>
                )}
            </div>
            <div className={"welcome_copyright grouped"}>
                <span>{t("welcome.copyright")}</span>
                <span>
                    <i>{t("welcome.copyrightTwo")}</i>
                </span>
            </div>
        </div>
    );
}
