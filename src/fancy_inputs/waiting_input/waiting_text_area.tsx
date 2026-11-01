import type { TextareaHTMLAttributes } from "react";
import { useState } from "react";

type WaitingTextAreaProps = Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
> & {
    value: string;
    setValue: (v: string) => void;
};

/**
 * The text area version of `WaitingInput`: it applies its value when it loses focus,
 * so a whole edit is one undo step instead of one per key.
 */
export function WaitingTextArea({
    value,
    setValue,
    ...attributes
}: WaitingTextAreaProps) {
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <textarea
            {...attributes}
            value={draft ?? value}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => {
                setDraft(null);
                if (e.target.value !== value) {
                    setValue(e.target.value);
                }
            }}
        />
    );
}
