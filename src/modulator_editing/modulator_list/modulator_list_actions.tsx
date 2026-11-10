import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./modulator_list_phone.css";
import { MODULATOR_LIST_BUTTON_CLASS } from "./modulator_list_button.ts";
import { useLayout } from "../../layout/layout_context.ts";

interface ModulatorListActionsProps {
    count: number;
    canPaste: boolean;
    hasSelection: boolean;
    /**
     * The New button, null while the header holds it.
     */
    newButton: ReactNode;
    /**
     * All and Between, which only phones show.
     */
    selectionActions?: ReactNode;
    onPaste: () => void;
    onCopy: () => void;
    onDelete: () => void;
    children?: ReactNode;
}

export function ModulatorListActions({
    count,
    canPaste,
    hasSelection,
    newButton,
    selectionActions,
    onPaste,
    onCopy,
    onDelete,
    children
}: ModulatorListActionsProps) {
    const { t } = useTranslation();
    const layout = useLayout();
    const countChip = (
        <span className={"modulator_main modulator_list_button"}>
            {t("modulatorLocale.modulatorCount", { count })}
        </span>
    );
    if (layout === "phone") {
        // Every button stays where it is and only enables, so a selection does not move the
        // rows under the finger
        return (
            <div className={"action_buttons"}>
                {countChip}
                {newButton}
                {selectionActions}
                <button
                    type={"button"}
                    aria-disabled={canPaste ? undefined : true}
                    onClick={canPaste ? onPaste : undefined}
                    className={MODULATOR_LIST_BUTTON_CLASS}
                >
                    {t("paste")}
                </button>
                <button
                    type={"button"}
                    aria-disabled={hasSelection ? undefined : true}
                    onClick={hasSelection ? onCopy : undefined}
                    className={MODULATOR_LIST_BUTTON_CLASS}
                >
                    {t("copy")}
                </button>
                <button
                    type={"button"}
                    aria-disabled={hasSelection ? undefined : true}
                    onClick={hasSelection ? onDelete : undefined}
                    className={MODULATOR_LIST_BUTTON_CLASS}
                >
                    {t("delete")}
                </button>
                {children}
            </div>
        );
    }
    return (
        <div className={"action_buttons"}>
            {countChip}
            {newButton}
            {canPaste ? (
                <button
                    type={"button"}
                    onClick={onPaste}
                    className={MODULATOR_LIST_BUTTON_CLASS}
                >
                    {t("paste")}
                </button>
            ) : null}
            {hasSelection ? (
                <>
                    <button
                        type={"button"}
                        onClick={onCopy}
                        className={MODULATOR_LIST_BUTTON_CLASS}
                    >
                        {t("copy")}
                    </button>
                    <button
                        type={"button"}
                        onClick={onDelete}
                        className={MODULATOR_LIST_BUTTON_CLASS}
                    >
                        {t("delete")}
                    </button>
                </>
            ) : null}
            {children}
        </div>
    );
}
