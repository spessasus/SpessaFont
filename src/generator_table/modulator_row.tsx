import type { BasicZone } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { getObjectId } from "../utils/object_id.ts";
import type { ZoneColumn } from "./zone_columns.ts";

interface GeneratorTableModulatorRowProps {
    /**
     * The global zone column followed by the zone columns.
     */
    columns: readonly ZoneColumn[];
    onEditModulators: (zone: BasicZone) => void;
}

export function GeneratorTableModulatorRow({
    columns,
    onEditModulators
}: GeneratorTableModulatorRowProps) {
    const { t } = useTranslation();
    return (
        <tr className={"header_row"}>
            <th className={"generator_cell_header"} scope={"row"}>
                {t("modulatorLocale.modulators")}
            </th>
            {columns.map(({ zone, name, colSpan }) => {
                const count = zone.modulators.length;
                return (
                    <th
                        key={getObjectId(zone)}
                        colSpan={colSpan}
                        className={`modulator_cell ${count > 0 ? "modulated" : ""}`}
                    >
                        <button
                            type={"button"}
                            className={"plain_button modulator_count"}
                            aria-label={t("modulatorLocale.editModulators", {
                                name
                            })}
                            onClick={() => onEditModulators(zone)}
                        >
                            {count}
                        </button>
                    </th>
                );
            })}
        </tr>
    );
}
