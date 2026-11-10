import type * as React from "react";
import type { Ref } from "react";
import { useTranslation } from "react-i18next";
import type { ModulatorView } from "../../core_backend/entity_views.ts";
import { useTranslatedOptions } from "../../utils/translated_options/translated_options_context.ts";
import {
    ChevronDownIcon,
    ChevronUpIcon
} from "../../utils/icons/app_icons.tsx";
import { getModulatorSummaryText } from "./modulator_summary_text.ts";

interface ModulatorSummaryProps {
    /**
     * The number button, for moving the focus after a removal.
     */
    ref?: Ref<HTMLButtonElement>;
    mod: ModulatorView;
    modulatorNumber: number;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onSelect: (e: React.MouseEvent) => void;
}

/**
 * A phone modulator row (spec 10): the number, which selects like the card's, then the
 * sources, the destination and the amount, which open the form.
 */
export function ModulatorSummary({
    ref,
    mod,
    modulatorNumber,
    isSelected,
    isExpanded,
    onToggleExpanded,
    onSelect
}: ModulatorSummaryProps) {
    const { t } = useTranslation();
    const options = useTranslatedOptions();
    const text = getModulatorSummaryText(mod, options, t);
    return (
        <div
            className={"modulator_summary"}
            data-selected={isSelected}
            data-expanded={isExpanded}
        >
            <button
                ref={ref}
                type={"button"}
                className={"plain_button modulator_summary_number monospaced"}
                aria-label={t("modulatorLocale.modulatorNumber", {
                    number: modulatorNumber
                })}
                aria-pressed={isSelected}
                onClick={onSelect}
            >
                #{modulatorNumber}
            </button>
            <button
                type={"button"}
                className={"plain_button modulator_summary_toggle"}
                aria-expanded={isExpanded}
                onClick={onToggleExpanded}
            >
                <span className={"modulator_summary_lines"}>
                    <span className={"modulator_summary_source"}>
                        {text.source}
                    </span>
                    <span className={"modulator_summary_destination"}>
                        → {text.destination}
                    </span>
                </span>
                <span className={"modulator_summary_amount monospaced"}>
                    {text.amount}
                </span>
                <span
                    className={"modulator_summary_chevron"}
                    aria-hidden={true}
                >
                    {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </span>
            </button>
        </div>
    );
}
