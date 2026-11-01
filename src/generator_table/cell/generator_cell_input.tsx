import type * as React from "react";
import { useState } from "react";

interface GeneratorCellInputProps extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onBlur"
> {
    value: string;
    regex: RegExp;
    /**
     * Commits the typed text and returns the text to show afterwards.
     */
    onBlur: (text: string) => string;
}

/**
 * A spreadsheet-like input: typing into a focused cell replaces its contents.
 */
export function GeneratorCellInput({
    onBlur,
    value,
    regex,
    ...attributes
}: GeneratorCellInputProps) {
    const [typedText, setTypedText] = useState(value);
    const [clearOnType, setClearOnType] = useState(true);
    // Undo, redo or the linked zone can change the value from outside
    const [prevValue, setPrevValue] = useState(value);
    if (value !== prevValue) {
        setPrevValue(value);
        setTypedText(value);
        setClearOnType(true);
    }

    return (
        <input
            {...attributes}
            value={typedText}
            onBlur={() => setTypedText(onBlur(typedText))}
            onFocus={() => setClearOnType(true)}
            onKeyDown={(e) => {
                // Arrow keys move between cells (handled by the table),
                // other keys belong to the input and not to the global shortcuts
                if (!e.key.startsWith("Arrow")) {
                    e.stopPropagation();
                }
                switch (e.key) {
                    default: {
                        break;
                    }
                    case "Backspace":
                    case "Delete": {
                        setTypedText("");
                        break;
                    }

                    case "Enter": {
                        e.currentTarget.blur();
                    }
                }
            }}
            onChange={(e) => {
                let text = e.target.value;
                // The first key typed after focusing replaces the old text, like a spreadsheet cell
                const inserted =
                    e.nativeEvent instanceof InputEvent
                        ? e.nativeEvent.data
                        : null;
                if (clearOnType && inserted) {
                    text = inserted;
                }
                setClearOnType(false);
                setTypedText(text.replace(regex, ""));
            }}
        />
    );
}
