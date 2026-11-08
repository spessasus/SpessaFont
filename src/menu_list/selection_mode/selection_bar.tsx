import "./selection_mode.css";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { CloseIcon, MoreVerticalIcon } from "../../utils/icons/app_icons.tsx";

interface SelectionBarProps {
    /**
     * How many elements are selected, none before the first tap after Select….
     */
    count: number;
    onExit: () => void;
    onAll: () => void;
    onBetween: () => void;
    /**
     * Opens the menu of the selection.
     */
    onMenu: (event: MouseEvent) => void;
}

/**
 * The navigator header in selection mode (spec 6.4): `[×] 3 selected  All  Between  [⋮]`.
 * With nothing selected yet the kind is unknown, so only the close button acts.
 */
export function SelectionBar({
    count,
    onExit,
    onAll,
    onBetween,
    onMenu
}: SelectionBarProps) {
    const { t } = useTranslation();
    // Disabled buttons stay focusable on phones (aria-disabled), so a tap must do nothing
    const isEmpty = count === 0;
    return (
        // The buttons wrap to a second row when a long count does not fit beside them
        <div className={"selection_bar"}>
            <div className={"selection_bar_start"}>
                <button
                    type={"button"}
                    className={"plain_button selection_bar_icon"}
                    aria-label={t("phoneLocale.selection.exit")}
                    onClick={onExit}
                >
                    <CloseIcon />
                </button>
                <h2 className={"selection_bar_count"}>
                    {t("phoneLocale.selection.selected", { count })}
                </h2>
            </div>
            <div className={"selection_bar_end"}>
                <button
                    type={"button"}
                    className={"plain_button selection_bar_text"}
                    aria-disabled={isEmpty ? true : undefined}
                    onClick={isEmpty ? undefined : onAll}
                >
                    {t("phoneLocale.selection.all")}
                </button>
                <button
                    type={"button"}
                    className={"plain_button selection_bar_text"}
                    aria-disabled={isEmpty ? true : undefined}
                    onClick={isEmpty ? undefined : onBetween}
                >
                    {t("phoneLocale.selection.between")}
                </button>
                <button
                    type={"button"}
                    className={"plain_button selection_bar_icon"}
                    aria-label={t("phoneLocale.appBar.more")}
                    aria-haspopup={"menu"}
                    aria-disabled={isEmpty ? true : undefined}
                    onClick={isEmpty ? undefined : onMenu}
                >
                    <MoreVerticalIcon />
                </button>
            </div>
        </div>
    );
}
