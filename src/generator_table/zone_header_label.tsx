import { useTranslation } from "react-i18next";
import { getZoneColorVariable } from "./zone_color.ts";

interface ZoneHeaderLabelProps {
    name: string;
    /**
     * The zone's key range as text, undefined for zones that have none (presets).
     */
    keyRange: string | undefined;
    isStereo: boolean;
    colorIndex: number;
}

export function ZoneHeaderLabel({
    name,
    keyRange,
    isStereo,
    colorIndex
}: ZoneHeaderLabelProps) {
    const { t } = useTranslation();
    return (
        <>
            <span className={"zone_header_name"}>{name}</span>
            {keyRange === undefined ? null : (
                <span className={"zone_header_range"}>{keyRange}</span>
            )}
            {isStereo ? (
                <span className={"zone_header_stereo"}>
                    {t("phoneLocale.grid.stereoPair")}
                </span>
            ) : null}
            <span
                className={"zone_header_color"}
                style={{ background: getZoneColorVariable(colorIndex) }}
            />
        </>
    );
}
