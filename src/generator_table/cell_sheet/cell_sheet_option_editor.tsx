import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratorOptions } from "../generator_options.ts";

interface CellSheetOptionEditorProps {
    options: GeneratorOptions;
    /**
     * The option every checked cell has, null for unset and undefined for mixed values.
     */
    value: number | null | undefined;
    /**
     * Nothing is checked, so a pick does nothing.
     */
    isDisabled: boolean;
    status: string;
    /**
     * The buttons under the options.
     */
    footer: ReactNode;
    onPick: (value: number | null) => void;
}

/**
 * The cell sheet's editor for option rows: one radio row per option, "−" (unset) first. A pick
 * applies at once.
 */
export function CellSheetOptionEditor({
    options,
    value,
    isDisabled,
    status,
    footer,
    onPick
}: CellSheetOptionEditorProps) {
    const { t } = useTranslation();
    const entries = [
        {
            value: null,
            label: t("phoneLocale.cellSheet.unset"),
            name: t("phoneLocale.cellSheet.unsetName")
        },
        ...options.map((o) => ({
            value: o.value,
            label: t(o.label),
            name: t(o.label)
        }))
    ];
    return (
        <>
            <div
                className={"cell_sheet_options"}
                role={"radiogroup"}
                aria-label={t("phoneLocale.cellSheet.value")}
            >
                {entries.map((entry) => (
                    <button
                        key={entry.value ?? "unset"}
                        aria-label={entry.name}
                        type={"button"}
                        role={"radio"}
                        className={"plain_button cell_sheet_option"}
                        aria-checked={value === entry.value}
                        aria-disabled={isDisabled}
                        onClick={() => {
                            if (!isDisabled) {
                                onPick(entry.value);
                            }
                        }}
                    >
                        <span className={"cell_sheet_option_label"}>
                            {entry.label}
                        </span>
                    </button>
                ))}
            </div>
            <p className={"cell_sheet_status"}>{status}</p>
            <div className={"cell_sheet_footer"}>{footer}</div>
        </>
    );
}
