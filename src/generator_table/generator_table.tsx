import {
    BasicInstrument,
    type BasicPreset,
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
import { getObjectId } from "../utils/object_id.ts";
import {
    getZoneColumns,
    type ZoneChildren,
    type ZoneColumn
} from "./zone_columns.ts";
import { moveTableFocus } from "./table_navigation.ts";

interface GeneratorTableProps {
    /**
     * The edited element, for the actions. What the table shows comes from its view.
     */
    element: BasicPreset | BasicInstrument;
    rows: readonly GeneratorRowType[];
}

/**
 * Rendered with a key per element, so the modulator editor closes when the element changes.
 */
export function GeneratorTable({ element, rows }: GeneratorTableProps) {
    const { t } = useTranslation();
    const { session } = useBankEditor();
    const isInstrument = element instanceof BasicInstrument;
    const id = getObjectId(element);
    const view = useBankSnapshot(session.store, (s) =>
        isInstrument ? s.views.instruments.get(id) : s.views.presets.get(id)
    );
    const sampleViews = useBankSnapshot(session.store, (s) => s.views.samples);
    const instrumentViews = useBankSnapshot(
        session.store,
        (s) => s.views.instruments
    );
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.views.defaultModulators
    );
    const [editedZoneId, setEditedZoneId] = useState<number | null>(null);
    // The pane closes when its element is removed, this only covers the render before
    if (!view) {
        return null;
    }
    const children: ZoneChildren = isInstrument
        ? { kind: "samples", views: sampleViews }
        : { kind: "instruments", views: instrumentViews };

    const globalColumn: ZoneColumn = {
        zone: view.globalZone,
        linkedZone: undefined,
        colSpan: 1,
        isStereo: false,
        name: t("soundBankLocale.globalZone"),
        sample: undefined
    };
    const zoneColumns = getZoneColumns(view.zones, children);
    const columns = [globalColumn, ...zoneColumns];
    // Pan differs between the left and right sample, so stereo pairs are edited separately
    const splitColumns = [
        globalColumn,
        ...getZoneColumns(view.zones, children, true)
    ];

    // The edited zone may be gone after an undo, which closes the editor
    const editedColumn = columns.find((c) => c.zone.id === editedZoneId);
    if (editedColumn) {
        return (
            <ModulatorEditor
                name={editedColumn.name}
                column={editedColumn}
                onClose={() => setEditedZoneId(null)}
                element={element}
                defaultModulators={isInstrument ? defaultModulators : []}
            />
        );
    }

    return (
        <div className={"zone_table_wrapper"}>
            <table className={"zone_table"} onKeyDown={moveTableFocus}>
                <thead>
                    <GeneratorTableHeader
                        element={element}
                        name={view.name}
                        columns={zoneColumns}
                    />
                    <GeneratorTableModulatorRow
                        columns={columns}
                        onEditModulators={setEditedZoneId}
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
