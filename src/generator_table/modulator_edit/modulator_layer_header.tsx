import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./modulator_edit_phone.css";
import { PhoneLayerHeader } from "../../phone_shell/phone_layer_header.tsx";
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
        <PhoneLayerHeader
            icon={"back"}
            buttonLabel={t("phoneLocale.modulators.back")}
            onButton={onBack}
            title={title}
        >
            {children}
        </PhoneLayerHeader>
    );
}
