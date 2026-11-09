import { useTranslation } from "react-i18next";

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
            className={
                "modulator_main modulator_list_button hover_brightness modulator_new_button"
            }
        >
            {t("modulatorLocale.newModulator")}
        </button>
    );
}
