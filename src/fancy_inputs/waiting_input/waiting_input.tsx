import type { InputHTMLAttributes } from "react";
import { useRef, useState } from "react";

type WaitingInputProps<T extends string | number> = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
> & {
    value: T;
    /**
     * Applies the typed value and returns the value that was applied (it may be clamped).
     */
    setValue: (v: T) => T;
    suffix?: string;
};

/**
 * An input that applies its value when it loses focus or Enter is pressed, not on every key.
 * While the user types, the input shows the draft. Otherwise it shows `value`.
 * Escape drops the draft and leaves the value as it was.
 */
export function WaitingInput<T extends string | number>({
    value,
    setValue,
    suffix = "",
    max,
    min,
    maxLength,
    ...attributes
}: WaitingInputProps<T>) {
    const [draft, setDraft] = useState<string | null>(null);
    // Set by Escape, so the blur that follows does not apply the draft
    const cancelRef = useRef(false);

    const parse = (text: string): T => {
        if (typeof value === "number") {
            const number = Number(text);
            const minValue = min === undefined ? -Infinity : Number(min);
            const maxValue = max === undefined ? Infinity : Number(max);
            const clamped = Math.min(
                Math.max(Number.isNaN(number) ? 0 : number, minValue),
                maxValue
            );
            // T is number here, TypeScript cannot narrow a type parameter from a value
            return clamped as T;
        }
        return (maxLength === undefined ? text : text.slice(0, maxLength)) as T;
    };

    const commit = (text: string) => {
        setDraft(null);
        if (cancelRef.current) {
            cancelRef.current = false;
            return;
        }
        const parsed = parse(text);
        if (parsed.toString() !== value.toString()) {
            setValue(parsed);
        }
    };

    return (
        <input
            {...attributes}
            min={min}
            maxLength={maxLength}
            size={maxLength}
            max={max}
            value={(draft ?? value.toString()) + suffix}
            onBlur={(e) => commit(e.target.value.replaceAll(suffix, ""))}
            onKeyDown={(e) => {
                if (e.key !== "Enter" && e.key !== "Escape") {
                    return;
                }
                e.preventDefault();
                if (e.key === "Escape") {
                    // Only cancels the edit, not a dialog or menu around it
                    e.stopPropagation();
                    cancelRef.current = true;
                }
                e.currentTarget.blur();
            }}
            onChange={(e) => setDraft(e.target.value.replaceAll(suffix, ""))}
        />
    );
}
