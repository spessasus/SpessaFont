import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./modulator_list_phone.css";
import { MODULATOR_LIST_BUTTON_CLASS } from "./modulator_list_button.ts";

interface ModulatorListActionsProps {
    count: number;
    canPaste: boolean;
    hasSelection: boolean;
    /**
     * The New button, null while the header holds it.
     */
    newButton: ReactNode;
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
    onPaste,
    onCopy,
    onDelete,
    children
}: ModulatorListActionsProps) {
    const { t } = useTranslation();
    return (
        <div className={"action_buttons"}>
            <span className={"modulator_main modulator_list_button"}>
                {t("modulatorLocale.modulatorCount", { count })}
            </span>
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
