import "./generator_view.css";
import * as React from "react";
import { type BasicInstrument, type generatorTypes } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../../../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./generator_cell.tsx";

export type NumberGeneratorProps = {
    generator: generatorTypes;
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    precision?: number;
};

export const NumberGeneratorRow = React.memo(function ({
    instrument,
    generator,
    suffix = "",
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0
}: NumberGeneratorProps & {
    instrument: BasicInstrument;
    suffix?: string;
}) {
    const { t } = useTranslation();
    return (
        <tr>
            <th className={"generator_cell_header"}>
                <div>
                    <span>{t(generatorLocaleMap[generator])}</span>
                    <i>{suffix}</i>
                </div>
            </th>
            <NumberGeneratorCell
                generator={generator}
                zone={instrument.globalZone}
                fromGenerator={fromGenerator}
                toGenerator={toGenerator}
                precision={precision}
            />
            {instrument.instrumentZones.map((z, i) => (
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
