import type { ReactNode } from "react";
import "./phone_layer_header.css";
import { ChevronLeftIcon, CloseIcon } from "../utils/icons/app_icons.tsx";

interface PhoneLayerHeaderProps {
    /**
     * Back for a layer over another view, close for the navigator and the settings.
     */
    icon: "back" | "close";
    buttonLabel: string;
    onButton: () => void;
    /**
     * Text, or text with markup (the default modulators name the bank in italics).
     */
    title?: ReactNode;
    titleId?: string;
    /**
     * The end of the bar, after the title.
     */
    children?: ReactNode;
}

/**
 * The bar at the top of a phone layer: the navigator, the settings, the modulator layer and the
 * overview panels.
 */
export function PhoneLayerHeader({
    icon,
    buttonLabel,
    onButton,
    title,
    titleId,
    children
}: PhoneLayerHeaderProps) {
    return (
        <div className={"phone_layer_header"}>
            {/* No autoFocus, on a phone it would only draw a ring */}
            <button
                type={"button"}
                className={"plain_button phone_layer_header_button"}
                aria-label={buttonLabel}
                onClick={onButton}
            >
                {icon === "back" ? <ChevronLeftIcon /> : <CloseIcon />}
            </button>
            <h2 id={titleId} className={"phone_layer_header_title"}>
                {title}
            </h2>
            {children}
        </div>
    );
}
