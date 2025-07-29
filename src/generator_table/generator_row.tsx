import "./cell/generator_cell.css";
import {
    type BasicGlobalZone,
    type BasicInstrument,
    BasicInstrumentZone,
    type BasicPresetZone,
    type GeneratorType,
    generatorTypes
} from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { NumberGeneratorCell } from "./cell/generator_cell.tsx";
import type SoundBankManager from "../core_backend/sound_bank_manager.ts";
import { RangeGeneratorCell } from "./cell/range_cell.tsx";
import type { LinkedZoneMap } from "./generator_table.tsx";
import { OffsetGeneratorCell } from "./cell/offset_cell.tsx";
import { typedMemo } from "../utils/typed_memo.ts";

export interface GeneratorProps {
    generator: GeneratorType;
    manager: SoundBankManager;
    callback: () => unknown;
}

export type NumberGeneratorProps = GeneratorProps & {
    fromGenerator?: (v: number) => number;
    toGenerator?: (v: number) => number;
    precision?: number;
};

export const NumberGeneratorRow = typedMemo(function <
    T extends BasicPresetZone | BasicInstrumentZone
>({
    callback,
    manager,
    global,
    generator,
    instrument,
    zones,
    linkedZoneMap,
    unit = "",
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0,
    highlight = false
}: NumberGeneratorProps & {
    global: BasicGlobalZone;
    unit?: string;
    highlight?: boolean;
    zones: T[];
    linkedZoneMap: LinkedZoneMap<T>;
    instrument?: BasicInstrument;
}) {
    const { t } = useTranslation();
    const isRange =
        generator === generatorTypes.velRange ||
        generator === generatorTypes.keyRange;
    const isOffset =
        generator === generatorTypes.startAddrsOffset ||
        generator === generatorTypes.endAddrOffset ||
        generator === generatorTypes.startloopAddrsOffset ||
        generator === generatorTypes.endloopAddrsOffset;
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
                        manager={manager}
                        callback={callback}
                        generator={generator}
                        zone={global}
                        keyRange={global.keyRange}
                        velRange={global.velRange}
                    />
                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        let span = 1;
                        if (linked.index === 2) {
                            return null;
                        }
                        if (linked.index === 1) {
                            span = 2;
                        }

                        return (
                            <RangeGeneratorCell
                                colSpan={span}
                                manager={manager}
                                linkedZone={linked.linkedZone}
                                callback={callback}
                                generator={generator}
                                zone={z}
                                keyRange={z.keyRange}
                                velRange={z.velRange}
                                key={i}
                                instrument={instrument}
                            />
                        );
                    })}
                </>
            )}
            {isOffset && (
                <>
                    <OffsetGeneratorCell
                        manager={manager}
                        callback={callback}
                        zone={global}
                        generatorType={generator}
                        colSpan={1}
                    />

                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        let span = 1;
                        if (linked.index === 2) {
                            return null;
                        }
                        if (linked.index === 1) {
                            span = 2;
                        }

                        return (
                            <OffsetGeneratorCell
                                colSpan={span}
                                manager={manager}
                                linkedZone={linked.linkedZone}
                                callback={callback}
                                generatorType={generator}
                                zone={z}
                                key={i}
                            />
                        );
                    })}
                </>
            )}
            {!isRange && !isOffset && (
                <>
                    <NumberGeneratorCell
                        colSpan={1}
                        manager={manager}
                        callback={callback}
                        generator={generator}
                        zone={global}
                        fromGenerator={fromGenerator}
                        toGenerator={toGenerator}
                        precision={precision}
                    />
                    {zones.map((z, i) => {
                        const linked = linkedZoneMap[i];

                        let span = 1;
                        if (generator !== generatorTypes.pan) {
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
                                manager={manager}
                                linkedZone={linked.linkedZone}
                                callback={callback}
                                generator={generator}
                                zone={z}
                                key={i}
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
});
