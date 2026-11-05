import { useTranslation } from "react-i18next";
import "./error_boundary.css";
import { getErrorMessage } from "./error_message.ts";

interface PaneErrorFallbackProps {
    error: unknown;
}

/**
 * Replaces one editor pane that failed to render, while the rest of the app keeps working.
 */
export function PaneErrorFallback({ error }: PaneErrorFallbackProps) {
    const { t } = useTranslation();
    return (
        <div className={"error_boundary"} role={"alert"}>
            <h2>{t("errorBoundary.paneTitle")}</h2>
            <p>{t("errorBoundary.paneDescription")}</p>
            <pre className={"error_boundary_message"}>
                {getErrorMessage(error)}
            </pre>
        </div>
    );
}
