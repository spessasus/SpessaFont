import { useTranslation } from "react-i18next";
import "./error_boundary.css";
import { getErrorMessage } from "./error_message.ts";

interface PartErrorFallbackProps {
    error: unknown;
    /**
     * Renders the part again.
     */
    onRetry: () => void;
}

/**
 * Replaces a part of the app that failed to render (a tab, the keyboard, the settings or a
 * dialog), while the other parts and the open banks are kept.
 */
export function PartErrorFallback({ error, onRetry }: PartErrorFallbackProps) {
    const { t } = useTranslation();
    return (
        <div className={"error_boundary"} role={"alert"}>
            <h2>{t("errorBoundary.partTitle")}</h2>
            <p>{t("errorBoundary.partDescription")}</p>
            <pre className={"error_boundary_message"}>
                {getErrorMessage(error)}
            </pre>
            <button
                type={"button"}
                className={"pretty_button hover_brightness responsive_button"}
                onClick={onRetry}
            >
                {t("errorBoundary.tryAgain")}
            </button>
        </div>
    );
}
