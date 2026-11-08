import { useTranslation } from "react-i18next";
import type { ZoneView } from "../../core_backend/entity_views.ts";
import { VirtualItemList } from "../../menu_list/virtual_item_list.tsx";
import type { CellContext } from "../cell/cell_values.ts";
import { getGeneratorOptions } from "../generator_options.ts";
import type { ZoneColumn } from "../zone_columns.ts";
import { formatKeyRange, getColumnKeyRange } from "../zone_finder.ts";
import { describeSheetValue } from "./cell_sheet_text.ts";

interface CellSheetZoneListProps {
    context: CellContext;
    /**
     * The row's columns, the global zone first.
     */
    columns: readonly ZoneColumn[];
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
    globalZone,
    checkedIds,
    onToggle
}: CellSheetZoneListProps) {
    const columnOfZone = new Map(columns.map((c) => [c.zone, c]));
    return (
        <VirtualItemList
            items={columns.map((c) => c.zone)}
            focusedItem={undefined}
            rowEstimate={48}
            renderItem={(zone) => {
                const column = columnOfZone.get(zone);
                return column ? (
                    <CellSheetZoneRow
                        context={context}
                        column={column}
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
    globalZone: ZoneView;
    isChecked: boolean;
    onToggle: () => void;
}

function CellSheetZoneRow({
    context,
    column,
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
            <span className={"cell_sheet_zone_name"}>{column.name}</span>
            {!isGlobal && context.isInstrument ? (
                <span className={"cell_sheet_zone_range"}>
                    {formatKeyRange(getColumnKeyRange(column, globalZone))}
                </span>
            ) : null}
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
