import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    BasicPresetZone,
    type BasicZone
} from "spessasynth_core";
import type { GeneratorRowType } from "../instrument_editor/instrument_editor.tsx";
import { GeneratorTableHeader } from "./table_header.tsx";
import { NumberGeneratorRow } from "./generator_row.tsx";
import "./generator_table.css";
import { useState } from "react";
import { GeneratorTableModulatorRow } from "./modulator_row.tsx";
import { type ModulatorListGlobals } from "../modulator_editing/modulator_list/modulator_list.tsx";
import { ModulatorEditor } from "./modulator_edit/modulator_edit.tsx";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { useBankSnapshot } from "../hooks/use_bank_snapshot.ts";

/**
 * 0 - no link
 * 1 - first zone of the linked pair
 * 2 - second zone of the linked pair
 */
export type LinkedZoneMap<T extends BasicPresetZone | BasicInstrumentZone> = {
    index: 0 | 1 | 2;
    linkedZone: T | undefined;
}[];

/**
 * Pairs each zone with its stereo partner, if the partner is the zone right before or after it.
 */
function getLinkedZoneMap<
    ZoneType extends BasicPresetZone | BasicInstrumentZone
>(zones: ZoneType[]): LinkedZoneMap<ZoneType> {
    const linkedZones = new Set<BasicZone>();
    return zones.map((z, i) => {
        let linkedZoneIndex = -1;
        if (z instanceof BasicInstrumentZone) {
            const linkedSample = z.sample.linkedSample;
            if (linkedSample) {
                linkedZoneIndex = zones.findIndex(
                    (z) =>
                        !linkedZones.has(z) &&
                        z instanceof BasicInstrumentZone &&
                        z.sample === linkedSample
                );
            }
        }
        if (linkedZoneIndex < 0) {
            return {
                index: 0,
                linkedZone: undefined
            };
        }
        const linkedZone = zones[linkedZoneIndex];
        if (linkedZoneIndex === i + 1) {
            return {
                index: 1,
                linkedZone: linkedZone
            };
        }
        if (linkedZoneIndex === i - 1) {
            linkedZones.add(linkedZone);
            linkedZones.add(z);
            return {
                index: 2,
                linkedZone: linkedZone
            };
        }
        return {
            index: 0,
            linkedZone: linkedZone
        };
    });
}

/**
 * Rendered with a key per element, so the modulator editor closes when the element changes.
 */
export function GeneratorTable<
    ZoneType extends BasicPresetZone | BasicInstrumentZone,
    ElementType extends BasicPreset | BasicInstrument
>({
    name,
    zones,
    global,
    rows,
    element,
    ccOptions,
    destinationOptions
}: {
    name: string;
    element: ElementType;
    zones: ZoneType[];
    global: BasicZone;
    rows: GeneratorRowType[];
} & ModulatorListGlobals) {
    const { session } = useBankEditor();
    const defaultModulators = useBankSnapshot(
        session.store,
        (s) => s.defaultModulators
    );
    const [editedModulatorsZone, setEditedModulatorsZone] = useState<{
        zone: ZoneType;
        name: string;
    } | null>(null);

    const linkedZoneMap = getLinkedZoneMap(zones);

    if (editedModulatorsZone?.zone) {
        return (
            <ModulatorEditor
                name={editedModulatorsZone.name}
                zone={editedModulatorsZone.zone}
                linkedZone={
                    linkedZoneMap?.[zones.indexOf(editedModulatorsZone.zone)]
                        ?.linkedZone
                }
                ccOptions={ccOptions}
                destinationOptions={destinationOptions}
                onClose={() => setEditedModulatorsZone(null)}
                element={element}
                defaultModulators={
                    element instanceof BasicInstrument ? defaultModulators : []
                }
            />
        );
    }

    return (
        <>
            <div className={"zone_table_wrapper"}>
                <table
                    className={"zone_table"}
                    onKeyDown={(e) => {
                        const targetType = e.target as HTMLElement;
                        if (targetType.nodeName !== "INPUT") {
                            return;
                        }
                        const target =
                            targetType.parentElement as HTMLTableCellElement;
                        const rowEl =
                            target.parentElement as HTMLTableRowElement;
                        const table = rowEl.parentElement as HTMLTableElement;
                        // subtract one because of the header column
                        let col =
                            Array.prototype.indexOf.call(
                                rowEl.children,
                                target
                            ) - 1;
                        let row = Array.prototype.indexOf.call(
                            table.children,
                            rowEl
                        );
                        switch (e.key) {
                            default: {
                                return;
                            }
                            case "ArrowUp": {
                                row = Math.max(0, row - 1);
                                e.preventDefault();
                                break;
                            }

                            case "ArrowDown": {
                                row = Math.min(
                                    table.children.length - 1,
                                    row + 1
                                );
                                e.preventDefault();
                                break;
                            }

                            case "ArrowLeft": {
                                col = Math.max(0, col - 1);
                                e.preventDefault();
                                break;
                            }

                            case "ArrowRight": {
                                col = Math.min(
                                    rowEl.children.length - 2,
                                    col + 1
                                );
                                e.preventDefault();
                                break;
                            }
                        }
                        const nextEl =
                            table.children?.[row]?.children?.[col + 1];
                        const input = nextEl?.children?.[0] as HTMLInputElement;
                        if (input) {
                            input.focus();
                        }
                    }}
                >
                    <thead>
                        <GeneratorTableHeader
                            linkedZoneMap={linkedZoneMap}
                            name={name}
                            zones={zones}
                            element={element}
                        />
                        <GeneratorTableModulatorRow
                            editModulators={(z, name) =>
                                setEditedModulatorsZone({ zone: z, name })
                            }
                            zones={zones}
                            element={element}
                            linkedZoneMap={linkedZoneMap}
                        />
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <NumberGeneratorRow<ZoneType>
                                key={row.generator}
                                generator={row.generator}
                                element={element}
                                zones={zones}
                                linkedZoneMap={linkedZoneMap}
                                global={global}
                                fromGenerator={row.fromGenerator}
                                toGenerator={row.toGenerator}
                                unit={row.unit}
                                precision={row.precision}
                                highlight={row.highlight}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
