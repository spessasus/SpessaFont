import type { InputHTMLAttributes } from "react";
import { useRef, useState } from "react";
import { parseTypedNumber } from "./parse_typed_number.ts";

interface WaitingInputProps<T extends string | number> extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
> {
    value: T;
    /**
     * Applies the typed value and returns the value that was applied (it may be clamped).
     */
    onCommit: (v: T) => T;
    suffix?: string;
}

/**
 * An input that applies its value when it loses focus or Enter is pressed, not on every key.
 * While the user types, the input shows the draft. Otherwise it shows `value`.
 * Escape drops the draft and leaves the value as it was, and so does a number field left
 * empty or with text that is not a number.
 */
export function WaitingInput<T extends string | number>({
    value,
    onCommit,
    suffix = "",
    max,
    min,
    maxLength,
    ...attributes
}: WaitingInputProps<T>) {
    const [draft, setDraft] = useState<string | null>(null);
    // Set by Escape, so the blur that follows does not apply the draft
    const cancelRef = useRef(false);

    /**
     * The value the text stands for, or undefined to keep the current one.
     */
    const parse = (text: string) => {
        if (typeof value === "number") {
            const number = parseTypedNumber(text, suffix);
            if (number === undefined) {
                return undefined;
            }
            const minValue = min === undefined ? -Infinity : Number(min);
            const maxValue = max === undefined ? Infinity : Number(max);
            // T is number here, TypeScript cannot narrow a type parameter from a value
            return Math.min(Math.max(number, minValue), maxValue) as T;
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
        if (parsed !== undefined && parsed.toString() !== value.toString()) {
            onCommit(parsed);
        }
    };

    return (
        <input
            {...attributes}
            min={min}
            // The limit is for the typed text, the suffix comes on top
            maxLength={
                maxLength === undefined ? undefined : maxLength + suffix.length
            }
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
