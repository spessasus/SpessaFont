import { useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../../fancy_inputs/segmented_control/segmented_control.tsx";
import { getNoteName } from "../../keyboard/keyboard/piano_keys.ts";
import { PlusMinusIcon } from "../../utils/icons/app_icons.tsx";
import { buildRangeText } from "./cell_sheet_text.ts";

interface CellSheetRangeEditorProps {
    isKeyRange: boolean;
    initialLow: number;
    initialHigh: number;
    mode: "set" | "shift";
    onModeChange: (mode: "set" | "shift") => void;
    /**
     * Nothing is checked, so Apply does nothing.
     */
    isDisabled: boolean;
    /**
     * The status line's start, "2 of 5 checked".
     */
    status: string;
    /**
     * The buttons before Apply.
     */
    footer: ReactNode;
    /**
     * Applies the text to the checked cells. False when the cells refused it.
     */
    onApply: (text: string) => boolean;
}

function readNote(text: string) {
    const trimmed = text.trim();
    if (!/^\d{1,3}$/.test(trimmed)) {
        return undefined;
    }
    const value = Number(trimmed);
    return value <= 127 ? value : undefined;
}

/**
 * The cell sheet's editor for key and velocity range rows: set Low and High, or shift both
 * ends. The fields start with the first checked cell's range.
 */
export function CellSheetRangeEditor({
    isKeyRange,
    initialLow,
    initialHigh,
    mode,
    onModeChange,
    isDisabled,
    status,
    footer,
    onApply
}: CellSheetRangeEditorProps) {
    const { t } = useTranslation();
    const [low, setLow] = useState(String(initialLow));
    const [high, setHigh] = useState(String(initialHigh));
    const [shift, setShift] = useState("");
    const lowValue = readNote(low);
    const highValue = readNote(high);
    const trimmedShift = shift.trim().replace(/^\+/, "");
    const shiftValue = /^-?\d{1,3}$/.test(trimmedShift)
        ? Number(trimmedShift)
        : undefined;
    let text: string | undefined;
    if (mode === "set") {
        if (lowValue !== undefined && highValue !== undefined) {
            text = buildRangeText({
                kind: "set",
                low: lowValue,
                high: highValue
            });
        }
    } else if (shiftValue !== undefined) {
        text = buildRangeText({ kind: "shift", by: shiftValue });
    }
    const canApply = !isDisabled && text !== undefined;

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canApply || text === undefined || !onApply(text)) {
            return;
        }
        if (mode === "shift") {
            setShift("");
        }
        // Closes the soft keyboard
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    const renderField = (
        label: string,
        value: string,
        parsed: number | undefined,
        onChange: (value: string) => void
    ) => (
        <label className={"cell_sheet_range_field"}>
            <span className={"cell_sheet_range_label"}>{label}</span>
            <span className={"cell_sheet_field"}>
                <input
                    className={"cell_sheet_input"}
                    inputMode={"numeric"}
                    enterKeyHint={"done"}
                    autoComplete={"off"}
                    aria-invalid={parsed === undefined}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
                {isKeyRange && parsed !== undefined ? (
                    <span className={"cell_sheet_field_unit monospaced"}>
                        {getNoteName(parsed)}
                    </span>
                ) : null}
            </span>
        </label>
    );

    return (
        <form className={"cell_sheet_editor"} onSubmit={handleSubmit}>
            <div className={"cell_sheet_editor_row"}>
                <SegmentedControl
                    label={t("phoneLocale.cellSheet.mode")}
                    options={[
                        { value: "set", label: t("phoneLocale.cellSheet.set") },
                        {
                            value: "shift",
                            label: t("phoneLocale.cellSheet.shift")
                        }
                    ]}
                    value={mode}
                    onChange={onModeChange}
                />
            </div>
            <div className={"cell_sheet_editor_row"}>
                {mode === "set" ? (
                    <>
                        {renderField(
                            t("phoneLocale.cellSheet.low"),
                            low,
                            lowValue,
                            setLow
                        )}
                        {renderField(
                            t("phoneLocale.cellSheet.high"),
                            high,
                            highValue,
                            setHigh
                        )}
                    </>
                ) : (
                    <div className={"cell_sheet_field"}>
                        <button
                            type={"button"}
                            className={"plain_button cell_sheet_sign"}
                            aria-label={t("phoneLocale.cellSheet.sign")}
                            onClick={() =>
                                setShift(
                                    shift.startsWith("-")
                                        ? shift.slice(1)
                                        : `-${shift}`
                                )
                            }
                        >
                            <PlusMinusIcon />
                        </button>
                        <input
                            className={"cell_sheet_input"}
                            inputMode={"numeric"}
                            enterKeyHint={"done"}
                            autoComplete={"off"}
                            aria-label={t("phoneLocale.cellSheet.shift")}
                            value={shift}
                            onChange={(event) => setShift(event.target.value)}
                        />
                    </div>
                )}
            </div>
            <p className={"cell_sheet_status"}>
                <span>{status}</span>
                {text === undefined ? null : (
                    <span className={"cell_sheet_sends"}>
                        {t("phoneLocale.cellSheet.sends", { text })}
                    </span>
                )}
            </p>
            <div className={"cell_sheet_footer"}>
                {footer}
                <button
                    type={"submit"}
                    className={
                        "pretty_button cell_sheet_button cell_sheet_apply"
                    }
                    aria-disabled={!canApply}
                >
                    {t("phoneLocale.cellSheet.apply")}
                </button>
            </div>
        </form>
    );
}
