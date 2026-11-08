import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../fancy_inputs/segmented_control/segmented_control.tsx";
import { ChevronDownIcon, ChevronUpIcon } from "../utils/icons/app_icons.tsx";
import type { PhoneGridMode } from "./generator_groups.ts";
import "./grid_view_bar_phone.css";

interface GridViewBarProps {
    mode: PhoneGridMode;
    onModeChange: (mode: PhoneGridMode) => void;
    isValuesOnly: boolean;
    onValuesOnlyChange: (isValuesOnly: boolean) => void;
    areAllCollapsed: boolean;
    onToggleAll: () => void;
}

/**
 * The bar above the phone grid: Grid or One zone, Values only, and collapse or expand all.
 */
export function GridViewBar({
    mode,
    onModeChange,
    isValuesOnly,
    onValuesOnlyChange,
    areAllCollapsed,
    onToggleAll
}: GridViewBarProps) {
    const { t } = useTranslation();
    return (
        <div className={"grid_view_bar"}>
            <SegmentedControl<PhoneGridMode>
                label={t("phoneLocale.grid.viewMode")}
                options={[
                    { value: "grid", label: t("phoneLocale.grid.grid") },
                    { value: "oneZone", label: t("phoneLocale.grid.oneZone") }
                ]}
                value={mode}
                onChange={onModeChange}
            />
            <button
                type={"button"}
                className={"pretty_button grid_view_bar_values"}
                aria-pressed={isValuesOnly}
                onClick={() => onValuesOnlyChange(!isValuesOnly)}
            >
                {t("phoneLocale.grid.valuesOnly")}
            </button>
            <button
                type={"button"}
                className={"plain_button grid_view_bar_all"}
                aria-label={
                    areAllCollapsed
                        ? t("phoneLocale.grid.expandAll")
                        : t("phoneLocale.grid.collapseAll")
                }
                onClick={onToggleAll}
            >
                {areAllCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
            </button>
        </div>
    );
}
