import type * as React from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";

interface ModulatorHeaderProps {
    /**
     * The number button, which the list focuses after a delete.
     */
    ref?: Ref<HTMLButtonElement>;
    modulatorNumber: number;
    isSelected: boolean;
    isOverridingDefault: boolean;
    onSelect: (e: React.MouseEvent) => void;
    onDelete: () => void;
}

/**
 * The number button that selects the modulator, and its delete button.
 */
export function ModulatorHeader({
    ref,
    modulatorNumber,
    isSelected,
    isOverridingDefault,
    onSelect,
    onDelete
}: ModulatorHeaderProps) {
    const { t } = useTranslation();
    const deletionLabel = t("modulatorLocale.deleteModulator", {
        number: modulatorNumber
    });
    return (
        <>
            <button
                type={"button"}
                ref={ref}
                aria-pressed={isSelected}
                className={`plain_button modulator_title_left ${isOverridingDefault ? "overriding_modulator" : ""}`}
                aria-label={t("modulatorLocale.modulatorNumber", {
                    number: modulatorNumber
                })}
                onClick={onSelect}
            >
                #{modulatorNumber}
            </button>
            <button
                type={"button"}
                className={"plain_button modulator_title_right"}
                aria-label={deletionLabel}
                title={deletionLabel}
                onClick={onDelete}
            >
                &times;
            </button>
        </>
    );
}
