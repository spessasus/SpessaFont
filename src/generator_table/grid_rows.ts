import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
import { readViewCell } from "./cell/cell_values.ts";
import {
    GENERATOR_GROUP_ORDER,
    GROUP_OF_GENERATOR,
    type GeneratorGroup
} from "./generator_groups.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";
import { getViewZones, type ZoneColumn } from "./zone_columns.ts";

export type GridRow =
    | {
          type: "group";
          group: GeneratorGroup;
          visibleCount: number;
          isCollapsed: boolean;
      }
    | { type: "generator"; row: GeneratorRowType }
    | {
          type: "addGenerator";
          group: GeneratorGroup;
          hidden: readonly GeneratorRowType[];
      };

export interface GridRowOptions {
    hasValue: (row: GeneratorRowType) => boolean;
    isValuesOnly: boolean;
    collapsed: ReadonlySet<GeneratorGroup>;
    /**
     * The generator of the open cell sheet, so clearing its last value does not remove its row.
     */
    keptGenerator?: GeneratorType;
}

/**
 * Whether any zone of any column stores a value for the generator.
 */
export function hasStoredValue(
    columns: readonly ZoneColumn[],
    generator: GeneratorType
) {
    return columns.some((column) =>
        getViewZones(column).some(
            (zone) => readViewCell(zone, generator) !== null
        )
    );
}

/**
 * The rows the phone grid shows, group by group.
 */
export function getGridRows(
    rows: readonly GeneratorRowType[],
    { hasValue, isValuesOnly, collapsed, keptGenerator }: GridRowOptions
) {
    const result = new Array<GridRow>();
    for (const group of GENERATOR_GROUP_ORDER) {
        const groupRows = rows.filter(
            (row) => GROUP_OF_GENERATOR.get(row.generator) === group
        );
        if (groupRows.length === 0) {
            continue;
        }
        const visible = new Array<GeneratorRowType>();
        const hidden = new Array<GeneratorRowType>();
        for (const row of groupRows) {
            const isShown =
                !isValuesOnly ||
                row.generator === GeneratorTypes.keyRange ||
                row.generator === GeneratorTypes.velRange ||
                row.generator === keptGenerator ||
                hasValue(row);
            (isShown ? visible : hidden).push(row);
        }
        const isCollapsed = collapsed.has(group);
        result.push({
            type: "group",
            group,
            visibleCount: visible.length,
            isCollapsed
        });
        if (isCollapsed) {
            continue;
        }
        for (const row of visible) {
            result.push({ type: "generator", row });
        }
        if (hidden.length > 0) {
            result.push({ type: "addGenerator", group, hidden });
        }
    }
    return result;
}
