import { PartErrorFallback } from "./part_error_fallback.tsx";

/**
 * The fallback of a part of the app, for `ErrorBoundary`. A failing tab, keyboard or settings
 * page keeps the other tabs and their unsaved edits.
 */
export function renderPartError(error: unknown, reset: () => void) {
    return <PartErrorFallback error={error} onRetry={reset} />;
}
