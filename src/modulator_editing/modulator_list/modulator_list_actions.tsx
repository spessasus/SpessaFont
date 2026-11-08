import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "./modulator_list_phone.css";

const BUTTON_CLASS = "modulator_main modulator_list_button hover_brightness";

interface ModulatorListActionsProps {
    count: number;
    canPaste: boolean;
    hasSelection: boolean;
    onAdd: () => void;
    onPaste: () => void;
    onCopy: () => void;
    onDelete: () => void;
    children?: ReactNode;
}

export function ModulatorListActions({
    count,
    canPaste,
    hasSelection,
    onAdd,
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
            <button
                type={"button"}
                onClick={onAdd}
                className={`${BUTTON_CLASS} modulator_new_button`}
            >
                {t("modulatorLocale.newModulator")}
            </button>
            {canPaste ? (
                <button
                    type={"button"}
                    onClick={onPaste}
                    className={BUTTON_CLASS}
                >
                    {t("paste")}
                </button>
            ) : null}
            {hasSelection ? (
                <>
                    <button
                        type={"button"}
                        onClick={onCopy}
                        className={BUTTON_CLASS}
                    >
                        {t("copy")}
                    </button>
                    <button
                        type={"button"}
                        onClick={onDelete}
                        className={BUTTON_CLASS}
                    >
                        {t("delete")}
                    </button>
                </>
            ) : null}
            {children}
        </div>
    );
}
