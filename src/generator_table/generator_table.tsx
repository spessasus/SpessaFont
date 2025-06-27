import { BasicGlobalZone, BasicInstrumentZone, BasicPresetZone } from "spessasynth_core";
import type { GeneratorRowType } from "../instrument_editor/instrument_editor.tsx";
import { GeneratorTableHeader } from "./table_header.tsx";
import { NumberGeneratorRow } from "./generator_row.tsx";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import "./generator_table.css";
import { useMemo } from "react";

/**
 * 0 - no link
 * 1 - first zone of the linked pair
 * 2 - second zone of the linked pair
 */
export type LinkedZoneMap<T extends BasicPresetZone | BasicInstrumentZone> = {
    index: 0 | 1 | 2;
    zone: T | undefined;
}[];

export function GeneratorTable<
    T extends BasicPresetZone | BasicInstrumentZone
>({
    name,
    zones,
    global,
    callback,
    manager,
    rows,
    setView
}: {
    name: string;
    zones: T[];
    global: BasicGlobalZone;
    callback: () => unknown;
    rows: GeneratorRowType[];
    setView: SetViewType;
    manager: SoundBankManager;
}) {
    // if true, the next zone is a stereo sample pair!
    const linkedZoneMap: LinkedZoneMap<T> = useMemo(
        () =>
            zones.map((z, i) => {
                let linkedZoneIndex = -1;
                if (z instanceof BasicInstrumentZone) {
                    const linkedSample = z.sample.linkedSample;
                    if (linkedSample) {
                        linkedZoneIndex = zones.findIndex(
                            (z) =>
                                z instanceof BasicInstrumentZone &&
                                z.sample === linkedSample
                        );
                    }
                }
                if (linkedZoneIndex < 0) {
                    return { index: 0, zone: undefined };
                }
                const linkedZone = zones[linkedZoneIndex];
                if (linkedZoneIndex === i + 1) {
                    return { index: 1, zone: linkedZone };
                }
                if (linkedZoneIndex === i - 1) {
                    return { index: 2, zone: linkedZone };
                }
                return { index: 0, zone: linkedZone };
            }),
        [zones]
    );

    return (
        <table
            className={"zone_table"}
            onKeyDown={(e) => {
                const targetType = e.target as HTMLElement;
                if (targetType.nodeName !== "INPUT") {
                    return;
                }
                const target = targetType.parentElement as HTMLTableCellElement;
                const rowEl = target.parentElement as HTMLTableRowElement;
                const table = rowEl.parentElement as HTMLTableElement;
                // subtract one because of the header column
                let col =
                    Array.prototype.indexOf.call(rowEl.children, target) - 1;
                let row = Array.prototype.indexOf.call(table.children, rowEl);
                switch (e.key) {
                    default:
                        return;
                    case "ArrowUp":
                        row = Math.max(0, row - 1);
                        e.preventDefault();
                        break;

                    case "ArrowDown":
                        row = Math.min(table.children.length - 1, row + 1);
                        e.preventDefault();
                        break;

                    case "ArrowLeft":
                        col = Math.max(0, col - 1);
                        e.preventDefault();
                        break;

                    case "ArrowRight":
                        col = Math.min(rowEl.children.length - 2, col + 1);
                        e.preventDefault();
                        break;
                }
                const nextEl = table.children?.[row]?.children?.[col + 1];
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
                    setView={setView}
                />
            </thead>
            <tbody>
                {rows.map((row) => (
                    <NumberGeneratorRow<T>
                        key={row.generator}
                        generator={row.generator}
                        manager={manager}
                        zones={zones}
                        linkedZoneMap={linkedZoneMap}
                        callback={callback}
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
    );
}
