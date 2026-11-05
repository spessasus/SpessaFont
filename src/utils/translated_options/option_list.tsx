import type { SelectOption } from "./translated_options.ts";

interface OptionListProps {
    options: readonly SelectOption[];
}

/**
 * The `<option>` elements of a select.
 * The fragment is needed for the React Compiler, which skips a component that returns a bare
 * array of elements.
 */
export function OptionList({ options }: OptionListProps) {
    return (
        <>
            {options.map(({ value, label }) => (
                <option key={value} value={value}>
                    {label}
                </option>
            ))}
        </>
    );
}
