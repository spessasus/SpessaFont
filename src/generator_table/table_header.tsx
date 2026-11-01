import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { LinkedZoneMap } from "./generator_table.tsx";
import "./header_cell.css";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";
import { useBankEditor } from "../bank_editor/bank_editor_context.ts";
import { getObjectId } from "../utils/object_id.ts";

export function GeneratorTableHeader<
    ZoneType extends BasicPresetZone | BasicInstrumentZone
>({
    zones,
    element,
    name,
    linkedZoneMap
}: {
    name: string;
    element: BasicInstrument | BasicPreset;
    zones: ZoneType[];
    linkedZoneMap: LinkedZoneMap<ZoneType>;
}) {
    const { t } = useTranslation();
    const { apply, setView } = useBankEditor();
    return (
        <tr className={"header_row"}>
            <th
                className={
                    "header_cell " +
                    (element instanceof BasicInstrument
                        ? "instrument"
                        : "preset")
                }
            >
                {name}
            </th>
            <th className={"header_cell"}>{t("soundBankLocale.globalZone")}</th>
            {zones.map((z, i) => {
                const linked = linkedZoneMap[i];
                if (linked.index === 1) {
                    return null;
                }
                let span = 1;
                let name =
                    z instanceof BasicInstrumentZone
                        ? z.sample.name
                        : z.instrument.name;
                let isStereo = false;
                if (linked.index === 2) {
                    span = 2;
                    name = name.replace(STEREO_REGEX, "").trim();
                    isStereo = true;
                }

                return (
                    <th
                        colSpan={span}
                        className={"header_cell " + (isStereo ? "stereo" : "")}
                        title={
                            isStereo
                                ? t("soundBankLocale.thisIsAStereoSamplePair")
                                : ""
                        }
                        key={getObjectId(z)}
                        onClick={() =>
                            setView(
                                z instanceof BasicInstrumentZone
                                    ? z.sample
                                    : z.instrument
                            )
                        }
                    >
                        <span>{name}</span>
                        <span
                            className={"delete_zone"}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const actions = [
                                    new DeleteZoneAction(element, z)
                                ];
                                if (linked.linkedZone) {
                                    actions.push(
                                        new DeleteZoneAction(
                                            element,
                                            linked.linkedZone
                                        )
                                    );
                                }
                                apply(actions);
                            }}
                        >
                            ✖
                        </span>
                    </th>
                );
            })}
        </tr>
    );
}
