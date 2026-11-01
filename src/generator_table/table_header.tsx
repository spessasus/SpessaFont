import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import "./header_cell.css";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../utils/object_id.ts";
import type { ZoneColumn } from "./zone_columns.ts";

interface GeneratorTableHeaderProps {
    element: BasicInstrument | BasicPreset;
    columns: readonly ZoneColumn<BasicPresetZone | BasicInstrumentZone>[];
}

export function GeneratorTableHeader({
    element,
    columns
}: GeneratorTableHeaderProps) {
    const { t } = useTranslation();
    const { apply, setView } = useBankEditor();
    return (
        <tr className={"header_row"}>
            <th
                scope={"col"}
                className={
                    "header_cell " +
                    (element instanceof BasicInstrument
                        ? "instrument"
                        : "preset")
                }
            >
                {element.name}
            </th>
            <th scope={"col"} className={"header_cell"}>
                {t("soundBankLocale.globalZone")}
            </th>
            {columns.map((column) => {
                const { zone, linkedZone, name, isStereo } = column;
                const zoneLabel = t("soundBankLocale.deleteZone", { name });
                return (
                    <th
                        scope={"col"}
                        colSpan={column.colSpan}
                        className={"header_cell " + (isStereo ? "stereo" : "")}
                        key={getObjectId(zone)}
                    >
                        <button
                            type={"button"}
                            className={"plain_button header_cell_name"}
                            title={
                                isStereo
                                    ? t(
                                          "soundBankLocale.thisIsAStereoSamplePair"
                                      )
                                    : undefined
                            }
                            onClick={() =>
                                setView(
                                    zone instanceof BasicInstrumentZone
                                        ? zone.sample
                                        : zone.instrument
                                )
                            }
                        >
                            {name}
                        </button>
                        <button
                            type={"button"}
                            className={"plain_button delete_zone"}
                            aria-label={zoneLabel}
                            title={zoneLabel}
                            onClick={() => {
                                const actions = [
                                    new DeleteZoneAction(element, zone)
                                ];
                                if (linkedZone) {
                                    actions.push(
                                        new DeleteZoneAction(
                                            element,
                                            linkedZone
                                        )
                                    );
                                }
                                apply(actions);
                            }}
                        >
                            ✖
                        </button>
                    </th>
                );
            })}
        </tr>
    );
}
