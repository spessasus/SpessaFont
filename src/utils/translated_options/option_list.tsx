import type { SelectOption } from "./translated_options.ts";

interface OptionListProps {
    options: readonly SelectOption[];
}

/**
 * The `<option>` elements of a select.
 */
export function OptionList({ options }: OptionListProps) {
    return options.map(({ value, label }) => (
        <option key={value} value={value}>
            {label}
        </option>
    ));
}
