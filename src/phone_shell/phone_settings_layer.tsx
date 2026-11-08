import { useTranslation } from "react-i18next";
import "./phone_settings_layer.css";
import { CloseIcon } from "../utils/icons/app_icons.tsx";
import type { BankSession } from "../core_backend/bank_session.ts";
import { Settings } from "../settings/settings.tsx";
import { ErrorBoundary } from "../error_boundary/error_boundary.tsx";
import { renderPartError } from "../error_boundary/render_part_error.tsx";

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
    return (
        <div className={"phone_settings_layer"}>
            <div className={"phone_settings_header"}>
                {/* No autoFocus, on a phone it would only draw a ring */}
                <button
                    type={"button"}
                    className={"plain_button phone_settings_close"}
                    onClick={onClose}
                    aria-label={t("settingsLocale.closeSettings")}
                >
                    <CloseIcon />
                </button>
                <h2>{t("settingsLocale.settings")}</h2>
            </div>
            <ErrorBoundary fallback={renderPartError}>
                <Settings openSessions={openSessions} />
            </ErrorBoundary>
        </div>
    );
}
