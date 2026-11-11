import { useTranslation } from "react-i18next";
import type { ZoneColumn } from "./zone_columns.ts";
import { getModulatorKey } from "./table_navigation.ts";
import { getShownModulators } from "../core_backend/sfe_data.ts";

interface ModulatorRowProps {
    /**
     * The global zone column followed by the zone columns. A stereo pair whose zones have
     * different modulators is split, so each zone's own list is shown and edited.
     */
    columns: readonly ZoneColumn[];
    /**
     * The key of the table's Tab stop when it is in this row.
     */
    activeKey: string | undefined;
    /**
     * Opens the modulator editor of the zone with this view id.
     */
    onEditModulators: (zoneId: number) => void;
    /**
     * SF2 mode does not count the modulators with an SFE destination, which it hides.
     */
    isSFE: boolean;
}

export function ModulatorRow({
    columns,
    activeKey,
    onEditModulators,
    isSFE
}: ModulatorRowProps) {
    const { t } = useTranslation();
    return (
        <tr className={"generator_table_header_row"}>
            <th className={"generator_cell_header"} scope={"row"}>
                {t("modulatorLocale.modulators")}
            </th>
            {columns.map(({ zone, name, colSpan }) => {
                const count = getShownModulators(zone.modulators, isSFE).length;
                const key = getModulatorKey(zone.id);
                return (
                    <th
                        key={zone.id}
                        colSpan={colSpan}
                        className={`modulator_cell ${count > 0 ? "modulated" : ""}`}
                    >
                        <button
                            type={"button"}
                            className={"plain_button modulator_count"}
                            data-grid-key={key}
                            tabIndex={key === activeKey ? 0 : -1}
                            // The label replaces the visible count, so it says it too
                            aria-label={`${t("modulatorLocale.editModulators", { name })} (${count})`}
                            onClick={() => onEditModulators(zone.id)}
                        >
                            {count}
                        </button>
                    </th>
                );
            })}
        </tr>
    );
}
