import { BasicInstrumentZone, type BasicPresetZone } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import type { SetViewType } from "../bank_editor/bank_editor.tsx";
import type { LinkedZoneMap } from "./generator_table.tsx";

export function GeneratorTableHeader<
    T extends BasicPresetZone | BasicInstrumentZone
>({
    zones,
    setView,
    name,
    linkedZoneMap
}: {
    name: string;
    zones: T[];
    setView: SetViewType;
    linkedZoneMap: LinkedZoneMap<T>;
}) {
    const { t } = useTranslation();
    return (
        <tr className={"header_row"}>
            <th className={"header_cell"}>{name}</th>
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
                    name = name.replace(/[RL]$/, "");
                    stereo = true;
                }

                return (
                    <th
                        colSpan={span}
                        className={"header_cell"}
                        key={i}
                        onClick={() =>
                            setView(
                                z instanceof BasicInstrumentZone
                                    ? z.sample
                                    : z.instrument
                            )
                        }
                    >
                        <div>
                            <span>{name}</span>
                            {stereo && (
                                <span
                                    style={{ cursor: "help" }}
                                    title={t(
                                        "soundBankLocale.thisIsAStereoSamplePair"
                                    )}
                                >
                                    (L/R)
                                </span>
                            )}
                        </div>
                    </th>
                );
            })}
        </tr>
    );
}
