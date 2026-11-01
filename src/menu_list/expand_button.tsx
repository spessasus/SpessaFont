import { useTranslation } from "react-i18next";

interface ExpandButtonProps {
    isOpen: boolean;
    onToggle: () => void;
}

/**
 * The triangle that shows or hides the children of a list item.
 */
export function ExpandButton({ isOpen, onToggle }: ExpandButtonProps) {
    const { t } = useTranslation();
    return (
        <button
            type={"button"}
            className={"plain_button triangle"}
            aria-expanded={isOpen}
            aria-label={isOpen ? t("collapse") : t("expand")}
            onClick={onToggle}
        >
            {isOpen ? "\u{25BC}" : "\u{25B6}"}
        </button>
    );
}
