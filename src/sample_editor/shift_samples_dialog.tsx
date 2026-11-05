import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ToolDialog } from "../dialogs/tool_dialog.tsx";
import { DialogNumberField } from "../dialogs/dialog_number_field.tsx";
import { DialogSelectField } from "../dialogs/dialog_select_field.tsx";
import { readNumberField } from "../dialogs/read_number_field.ts";
import type {
    SampleShift,
    ShiftableProperty,
    ShiftOperation
} from "./shift_sample_actions.ts";

const LIMIT = 10_000_000;
const MAX_FACTOR = 1000;

interface ShiftSamplesDialogProps {
    onAnswer: (shift: SampleShift | undefined) => void;
}

/**
 * Asks which sample property to shift, whether to add or multiply, and by what.
 */
export function ShiftSamplesDialog({ onAnswer }: ShiftSamplesDialogProps) {
    const { t } = useTranslation();
    const [property, setProperty] = useState<ShiftableProperty>("originalKey");
    const [operation, setOperation] = useState<ShiftOperation>("add");
    const [valueText, setValueText] = useState("0");
    const isMultiply = operation === "multiply";
    const value = readNumberField(
        valueText,
        isMultiply ? Number.MIN_VALUE : -LIMIT,
        isMultiply ? MAX_FACTOR : LIMIT
    );

    return (
        <ToolDialog
            title={t("toolsLocale.shift.title")}
            canApply={value !== undefined}
            onCancel={() => onAnswer(undefined)}
            onApply={() => {
                if (value !== undefined) {
                    onAnswer({ property, operation, value });
                }
            }}
        >
            <DialogSelectField
                label={t("toolsLocale.shift.property")}
                value={property}
                options={[
                    {
                        value: "originalKey",
                        label: t("toolsLocale.shift.originalKey")
                    },
                    {
                        value: "pitchCorrection",
                        label: t("toolsLocale.shift.pitchCorrection")
                    },
                    {
                        value: "loopStart",
                        label: t("toolsLocale.shift.loopStart")
                    },
                    { value: "loopEnd", label: t("toolsLocale.shift.loopEnd") }
                ]}
                onChange={setProperty}
            />
            <DialogSelectField
                label={t("toolsLocale.shift.operation")}
                value={operation}
                options={[
                    { value: "add", label: t("toolsLocale.shift.add") },
                    {
                        value: "multiply",
                        label: t("toolsLocale.shift.multiply")
                    }
                ]}
                onChange={(picked) => {
                    setOperation(picked);
                    setValueText(picked === "add" ? "0" : "1");
                }}
            />
            <DialogNumberField
                label={t("toolsLocale.shift.value")}
                value={valueText}
                min={isMultiply ? 0 : -LIMIT}
                max={isMultiply ? MAX_FACTOR : LIMIT}
                step={isMultiply ? 0.1 : 1}
                onChange={setValueText}
            />
        </ToolDialog>
    );
}
