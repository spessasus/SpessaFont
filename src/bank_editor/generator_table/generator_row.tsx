import "./zone_table.css";
import "./zone_cell.css";
import {
    type BasicGlobalZone,
    type BasicInstrumentZone,
    type BasicPresetZone,
    type generatorTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./generator_cell.tsx";
import type SoundBankManager from "../../core_backend/sound_bank_manager.ts";
import type { Dispatch, SetStateAction } from "react";

export type NumberGeneratorProps<
    T extends BasicPresetZone | BasicInstrumentZone
> = {
    generator: generatorTypes;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    precision?: number;
    zones: T[];
    setZones: Dispatch<SetStateAction<T[]>>;
    manager: SoundBankManager;
};

export function NumberGeneratorRow<
    T extends BasicPresetZone | BasicInstrumentZone
>({
    zones,
    manager,
    setZones,
    global,
    generator,
    unit = "",
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0,
    highlight = false
}: NumberGeneratorProps<T> & {
    global: BasicGlobalZone;
    unit?: string;
    highlight?: boolean;
}) {
    const { t } = useTranslation();
    return (
        <tr className={highlight ? "generator_row_highlight" : ""}>
            <th className={"generator_cell_header"}>
                <div>
                    <span>{t(generatorLocaleMap[generator])}</span>
                    {unit && (
                        <i title={t(`soundBankLocale.units.${unit}.full`)}>
                            {t(`soundBankLocale.units.${unit}.suf`)}
                        </i>
                    )}
                </div>
            </th>
            <NumberGeneratorCell<T>
                manager={manager}
                zones={zones}
                setZones={setZones}
                generator={generator}
                zone={global}
                fromGenerator={fromGenerator}
                toGenerator={toGenerator}
                precision={precision}
            />
            {zones.map((z, i) => (
                <NumberGeneratorCell<T>
                    manager={manager}
                    zones={zones}
                    setZones={setZones}
                    generator={generator}
                    zone={z}
                    key={i}
                    fromGenerator={fromGenerator}
                    toGenerator={toGenerator}
                    precision={precision}
                />
            ))}
        </tr>
    );
}
