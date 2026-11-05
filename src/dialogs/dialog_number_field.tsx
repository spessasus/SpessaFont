import { readNumberField } from "./read_number_field.ts";

interface DialogNumberFieldProps {
    label: string;
    /**
     * The typed text, so a field can be empty or half typed.
     */
    value: string;
    min: number;
    max: number;
    /**
     * What the spinner adds. Typed values off the step are fine.
     */
    step: number;
    onChange: (text: string) => void;
}

/**
 * A labeled number input of a tool dialog. Read it with `readNumberField` and the same range,
 * the field marks itself invalid when that gives nothing.
 */
export function DialogNumberField({
    label,
    value,
    min,
    max,
    step,
    onChange
}: DialogNumberFieldProps) {
    return (
        <label className={"tool_dialog_field"}>
            <span>{label}</span>
            <input
                className={"pretty_input"}
                type={"number"}
                min={min}
                max={max}
                step={step}
                value={value}
                aria-invalid={readNumberField(value, min, max) === undefined}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}
