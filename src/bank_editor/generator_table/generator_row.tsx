import "./zone_table.css";
import "./zone_cell.css";
import * as React from "react";
import {
    BasicInstrument,
    BasicPreset,
    type generatorTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./generator_cell.tsx";

export type NumberGeneratorProps = {
    generator: generatorTypes;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    precision?: number;
};

export const NumberGeneratorRow = React.memo(function ({
    soundBankElement,
    generator,
    unit = "",
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0,
    highlight = false
}: NumberGeneratorProps & {
    soundBankElement: BasicInstrument | BasicPreset;
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
            <NumberGeneratorCell
                generator={generator}
                zone={soundBankElement.globalZone}
                fromGenerator={fromGenerator}
                toGenerator={toGenerator}
                precision={precision}
            />
            {(soundBankElement instanceof BasicInstrument
                ? soundBankElement.instrumentZones
                : soundBankElement.presetZones
            ).map((z, i) => (
                <NumberGeneratorCell
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
});
