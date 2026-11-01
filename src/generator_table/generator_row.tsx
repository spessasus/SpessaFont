import "./cell/generator_cell.css";
import {
    BasicInstrument,
    BasicInstrumentZone,
    type BasicPreset,
    type BasicPresetZone,
    type BasicZone,
    type GeneratorType,
    GeneratorTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./cell/generator_cell.tsx";
import { RangeGeneratorCell } from "./cell/range_cell.tsx";
import type { LinkedZoneMap } from "./generator_table.tsx";
import { OffsetGeneratorCell } from "./cell/offset_cell.tsx";
import { getObjectId } from "../utils/object_id.ts";
import { GeneratorLimits } from "../core_backend/generator_limits.ts";

export interface GeneratorProps {
    generator: GeneratorType;
    /**
     * The preset or instrument that owns the zones.
     */
    element: BasicPreset | BasicInstrument;
}

export type NumberGeneratorProps = GeneratorProps & {
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    precision?: number;
};

export function NumberGeneratorRow<
    T extends BasicPresetZone | BasicInstrumentZone
>({
    element,
    global,
    generator,
    zones,
    linkedZoneMap,
    unit = "",
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0,
    highlight = false
}: NumberGeneratorProps & {
    global: BasicZone;
    unit?: string;
    highlight?: boolean;
    zones: T[];
    linkedZoneMap: LinkedZoneMap<T>;
}) {
    const { t } = useTranslation();
    const isRange =
        generator === GeneratorTypes.velRange ||
        generator === GeneratorTypes.keyRange;
    const isOffset =
        generator === GeneratorTypes.startAddrsOffset ||
        generator === GeneratorTypes.endAddrOffset ||
        generator === GeneratorTypes.startloopAddrsOffset ||
        generator === GeneratorTypes.endloopAddrsOffset;
    const l = GeneratorLimits[generator];
    let min, max, def;
    if (isRange || isOffset) {
        min = max = def = 0;
    } else if (element instanceof BasicInstrument) {
        // Instrument level
        min = l.min;
        max = l.max;
        def = l.def;
    } else {
        // Preset level
        min = l.pMin ?? l.min;
        max = l.pMax ?? l.max;
        def = l.def;
    }
    return (
        <tr className={highlight ? "generator_row_highlight" : "generator_row"}>
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
            {isRange && (
                <>
                    <RangeGeneratorCell
                        colSpan={1}
                        element={element}
                        generator={generator}
                        zone={global}
                        keyRange={global.keyRange}
                        velRange={global.velRange}
                    />
                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        if (linked.index === 2) {
                            return null;
                        }
                        let span = 1;
                        if (linked.index === 1) {
                            span = 2;
                        }

                        return (
                            <RangeGeneratorCell
                                colSpan={span}
                                element={element}
                                linkedZone={linked.linkedZone}
                                generator={generator}
                                zone={z}
                                keyRange={z.keyRange}
                                velRange={z.velRange}
                                key={getObjectId(z)}
                            />
                        );
                    })}
                </>
            )}
            {isOffset && (
                <>
                    <OffsetGeneratorCell
                        element={element}
                        zone={global}
                        generatorType={generator}
                        colSpan={1}
                    />

                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        if (linked.index === 2) {
                            return null;
                        }
                        let span = 1;
                        if (linked.index === 1) {
                            span = 2;
                        }

                        return (
                            <OffsetGeneratorCell
                                colSpan={span}
                                element={element}
                                linkedZone={linked.linkedZone}
                                generatorType={generator}
                                zone={z}
                                key={getObjectId(z)}
                            />
                        );
                    })}
                </>
            )}
            {!isRange && !isOffset && (
                <>
                    <NumberGeneratorCell
                        colSpan={1}
                        element={element}
                        generator={generator}
                        min={min}
                        max={max}
                        def={def}
                        zone={global}
                        fromGenerator={fromGenerator}
                        toGenerator={toGenerator}
                        precision={precision}
                    />
                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        let span = 1;
                        if (generator !== GeneratorTypes.pan) {
                            if (linked.index === 2) {
                                return null;
                            }
                            if (linked.index === 1) {
                                span = 2;
                            }
                        }
                        return (
                            <NumberGeneratorCell
                                colSpan={span}
                                element={element}
                                linkedZone={linked.linkedZone}
                                generator={generator}
                                min={min}
                                max={max}
                                def={def}
                                zone={z}
                                key={getObjectId(z)}
                                fromGenerator={fromGenerator}
                                toGenerator={toGenerator}
                                precision={precision}
                            />
                        );
                    })}
                </>
            )}
        </tr>
    );
}
