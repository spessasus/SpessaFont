import "./cell/generator_cell.css";
import type * as React from "react";
import type { BasicInstrument, BasicPreset } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./cell/generator_cell.tsx";
import { RangeGeneratorCell } from "./cell/range_cell.tsx";
import { OffsetGeneratorCell } from "./cell/offset_cell.tsx";
import type { GeneratorRowType } from "./generator_row_type.ts";
import type { ZoneColumn } from "./zone_columns.ts";
import { GENERATOR_UNITS } from "./generator_unit.ts";
import { isRangeGenerator } from "./cell/range_generator.ts";
import { isOffsetGenerator } from "./cell/offset_generator.ts";

interface GeneratorCellProps {
    element: BasicPreset | BasicInstrument;
    row: GeneratorRowType;
    column: ZoneColumn;
    label: string;
    selectedColumns: readonly ZoneColumn[];
    onSelect: (event: React.MouseEvent) => void;
}

function GeneratorCell({
    element,
    row,
    column,
    label,
    selectedColumns,
    onSelect
}: GeneratorCellProps) {
    const { generator } = row;
    if (isRangeGenerator(generator)) {
        return (
            <RangeGeneratorCell
                element={element}
                column={column}
                generator={generator}
                label={label}
            />
        );
    }
    if (isOffsetGenerator(generator)) {
        return (
            <OffsetGeneratorCell
                element={element}
                column={column}
                generator={generator}
                label={label}
            />
        );
    }
    return (
        <NumberGeneratorCell
            element={element}
            column={column}
            row={row}
            label={label}
            isSelected={selectedColumns.includes(column)}
            selectedColumns={selectedColumns}
            onSelect={onSelect}
        />
    );
}

interface GeneratorRowProps {
    element: BasicPreset | BasicInstrument;
    row: GeneratorRowType;
    /**
     * The global zone column followed by the zone columns.
     */
    columns: readonly ZoneColumn[];
    /**
     * The view ids of the selected zones in this row.
     */
    selectedZoneIds: ReadonlySet<number>;
    onSelectCell: (zoneId: number, event: React.MouseEvent) => void;
}

export function GeneratorRow({
    element,
    row,
    columns,
    selectedZoneIds,
    onSelectCell
}: GeneratorRowProps) {
    const { t } = useTranslation();
    const name = t(generatorLocaleMap[row.generator]);
    const unit = row.unit ? GENERATOR_UNITS[row.unit] : undefined;
    const selectedColumns = columns.filter((c) =>
        selectedZoneIds.has(c.zone.id)
    );
    return (
        <tr
            className={
                row.highlight ? "generator_row_highlight" : "generator_row"
            }
        >
            <th className={"generator_cell_header"} scope={"row"}>
                <div>
                    <span>{name}</span>
                    {unit ? <i title={t(unit.full)}>{t(unit.suffix)}</i> : null}
                </div>
            </th>
            {columns.map((column) => (
                <GeneratorCell
                    key={column.zone.id}
                    element={element}
                    row={row}
                    column={column}
                    label={t("soundBankLocale.cellLabel", {
                        generator: name,
                        zone: column.name
                    })}
                    selectedColumns={selectedColumns}
                    onSelect={(e) => onSelectCell(column.zone.id, e)}
                />
            ))}
        </tr>
    );
}
