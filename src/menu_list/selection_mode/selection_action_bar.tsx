import "./selection_mode.css";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { BankEntity } from "../../core_backend/bank_view.ts";
import { useBankEditor } from "../../bank_editor/bank_editor_context.ts";
import {
    isInstrument,
    isPreset,
    isSample,
    selectionOf
} from "../menu_selection.ts";
import { useSelectionCommands } from "../use_selection_commands.ts";
import {
    createInstrumentFromSamples,
    createPresetFromInstruments
} from "../link_actions.ts";
import {
    CopyIcon,
    DeleteIcon,
    ScissorsIcon
} from "../../utils/icons/edit_icons.tsx";
import { PlusIcon } from "../../utils/icons/app_icons.tsx";

interface ActionButtonProps {
    icon?: ReactNode;
    label: string;
    isDisabled: boolean;
    variant?: "destructive" | "primary";
    onClick: () => void;
}

function ActionButton({
    icon,
    label,
    isDisabled,
    variant,
    onClick
}: ActionButtonProps) {
    return (
        <button
            type={"button"}
            className={"pretty_button selection_action"}
            data-variant={variant}
            aria-disabled={isDisabled ? true : undefined}
            onClick={isDisabled ? undefined : onClick}
        >
            {icon}
            <span className={"selection_action_label"}>{label}</span>
        </button>
    );
}

interface SelectionActionBarProps {
    selection: ReadonlySet<BankEntity>;
}

/**
 * The commands for the selection, in place of the search bar (spec 6.4). The last button makes
 * the next kind from the selection, or duplicates presets.
 */
export function SelectionActionBar({ selection }: SelectionActionBarProps) {
    const { t } = useTranslation();
    const { session, apply, applyCreate: create = apply } = useBankEditor();
    const commands = useSelectionCommands();
    const isEmpty = selection.size === 0;
    const samples = selectionOf(selection, isSample);
    const instruments = selectionOf(selection, isInstrument);

    const next = (() => {
        if (samples.size > 0) {
            return {
                label: t("phoneLocale.selection.newInstrument"),
                icon: <PlusIcon />,
                onClick: () =>
                    create([
                        createInstrumentFromSamples(session.document, samples)
                    ])
            };
        }
        if (instruments.size > 0) {
            return {
                label: t("phoneLocale.selection.newPreset"),
                icon: <PlusIcon />,
                onClick: () =>
                    create([
                        createPresetFromInstruments(
                            session.document,
                            instruments
                        )
                    ])
            };
        }
        if (selectionOf(selection, isPreset).size > 0) {
            return {
                label: t("contextMenu.duplicate"),
                icon: <CopyIcon />,
                onClick: () => commands.duplicate(selection)
            };
        }
        return undefined;
    })();

    return (
        <div className={"selection_action_bar"}>
            <ActionButton
                icon={<CopyIcon />}
                label={t("contextMenu.copy")}
                isDisabled={isEmpty}
                onClick={() => commands.copy(selection)}
            />
            <ActionButton
                icon={<ScissorsIcon />}
                label={t("contextMenu.cut")}
                isDisabled={isEmpty}
                onClick={() => commands.cut(selection)}
            />
            <ActionButton
                icon={<DeleteIcon />}
                label={t("contextMenu.delete")}
                isDisabled={isEmpty}
                variant={"destructive"}
                onClick={() => commands.remove(selection)}
            />
            {next ? (
                <ActionButton
                    icon={next.icon}
                    label={next.label}
                    isDisabled={false}
                    variant={"primary"}
                    onClick={next.onClick}
                />
            ) : null}
        </div>
    );
}
