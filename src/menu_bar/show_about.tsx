import type { TFunction } from "i18next";
import { showToastDialog } from "../toasts/show_toast_dialog.tsx";

/**
 * Shows the about toast, used by the File menu and the phone's overflow.
 */
export function showAbout(t: TFunction) {
    showToastDialog({
        id: "about",
        content: (
            <>
                <span>
                    <strong>{t("titleMessage")}</strong>
                </span>
                <span>{t("welcome.copyrightTwo")}</span>
                <span>{"v" + __APP_VERSION__}</span>
            </>
        ),
        buttons: [{ label: t("menuBarLocale.file.close") }]
    });
}
