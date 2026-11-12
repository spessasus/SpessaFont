import { useTranslation } from "react-i18next";
import "./phone_settings_layer.css";
import { PhoneLayerHeader } from "./phone_layer_header.tsx";
import type { BankSession } from "../core_backend/bank_session.ts";
import { Settings } from "../settings/settings.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { renderPartError } from "../error_boundary/render_part_error.tsx";
import { usePresence } from "../hooks/use_presence.ts";

interface PhoneSettingsLayerProps {
    openSessions: readonly BankSession[];
    onClose: () => void;
}

/**
 * The settings over the whole upper part of the phone shell (spec 12.4).
 */
export function PhoneSettingsLayer({
    openSessions,
    onClose
}: PhoneSettingsLayerProps) {
    const { t } = useTranslation();
    const { ref, isClosing } = usePresence<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={"phone_settings_layer"}
            data-state={isClosing ? "closing" : "open"}
            inert={isClosing}
        >
            <PhoneLayerHeader
                icon={"close"}
                buttonLabel={t("settingsLocale.closeSettings")}
                onButton={onClose}
                title={t("settingsLocale.settings")}
            />
            <ErrorBoundary fallback={renderPartError}>
                <Settings openSessions={openSessions} />
            </ErrorBoundary>
        </div>
    );
}
