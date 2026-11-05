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

const DOWNLOADS = [
    { key: "windowsInstaller", label: "downloadDesktop.windowsInstaller" },
    { key: "windowsPortable", label: "downloadDesktop.windowsPortable" },
    { key: "linuxAppImage", label: "downloadDesktop.linuxAppImage" },
    { key: "debianPackage", label: "downloadDesktop.debianPackage" }
] as const satisfies readonly { key: keyof DesktopDownloads; label: string }[];

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
        const links = DOWNLOADS.map(({ key, label }) => (
            <a
                key={key}
                className={"pretty_outline"}
                target={"_blank"}
                href={downloads[key]}
            >
                {t(label)}
            </a>
        ));
        showToastDialog({
            id: "downloads",
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
            <div className={"welcome_group"}>
                <h1>{t("welcome.main")}</h1>
                <div className={"welcome_actions"}>
                    <button
                        type={"button"}
                        className={"welcome_action"}
                        onClick={onOpenFile}
                        // Takes the focus when the last tab closes from the keyboard
                        data-focus-fallback={true}
                    >
                        <OpenFileIcon />
                        <span>{t("welcome.openPrompt")}</span>
                    </button>
                    <button
                        type={"button"}
                        className={"welcome_action"}
                        onClick={onNewFile}
                    >
                        <NewFileIcon />
                        <span>{t("welcome.newPrompt")}</span>
                    </button>
                </div>
                {IS_ELECTRON ? null : (
                    <button
                        type={"button"}
                        className={"welcome_action"}
                        onClick={() => void handleDownload()}
                    >
                        <DownloadIcon />
                        <span>{t("welcome.downloadPrompt")}</span>
                    </button>
                )}
            </div>
            <div className={"welcome_copyright welcome_group"}>
                <span>{t("welcome.copyright")}</span>
                <span>
                    <i>{t("welcome.copyrightTwo")}</i>
                </span>
            </div>
        </div>
    );
}
