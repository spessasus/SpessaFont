import { useTranslation } from "react-i18next";
import { typedMemo } from "../utils/typed_memo.ts";
import "./welcome.css";
import { DownloadIcon, NewFileIcon, OpenFileIcon } from "../utils/icons.tsx";
import { IS_ELECTRON } from "../utils/environment_detection.ts";
import toast from "react-hot-toast";

export const Welcome = typedMemo(function ({
    openFile,
    openNewBankTab
}: {
    openFile: () => unknown;
    openNewBankTab: () => unknown;
}) {
    const { t } = useTranslation();
    return (
        <div className="welcome">
            <div className={"grouped"}>
                <h1>{t("welcome.main")}</h1>
                <div className={"flex"}>
                    <div className={"action_button"}>
                        <OpenFileIcon />
                        <span onClick={openFile}>
                            {t("welcome.openPrompt")}
                        </span>
                    </div>
                    <div className={"action_button"}>
                        <NewFileIcon />
                        <span onClick={openNewBankTab}>
                            {t("welcome.newPrompt")}
                        </span>
                    </div>
                </div>
                {!IS_ELECTRON && (
                    <div
                        className={"action_button"}
                        onClick={async () => {
                            const dLoc = "downloadDesktop.";
                            const res = await fetch(
                                "https://api.github.com/repos/spessasus/SpessaFont/releases/latest"
                            );
                            const rel = (await res.json()) as {
                                assets?: {
                                    browser_download_url: string;
                                    name: string;
                                }[];
                            };
                            const defaultUrl =
                                "https://github.com/spessasus/SpessaFont/releases/tag/v1.2.0";
                            if (!rel.assets) {
                                window.open(defaultUrl);
                                return;
                            }
                            const assets = rel.assets;
                            const windowsInstaller =
                                assets.find(
                                    (a) =>
                                        a.name.endsWith(".exe") &&
                                        a.name.includes("Setup")
                                )?.browser_download_url ?? defaultUrl;
                            const windowsPortable =
                                assets.find(
                                    (a) =>
                                        a.name.endsWith(".exe") &&
                                        !a.name.includes("Setup")
                                )?.browser_download_url ?? defaultUrl;
                            const linuxAppImage =
                                assets.find((a) => a.name.endsWith("AppImage"))
                                    ?.browser_download_url ?? defaultUrl;
                            const debianPackage =
                                assets.find((a) => a.name.endsWith(".deb"))
                                    ?.browser_download_url ?? defaultUrl;
                            toast(
                                (tost) => (
                                    <div className={"toast_col"}>
                                        <span>
                                            <strong>
                                                {t(dLoc + "chooseFormat")}
                                            </strong>
                                        </span>
                                        <a
                                            className={"pretty_outline"}
                                            target={"_blank"}
                                            href={windowsInstaller}
                                        >
                                            {t(dLoc + "windowsInstaller")}
                                        </a>
                                        <a
                                            className={"pretty_outline"}
                                            target={"_blank"}
                                            href={windowsPortable}
                                        >
                                            {t(dLoc + "windowsPortable")}
                                        </a>
                                        <a
                                            className={"pretty_outline"}
                                            target={"_blank"}
                                            href={linuxAppImage}
                                        >
                                            {t(dLoc + "linuxAppImage")}
                                        </a>
                                        <a
                                            className={"pretty_outline"}
                                            target={"_blank"}
                                            href={debianPackage}
                                        >
                                            {t(dLoc + "debianPackage")}
                                        </a>
                                        <span
                                            onClick={() =>
                                                toast.dismiss(tost.id)
                                            }
                                            className={"pretty_outline"}
                                        >
                                            {t("menuBarLocale.file.close")}
                                        </span>
                                    </div>
                                ),
                                {
                                    duration: Infinity
                                }
                            );
                        }}
                    >
                        <DownloadIcon />
                        <span>{t("welcome.downloadPrompt")}</span>
                    </div>
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
});
