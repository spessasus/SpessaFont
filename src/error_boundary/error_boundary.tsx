import { Component, type ErrorInfo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { logError } from "../utils/core_utils.ts";
import "./error_boundary.css";
import { getErrorMessage } from "./error_message.ts";

interface ErrorBoundaryProps {
    children: ReactNode;
    /**
     * Renders the fallback, which can call `reset` to render the children again.
     * Without it, the app-level fallback with a reload button is shown.
     */
    fallback?: (error: unknown, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
    error: unknown;
    hasError: boolean;
}

interface ErrorFallbackProps {
    error: unknown;
}

function ErrorFallback({ error }: ErrorFallbackProps) {
    const { t } = useTranslation();
    const message = getErrorMessage(error);
    return (
        <div className={"error_boundary"} role={"alert"}>
            <h2>{t("errorBoundary.title")}</h2>
            <p>{t("errorBoundary.description")}</p>
            <pre className={"error_boundary_message"}>{message}</pre>
            <button
                type={"button"}
                className={"pretty_button hover_brightness responsive_button"}
                onClick={() => location.reload()}
            >
                {t("errorBoundary.reload")}
            </button>
        </div>
    );
}

/**
 * Shows a fallback instead of a blank page when rendering throws.
 * React only supports error boundaries as class components, so this is the one exception
 * to the function components rule.
 */
export class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
        return { error, hasError: true };
    }

    private readonly reset = () => {
        this.setState({ error: undefined, hasError: false });
    };

    public state: ErrorBoundaryState = { error: undefined, hasError: false };

    public componentDidCatch(error: unknown, info: ErrorInfo) {
        logError("Rendering failed.", error, info.componentStack);
    }

    public render() {
        if (!this.state.hasError) {
            return this.props.children;
        }
        const { fallback } = this.props;
        return fallback ? (
            fallback(this.state.error, this.reset)
        ) : (
            <ErrorFallback error={this.state.error} />
        );
    }
}
