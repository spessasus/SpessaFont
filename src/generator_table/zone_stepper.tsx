import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";
import type { ZoneColumn } from "./zone_columns.ts";
import {
    ChevronLeftIcon,
    ChevronRightIcon
} from "../utils/icons/app_icons.tsx";
import { getZoneNameKey } from "./table_navigation.ts";

interface ZoneStepperProps {
    column: ZoneColumn;
    /**
     * The zone's key range as text, undefined for zones that have none (presets).
     */
    keyRange: string | undefined;
    index: number;
    count: number;
    /**
     * The name button's tab index, as it is a grid item of the table.
     */
    tabIndex: number;
    onStep: (direction: 1 | -1) => void;
    onOpen: (e: MouseEvent) => void;
}

/**
 * The header of the phone's One zone column: the previous and next zone around the zone's name,
 * which opens the zone header sheet.
 */
export function ZoneStepper({
    column,
    keyRange,
    index,
    count,
    tabIndex,
    onStep,
    onOpen
}: ZoneStepperProps) {
    const { t } = useTranslation();
    const position = t("phoneLocale.grid.zonePosition", {
        index: index + 1,
        count
    });
    const isFirst = index <= 0;
    const isLast = index >= count - 1;
    return (
        <div className={"zone_stepper"}>
            <button
                type={"button"}
                className={"plain_button zone_stepper_step"}
                aria-label={t("phoneLocale.grid.previousZone")}
                aria-disabled={isFirst}
                tabIndex={-1}
                onClick={() => {
                    if (!isFirst) {
                        onStep(-1);
                    }
                }}
            >
                <ChevronLeftIcon />
            </button>
            <button
                type={"button"}
                className={"plain_button header_cell_name zone_stepper_name"}
                data-grid-key={getZoneNameKey(column.zone.id)}
                tabIndex={tabIndex}
                onClick={onOpen}
            >
                <span className={"zone_header_name"}>{column.name}</span>
                <span className={"zone_header_range"}>
                    {keyRange === undefined
                        ? position
                        : `${keyRange} · ${position}`}
                </span>
            </button>
            <button
                type={"button"}
                className={"plain_button zone_stepper_step"}
                aria-label={t("phoneLocale.grid.nextZone")}
                aria-disabled={isLast}
                tabIndex={-1}
                onClick={() => {
                    if (!isLast) {
                        onStep(1);
                    }
                }}
            >
                <ChevronRightIcon />
            </button>
        </div>
    );
}
