import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./modulator_edit_phone.css";
import { ChevronLeftIcon } from "../../utils/icons/app_icons.tsx";
import { useBackHandler } from "../../hooks/use_back_handler.ts";
import { BACK_LEVELS } from "../../phone_shell/back_stack.ts";

interface ModulatorLayerHeaderProps {
    title: string;
    onBack: () => void;
    /**
     * The end of the bar, where New goes.
     */
    children?: ReactNode;
}

/**
 * The phone modulator layer's header. It is mounted exactly while the layer shows, so it holds
 * the layer's back handler (spec 5.2).
 */
export function ModulatorLayerHeader({
    title,
    onBack,
    children
}: ModulatorLayerHeaderProps) {
    const { t } = useTranslation();
    useBackHandler(true, BACK_LEVELS.modulatorLayer, () => {
        onBack();
        return true;
    });
    return (
        <div className={"modulator_layer_header"}>
            {/* No autoFocus, on a phone it would only draw a ring */}
            <button
                type={"button"}
                className={"plain_button modulator_layer_back"}
                onClick={onBack}
                aria-label={t("phoneLocale.modulators.back")}
            >
                <ChevronLeftIcon />
            </button>
            <h2>{title}</h2>
            {children}
        </div>
    );
}
