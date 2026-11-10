import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { PhoneLayerHeader } from "../phone_shell/phone_layer_header.tsx";

interface OverviewPanelHeaderProps {
    onBack: () => void;
    title: ReactNode;
    /**
     * The end of the bar, where New goes.
     */
    children?: ReactNode;
}

/**
 * The bar of a phone overview panel. Back itself is handled by PhoneBankEditor, so this
 * registers nothing.
 */
export function OverviewPanelHeader({
    onBack,
    title,
    children
}: OverviewPanelHeaderProps) {
    const { t } = useTranslation();
    return (
        <PhoneLayerHeader
            icon={"back"}
            buttonLabel={t("phoneLocale.overview.back")}
            onButton={onBack}
            title={title}
        >
            {children}
        </PhoneLayerHeader>
    );
}
