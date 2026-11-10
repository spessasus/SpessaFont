import { useTranslation } from "react-i18next";
import { MODULATOR_LIST_BUTTON_CLASS } from "./modulator_list_button.ts";

interface ModulatorNewButtonProps {
    onAdd: () => void;
}

/**
 * The New button, which sits in the action bar, or in the header on a phone.
 */
export function ModulatorNewButton({ onAdd }: ModulatorNewButtonProps) {
    const { t } = useTranslation();
    return (
        <button
            type={"button"}
            onClick={onAdd}
            className={`${MODULATOR_LIST_BUTTON_CLASS} modulator_new_button`}
        >
            {t("modulatorLocale.newModulator")}
        </button>
    );
}
