import type { GeneratorType } from "spessasynth_core";
import { useTranslation } from "react-i18next";
import { useContextMenu } from "../context_menu/context_menu_context.ts";
import { generatorLocaleMap } from "../utils/translated_options/generator_to_locale_map.ts";
import { PlusIcon } from "../utils/icons/app_icons.tsx";
import {
    GENERATOR_GROUP_LABELS,
    type GeneratorGroup
} from "./generator_groups.ts";
import type { GeneratorRowType } from "./generator_row_type.ts";

interface AddGeneratorRowProps {
    group: GeneratorGroup;
    /**
     * The rows of the group that Values only hides.
     */
    hidden: readonly GeneratorRowType[];
    columnCount: number;
    onAdd: (generator: GeneratorType) => void;
}

/**
 * Ends a phone grid group with hidden rows and lists them in an action sheet.
 */
export function AddGeneratorRow({
    group,
    hidden,
    columnCount,
    onAdd
}: AddGeneratorRowProps) {
    const { t } = useTranslation();
    const { openMenu } = useContextMenu();
    return (
        <tr className={"add_generator_row"}>
            <td colSpan={columnCount}>
                <button
                    type={"button"}
                    className={"plain_button add_generator_button"}
                    onClick={(e) =>
                        openMenu(
                            e,
                            hidden.map((r) => ({
                                label: t(generatorLocaleMap[r.generator]),
                                onSelect: () => onAdd(r.generator)
                            })),
                            { title: t(GENERATOR_GROUP_LABELS[group]) }
                        )
                    }
                >
                    <PlusIcon />
                    <span className={"add_generator_label"}>
                        {t("phoneLocale.grid.addGenerator")}
                    </span>
                    <span className={"add_generator_count"}>
                        ({hidden.length})
                    </span>
                </button>
            </td>
        </tr>
    );
}
