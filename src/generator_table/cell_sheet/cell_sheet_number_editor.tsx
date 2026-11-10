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
import { formatNumberCell } from "../cell/cell_values.ts";
import type { GeneratorRowType } from "../generator_row_type.ts";
import { CellSheetSlider } from "./cell_sheet_slider.tsx";

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
    /**
     * The slider of a row with a range, undefined for the sample offsets.
     */
    slider:
        | {
              row: GeneratorRowType;
              range: { min: number; max: number };
              value: number | null;
          }
        | undefined;
    /**
     * Sets a raw value in every checked cell, as one undo step.
     */
    onSliderCommit: (value: number) => void;
}

/**
 * The cell sheet's editor for number and offset rows: a typed value set, added or multiplied,
 * steps up and down, or a slider whose release sets its value.
 */
export function CellSheetNumberEditor({
    unitSuffix,
    isDisabled,
    status,
    footer,
    onApply,
    onNudge,
    slider,
    onSliderCommit
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
    // While the slider is dragged, the status line says what its release sets
    const [sliderDraft, setSliderDraft] = useState<number | null>(null);
    const sends =
        slider && sliderDraft !== null
            ? formatNumberCell(slider.row, sliderDraft)
            : text;

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
            {slider ? (
                <CellSheetSlider
                    row={slider.row}
                    range={slider.range}
                    value={slider.value}
                    isDisabled={isDisabled}
                    onDraftChange={setSliderDraft}
                    onCommit={onSliderCommit}
                />
            ) : null}
            <p className={"cell_sheet_status"}>
                <span>{status}</span>
                {sends === undefined ? null : (
                    <span className={"cell_sheet_sends"}>
                        {t("phoneLocale.cellSheet.sends", { text: sends })}
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
