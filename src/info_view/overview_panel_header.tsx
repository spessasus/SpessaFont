import { useTranslation } from "react-i18next";
import { ChevronLeftIcon } from "../utils/icons/app_icons.tsx";

interface OverviewPanelHeaderProps {
    onBack: () => void;
}

/**
 * The back arrow of a phone overview panel. Back itself is handled by PhoneBankEditor, so this
 * registers nothing.
 */
export function OverviewPanelHeader({ onBack }: OverviewPanelHeaderProps) {
    const { t } = useTranslation();
    return (
        <div className={"overview_panel_header"}>
            <button
                type={"button"}
                className={"plain_button overview_panel_back"}
                onClick={onBack}
                aria-label={t("phoneLocale.overview.back")}
            >
                <ChevronLeftIcon />
            </button>
        </div>
    );
}
