interface DialogSelectFieldProps<T extends string> {
    label: string;
    value: T;
    options: readonly { value: T; label: string }[];
    onChange: (value: T) => void;
}

/**
 * A labeled select of a tool dialog.
 */
export function DialogSelectField<T extends string>({
    label,
    value,
    options,
    onChange
}: DialogSelectFieldProps<T>) {
    return (
        <label className={"tool_dialog_field"}>
            <span>{label}</span>
            <select
                className={"pretty_input"}
                value={value}
                onChange={(e) => {
                    const picked = options.find(
                        (o) => o.value === e.target.value
                    );
                    if (picked) {
                        onChange(picked.value);
                    }
                }}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
