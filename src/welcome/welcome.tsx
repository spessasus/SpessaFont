import { useTranslation } from "react-i18next";
import { typedMemo } from "../utils/typed_memo.ts";
import "./welcome.css";
import { NewFileIcon, OpenFileIcon } from "../utils/icons.tsx";

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
