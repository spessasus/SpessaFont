interface DialogNumberFieldProps {
    label: string;
    /**
     * The typed text, so a field can be empty or half typed.
     */
    value: string;
    min: number;
    max: number;
    step: number;
    onChange: (text: string) => void;
    isDisabled?: boolean;
}

/**
 * A labeled number input of a tool dialog. Read it with `readNumberField`.
 */
export function DialogNumberField({
    label,
    value,
    min,
    max,
    step,
    onChange,
    isDisabled = false
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
                disabled={isDisabled}
                onChange={(e) => onChange(e.target.value)}
            />
        </label>
    );
}
