import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { LinkedZoneMap } from "./generator_table.tsx";
import "./header_cell.css";
import { DeleteZoneAction } from "./delete_zone_action.ts";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";

export function GeneratorTableHeader<
    T extends BasicPresetZone | BasicInstrumentZone,
    A extends BasicInstrument | BasicPreset
>({
    zones,
    element,
    setView,
    name,
    linkedZoneMap,
    callback,
    manager
}: {
    name: string;
    element: A;
    zones: T[];
    setView: SetViewType;
    linkedZoneMap: LinkedZoneMap<T>;
    callback: () => unknown;
    manager: SoundBankManager;
}) {
    const { t } = useTranslation();
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
                        ? z.sample.sampleName
                        : z.instrument.instrumentName;
                let stereo = false;
                if (linked.index === 2) {
                    span = 2;
                    name = name.replace(STEREO_REGEX, "").trim();
                    stereo = true;
                }

                return (
                    <th
                        colSpan={span}
                        className={"header_cell " + (stereo ? "stereo" : "")}
                        title={
                            stereo
                                ? t("soundBankLocale.thisIsAStereoSamplePair")
                                : ""
                        }
                        key={i}
                        onClick={() =>
                            setView(
                                z instanceof BasicInstrumentZone
                                    ? z.sample
                                    : z.instrument
                            )
                        }
                    >
                        <div className={"header_flex"}>
                            <span>{name}</span>
                            <span
                                className={"delete_zone"}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const action = new DeleteZoneAction<A>(
                                        element,
                                        i,
                                        callback
                                    );
                                    manager.modifyBank([action]);
                                }}
                            >
                                ✖
                            </span>
                        </div>
                    </th>
                );
            })}
        </tr>
    );
}
