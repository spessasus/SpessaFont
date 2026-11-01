import {
    BasicInstrument,
    type BasicPreset,
    type BasicZone,
    GeneratorTypes
} from "spessasynth_core";
import type { GeneratorRowType } from "./generator_row_type.ts";
import { GeneratorTableHeader } from "./table_header.tsx";
import { GeneratorRow } from "./generator_row.tsx";
import "./generator_table.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratorTableModulatorRow } from "./modulator_row.tsx";
import { ModulatorEditor } from "./modulator_edit/modulator_edit.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";
import { useEntityRevision } from "../hooks/use_entity_revision.ts";
import { getZoneColumns, type ZoneColumn } from "./zone_columns.ts";
import { moveTableFocus } from "./table_navigation.ts";

interface GeneratorTableProps {
    element: BasicPreset | BasicInstrument;
    rows: readonly GeneratorRowType[];
}

/**
 * Rendered with a key per element, so the modulator editor closes when the element changes.
 */
export function GeneratorTable({ element, rows }: GeneratorTableProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    // The zones are mutable, so re-render when the element or its zones change
    useEntityRevision(session.store, element);
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.defaultModulators
    );
    const [editedZone, setEditedZone] = useState<BasicZone | null>(null);

    const globalColumn: ZoneColumn = {
        zone: element.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: t("soundBankLocale.globalZone")
    };
    const zoneColumns = getZoneColumns(element.zones);
    const columns = [globalColumn, ...zoneColumns];
    // Pan differs between the left and right sample, so stereo pairs are edited separately
    const splitColumns = [globalColumn, ...getZoneColumns(element.zones, true)];

    // The edited zone may be gone after an undo, which closes the editor
    const editedColumn = columns.find((c) => c.zone === editedZone);
    if (editedColumn) {
        return (
            <ModulatorEditor
                name={editedColumn.name}
                zone={editedColumn.zone}
                linkedZone={editedColumn.linkedZone}
                onClose={() => setEditedZone(null)}
                element={element}
                defaultModulators={
                    element instanceof BasicInstrument ? defaultModulators : []
                }
            />
        );
    }

    return (
        <div className={"zone_table_wrapper"}>
            <table className={"zone_table"} onKeyDown={moveTableFocus}>
                <thead>
                    <GeneratorTableHeader
                        element={element}
                        columns={zoneColumns}
                    />
                    <GeneratorTableModulatorRow
                        columns={columns}
                        onEditModulators={setEditedZone}
                    />
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <GeneratorRow
                            key={row.generator}
                            element={element}
                            row={row}
                            columns={
                                row.generator === GeneratorTypes.pan
                                    ? splitColumns
                                    : columns
                            }
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
}
