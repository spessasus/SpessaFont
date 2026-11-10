import type * as React from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import { useLayout } from "../../layout/layout_context.ts";
import { DeleteIcon } from "../../utils/icons/edit_icons.tsx";

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
 * The number button that selects the modulator, and its delete button. A phone form has no
 * number button, as its summary row's number selects.
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
    const layout = useLayout();
    const deletionLabel = t("modulatorLocale.deleteModulator", {
        number: modulatorNumber
    });
    const trashButton = (
        <button
            type={"button"}
            className={"plain_button modulator_title_right"}
            aria-label={deletionLabel}
            title={deletionLabel}
            onClick={onDelete}
        >
            {layout === "phone" ? <DeleteIcon /> : <>&times;</>}
        </button>
    );
    return layout === "phone" ? (
        trashButton
    ) : (
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
            {trashButton}
        </>
    );
}
