import { useRef, useState } from "react";
import type { ReactNode, SubmitEvent } from "react";
import { useTranslation } from "react-i18next";
import { SegmentedControl } from "../../fancy_inputs/segmented_control/segmented_control.tsx";
import { StepperButton } from "../../fancy_inputs/stepper_button/stepper_button.tsx";
import {
    MinusIcon,
    PlusIcon,
    PlusMinusIcon
} from "../../utils/icons/app_icons.tsx";
import { buildCellText, type CellEditMode } from "./cell_sheet_text.ts";

interface CellSheetNumberEditorProps {
    unitSuffix: string | undefined;
    /**
     * Nothing is checked, so the steppers and Apply do nothing.
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
    onNudge: (direction: 1 | -1, steps: number) => void;
}

/**
 * The cell sheet's editor for number and offset rows: a typed value set, added or multiplied,
 * or steps up and down.
 */
export function CellSheetNumberEditor({
    unitSuffix,
    isDisabled,
    status,
    footer,
    onApply,
    onNudge
}: CellSheetNumberEditorProps) {
    const { t } = useTranslation();
    const [mode, setMode] = useState<CellEditMode>("set");
    const [typed, setTyped] = useState("");
    const [isTextMode, setIsTextMode] = useState(false);
    const [isTimes10, setIsTimes10] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const text = buildCellText(mode, typed, isTextMode);
    const canApply = !isDisabled && text !== undefined;
    const steps = isTimes10 ? 10 : 1;

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!canApply || !onApply(text)) {
            return;
        }
        setTyped("");
        // Closes the soft keyboard
        inputRef.current?.blur();
    };

    return (
        <form className={"cell_sheet_editor"} onSubmit={handleSubmit}>
            <div className={"cell_sheet_editor_row"}>
                <SegmentedControl
                    label={t("phoneLocale.cellSheet.mode")}
                    options={[
                        { value: "set", label: t("phoneLocale.cellSheet.set") },
                        { value: "add", label: t("phoneLocale.cellSheet.add") },
                        {
                            value: "multiply",
                            label: t("phoneLocale.cellSheet.multiply")
                        }
                    ]}
                    value={mode}
                    onChange={setMode}
                    isDisabled={isTextMode}
                />
                <button
                    type={"button"}
                    className={"pretty_button cell_sheet_toggle"}
                    aria-pressed={isTextMode}
                    onClick={() => setIsTextMode(!isTextMode)}
                >
                    {t("phoneLocale.cellSheet.textMode")}
                </button>
            </div>
            <div className={"cell_sheet_editor_row"}>
                <StepperButton
                    label={t("phoneLocale.cellSheet.stepDown")}
                    steps={steps}
                    onStep={(count) => onNudge(-1, count)}
                    isDisabled={isDisabled}
                >
                    <MinusIcon />
                </StepperButton>
                <div className={"cell_sheet_field"}>
                    <button
                        type={"button"}
                        className={"plain_button cell_sheet_sign"}
                        aria-label={t("phoneLocale.cellSheet.sign")}
                        aria-disabled={isTextMode}
                        onClick={() => {
                            // abc text goes as typed, the sign is the user's to write
                            if (!isTextMode) {
                                setTyped(
                                    typed.startsWith("-")
                                        ? typed.slice(1)
                                        : `-${typed}`
                                );
                            }
                        }}
                    >
                        <PlusMinusIcon />
                    </button>
                    <input
                        ref={inputRef}
                        className={"cell_sheet_input"}
                        inputMode={isTextMode ? "text" : "decimal"}
                        enterKeyHint={"done"}
                        autoComplete={"off"}
                        aria-label={t("phoneLocale.cellSheet.value")}
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                    />
                    {unitSuffix ? (
                        <span className={"cell_sheet_field_unit"}>
                            {unitSuffix}
                        </span>
                    ) : null}
                </div>
                <StepperButton
                    label={t("phoneLocale.cellSheet.stepUp")}
                    steps={steps}
                    onStep={(count) => onNudge(1, count)}
                    isDisabled={isDisabled}
                >
                    <PlusIcon />
                </StepperButton>
                <button
                    type={"button"}
                    className={"pretty_button cell_sheet_toggle"}
                    aria-pressed={isTimes10}
                    onClick={() => setIsTimes10(!isTimes10)}
                >
                    {t("phoneLocale.cellSheet.times10")}
                </button>
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
