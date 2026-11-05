import { useTranslation } from "react-i18next";
import { ModalDialog } from "./modal_dialog.tsx";
import { getErrorMessage } from "../error_boundary/error_message.ts";

interface DialogErrorFallbackProps {
    error: unknown;
    onClose: () => void;
}

/**
 * Takes the place of a dialog that failed to render, so the rest of the app stays.
 */
export function DialogErrorFallback({
    error,
    onClose
}: DialogErrorFallbackProps) {
    const { t } = useTranslation();
    return (
        <ModalDialog
            title={t("errorBoundary.partTitle")}
            className={"dialog_error"}
            onCancel={onClose}
        >
            <pre className={"error_boundary_message"}>
                {getErrorMessage(error)}
            </pre>
            <div className={"modal_dialog_buttons"}>
                <button
                    type={"button"}
                    className={"pretty_button hover_brightness"}
                    onClick={onClose}
                >
                    {t("menuBarLocale.file.close")}
                </button>
            </div>
        </ModalDialog>
    );
}
