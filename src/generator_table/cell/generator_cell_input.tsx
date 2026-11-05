import type * as React from "react";
import { useState } from "react";
import { useWheelStep } from "../../hooks/use_wheel_step.ts";

/**
 * What a cell does as a whole, instead of editing its text.
 */
export interface CellInputCommands {
    /**
     * Copies the cell (or the selected cells) and returns the text for the system clipboard.
     */
    copy: () => string;
    cut: () => string;
    paste: (text: string) => void;
    clear: () => void;
    nudge: (direction: 1 | -1, steps: number) => void;
}

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
    commands: CellInputCommands;
    /**
     * Part of a selection of several cells, which keys always act on as cells.
     */
    isMultiSelected?: boolean;
}

/**
 * Whether some, but not all, of the text is selected, which a copy should copy as text.
 */
function isPartlySelected(input: HTMLInputElement) {
    const { selectionStart, selectionEnd, value } = input;
    return (
        selectionStart !== null &&
        selectionEnd !== null &&
        selectionStart !== selectionEnd &&
        selectionEnd - selectionStart < value.length
    );
}

/**
 * A spreadsheet-like input: typing into a focused cell replaces its contents.
 * Until something is typed, copy, cut, paste and Delete act on the cell's value, and the wheel
 * steps it.
 */
export function GeneratorCellInput({
    onBlur,
    value,
    regex,
    commands,
    isMultiSelected = false,
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
    const isEditingText = !clearOnType && !isMultiSelected;
    const wheelRef = useWheelStep<HTMLInputElement>(commands.nudge);

    return (
        <input
            {...attributes}
            ref={wheelRef}
            value={typedText}
            onBlur={() => setTypedText(onBlur(typedText))}
            onFocus={() => setClearOnType(true)}
            onCopy={(e) => {
                if (isEditingText && isPartlySelected(e.currentTarget)) {
                    return;
                }
                e.preventDefault();
                e.clipboardData.setData("text/plain", commands.copy());
            }}
            onCut={(e) => {
                if (isEditingText && isPartlySelected(e.currentTarget)) {
                    return;
                }
                e.preventDefault();
                e.clipboardData.setData("text/plain", commands.cut());
            }}
            onPaste={(e) => {
                if (isEditingText) {
                    return;
                }
                e.preventDefault();
                commands.paste(e.clipboardData.getData("text/plain"));
            }}
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
                        if (!isEditingText) {
                            e.preventDefault();
                            commands.clear();
                        }
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
