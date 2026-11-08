import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useLayout } from "../layout/layout_context.ts";
import {
    ChevronDownIcon,
    ChevronRightIcon
} from "../utils/icons/app_icons.tsx";

interface ExpandButtonProps {
    isOpen: boolean;
    onToggle: () => void;
    /**
     * Shown after the triangle, and toggles too (a preset's patch). It names the button then,
     * `aria-expanded` tells whether it is open.
     */
    children?: ReactNode;
}

/**
 * The triangle that shows or hides the children of a list item.
 */
export function ExpandButton({
    isOpen,
    onToggle,
    children
}: ExpandButtonProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    // The phone draws the disclosure as a muted chevron icon
    const triangle =
        layout === "phone" ? (
            isOpen ? (
                <ChevronDownIcon />
            ) : (
                <ChevronRightIcon />
            )
        ) : isOpen ? (
            "\u{25BC}"
        ) : (
            "\u{25B6}"
        );
    return (
        <button
            type={"button"}
            className={"plain_button triangle"}
            aria-expanded={isOpen}
            aria-label={
                children ? undefined : isOpen ? t("collapse") : t("expand")
            }
            onClick={onToggle}
        >
            {children ? (
                <>
                    <span className={"triangle_glyph"} aria-hidden={true}>
                        {triangle}
                    </span>
                    {children}
                </>
            ) : (
                triangle
            )}
        </button>
    );
}
