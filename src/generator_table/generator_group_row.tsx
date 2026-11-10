import { useTranslation } from "react-i18next";
import {
    GENERATOR_GROUP_LABELS,
    type GeneratorGroup
} from "./generator_groups.ts";
import {
    ChevronDownIcon,
    ChevronRightIcon
} from "../utils/icons/app_icons.tsx";

interface GeneratorGroupRowProps {
    group: GeneratorGroup;
    /**
     * How many rows of the group the grid shows when it is expanded.
     */
    visibleCount: number;
    isCollapsed: boolean;
    columnCount: number;
    onToggle: () => void;
}

/**
 * A full-width phone grid row above a group's generators, which collapses or expands it.
 */
export function GeneratorGroupRow({
    group,
    visibleCount,
    isCollapsed,
    columnCount,
    onToggle
}: GeneratorGroupRowProps) {
    const { t } = useTranslation();
    return (
        <tr className={"generator_group_row"}>
            <th colSpan={columnCount} scope={"colgroup"}>
                <button
                    type={"button"}
                    className={"plain_button generator_group_button"}
                    aria-expanded={!isCollapsed}
                    onClick={onToggle}
                >
                    <span
                        className={"generator_group_chevron"}
                        aria-hidden={true}
                    >
                        {isCollapsed ? (
                            <ChevronRightIcon />
                        ) : (
                            <ChevronDownIcon />
                        )}
                    </span>
                    <span className={"generator_group_name"}>
                        {t(GENERATOR_GROUP_LABELS[group])}
                    </span>
                    <span className={"generator_group_count"}>
                        {visibleCount}
                    </span>
                </button>
            </th>
        </tr>
    );
}
