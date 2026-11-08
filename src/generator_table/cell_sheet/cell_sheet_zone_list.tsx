import { useTranslation } from "react-i18next";
import { GeneratorTypes } from "spessasynth_core";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import { VirtualItemList } from "../../menu_list/virtual_item_list.tsx";
import type { CellContext } from "../cell/cell_values.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import { getZoneColorVariable } from "../zone_color.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { formatKeyRange, getColumnKeyRange } from "../zone_finder.ts";
import { describeSheetValue } from "./cell_sheet_text.ts";

interface CellSheetZoneListProps {
    context: CellContext;
    /**
     * The row's columns, the global zone first.
     */
    columns: readonly ZoneColumn[];
    /**
     * The row's zone that the list keeps in view, the first checked one.
     */
    focusedZone: ZoneView | undefined;
    /**
     * The grid's zone columns (never split), which give each zone its header color.
     */
    colorColumns: readonly ZoneColumn[];
    globalZone: ZoneView;
    checkedIds: ReadonlySet<number>;
    onToggle: (zoneId: number) => void;
}

/**
 * The cell sheet's zones, each with a checkbox and the value it plays.
 */
export function CellSheetZoneList({
    context,
    columns,
    focusedZone,
    colorColumns,
    globalZone,
    checkedIds,
    onToggle
}: CellSheetZoneListProps) {
    const columnOfZone = new Map(columns.map((c) => [c.zone, c]));
    return (
        <VirtualItemList
            items={columns.map((c) => c.zone)}
            focusedItem={focusedZone}
            rowEstimate={48}
            renderItem={(zone) => {
                const column = columnOfZone.get(zone);
                return column ? (
                    <CellSheetZoneRow
                        context={context}
                        column={column}
                        colorIndex={colorColumns.findIndex(
                            (c) =>
                                c.zone === zone ||
                                (c.linkedZone !== undefined &&
                                    c.linkedZone === zone)
                        )}
                        globalZone={globalZone}
                        isChecked={checkedIds.has(zone.id)}
                        onToggle={() => onToggle(zone.id)}
                    />
                ) : null;
            }}
        />
    );
}

interface CellSheetZoneRowProps {
    context: CellContext;
    column: ZoneColumn;
    /**
     * The zone's number in the grid, -1 for the global zone, which has no color.
     */
    colorIndex: number;
    globalZone: ZoneView;
    isChecked: boolean;
    onToggle: () => void;
}

function CellSheetZoneRow({
    context,
    column,
    colorIndex,
    globalZone,
    isChecked,
    onToggle
}: CellSheetZoneRowProps) {
    const { t } = useTranslation();
    const isGlobal = column.zone.id === globalZone.id;
    const value = describeSheetValue(context, column, globalZone);
    const options = getGeneratorOptions(context.row.generator);
    // Option rows show the option's name, like their grid cells
    const format = (text: string) => {
        const option = options?.find((o) => String(o.value) === text);
        return option ? t(option.label) : text;
    };
    return (
        <label className={"cell_sheet_zone_row"} data-checked={isChecked}>
            <input
                type={"checkbox"}
                className={"cell_sheet_checkbox"}
                checked={isChecked}
                onChange={onToggle}
            />
            <span
                className={"cell_sheet_zone_swatch"}
                style={
                    colorIndex === -1
                        ? undefined
                        : { background: getZoneColorVariable(colorIndex) }
                }
            />
            <span className={"cell_sheet_zone_text"}>
                <span className={"cell_sheet_zone_name"}>{column.name}</span>
                {/* The key range row's values are the ranges already */}
                {!isGlobal &&
                context.isInstrument &&
                context.row.generator !== GeneratorTypes.keyRange ? (
                    <span className={"cell_sheet_zone_range"}>
                        {formatKeyRange(getColumnKeyRange(column, globalZone))}
                    </span>
                ) : null}
            </span>
            {value.kind === "inherited" ? (
                <span className={"cell_sheet_zone_value"}>
                    {format(value.text)}
                    <span className={"cell_sheet_zone_source"}>
                        {value.source === "global"
                            ? t("phoneLocale.cellSheet.fromGlobal")
                            : t("phoneLocale.cellSheet.fromDefault")}
                    </span>
                </span>
            ) : (
                <span className={"cell_sheet_zone_value"} data-own={true}>
                    {value.kind === "own"
                        ? format(value.text)
                        : t("phoneLocale.cellSheet.stereoValues", {
                              left: format(value.left),
                              right: format(value.right)
                          })}
                </span>
            )}
        </label>
    );
}
