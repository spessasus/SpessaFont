import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone
} from "spessasynth_core";
import type { LinkedZoneMap } from "./generator_table.tsx";
import { useTranslation } from "react-i18next";
import { STEREO_REGEX } from "../utils/stereo_regex.ts";
import { typedMemo } from "../utils/typed_memo.ts";

export const GeneratorTableModulatorRow = typedMemo(function <
    ZoneType extends BasicPresetZone | BasicInstrumentZone,
    ElementType extends BasicInstrument | BasicPreset
>({
    element,
    zones,
    linkedZoneMap,
    editModulators
}: {
    editModulators: (z: ZoneType, name: string) => unknown;
    zones: ZoneType[];
    element: ElementType;
    linkedZoneMap: LinkedZoneMap<ZoneType>;
}) {
    const { t } = useTranslation();
    return (
        <tr className={"header_row"}>
            <th className={"generator_cell_header"}>
                {t("modulatorLocale.modulators")}
            </th>
            <th
                className={`modulator_cell ${element.globalZone.modulators.length > 0 ? "modulated" : ""}`}
                onClick={() =>
                    editModulators(
                        // fu ts >:)
                        element.globalZone as ZoneType,
                        t("soundBankLocale.globalZone")
                    )
                }
            >
                <span>{element.globalZone.modulators.length}</span>
            </th>
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
                if (linked.index === 2) {
                    span = 2;
                    name = name.replace(STEREO_REGEX, "").trim();
                }
                const modLength = z.modulators.length;
                return (
                    <th
                        key={i}
                        colSpan={span}
                        className={`modulator_cell ${modLength > 0 ? "modulated" : ""}`}
                        onClick={() => editModulators(z, name)}
                    >
                        <span>{modLength}</span>
                    </th>
                );
            })}
        </tr>
    );
});
