import type { TextareaHTMLAttributes } from "react";
import { useRef, useState } from "react";

interface WaitingTextAreaProps extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "value" | "onChange"
> {
    value: string;
    onCommit: (v: string) => void;
}

/**
 * The text area version of `WaitingInput`: it applies its value when it loses focus,
 * so a whole edit is one undo step instead of one per key. Escape drops the draft.
 */
export function WaitingTextArea({
    value,
    onCommit,
    ...attributes
}: WaitingTextAreaProps) {
    const [draft, setDraft] = useState<string | null>(null);
    // Set by Escape, so the blur that follows does not apply the draft
    const cancelRef = useRef(false);
    return (
        <textarea
            {...attributes}
            value={draft ?? value}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
                if (e.key !== "Escape") {
                    return;
                }
                // Only cancels the edit, not a dialog or menu around it
                e.preventDefault();
                e.stopPropagation();
                cancelRef.current = true;
                e.currentTarget.blur();
            }}
            onBlur={(e) => {
                setDraft(null);
                if (cancelRef.current) {
                    cancelRef.current = false;
                    return;
                }
                if (e.target.value !== value) {
                    onCommit(e.target.value);
                }
            }}
        />
    );
}
