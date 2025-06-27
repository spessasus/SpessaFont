import {
    type BasicGlobalZone,
    type BasicInstrumentZone,
    type BasicPresetZone,
    type generatorTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import { RangeGeneratorCell } from "./range_cell.tsx";
import type { Dispatch, SetStateAction } from "react";

export function RangeGeneratorRow<
    T extends BasicPresetZone | BasicInstrumentZone
>({
    zones,
    setZones,
    global,
    generator
}: {
    zones: T[];
    setZones: Dispatch<SetStateAction<T[]>>;
    global: BasicGlobalZone;
    generator: generatorTypes.keyRange | generatorTypes.velRange;
}) {
    const { t } = useTranslation();
    return (
        <tr className={"generator_row_highlight"}>
            <th className={"generator_cell_header"}>
                <div>
                    <span>{t(generatorLocaleMap[generator])}</span>
                </div>
            </th>
            <RangeGeneratorCell
                zones={zones}
                setZones={setZones}
                zone={global}
                generator={generator}
            />
            {zones.map((z, i) => (
                <RangeGeneratorCell
                    zones={zones}
                    setZones={setZones}
                    zone={z}
                    key={i}
                    generator={generator}
                />
            ))}
        </tr>
    );
}
