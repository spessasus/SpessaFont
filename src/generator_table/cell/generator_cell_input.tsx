import type * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
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

interface GeneratorCellInputProps {
    /**
     * The text the cell shows.
     */
    value: string;
    placeholder: string;
    label: string;
    title: string | undefined;
    /**
     * The cell's key in the table's roving focus.
     */
    gridKey: string;
    /**
     * Whether the cell is the table's Tab stop.
     */
    isActive: boolean;
    className: string | undefined;
    style: React.CSSProperties | undefined;
    /**
     * Commits the typed text. False when the cell cannot take it, which keeps the edit open.
     */
    onCommit: (text: string) => boolean;
    onClick: (e: React.MouseEvent) => void;
    commands: CellInputCommands;
}

/**
 * A spreadsheet cell. Focused, it is read-only: the arrow keys move (the table handles them),
 * copy, cut, paste and Delete act on the cell's value, and the wheel steps it. Typing a
 * character starts an edit with that character, Enter, F2 or a double click starts one with
 * the shown text. While editing, the keys edit the text, Enter commits, Escape drops the edit,
 * and leaving the cell commits.
 */
export function GeneratorCellInput({
    value,
    placeholder,
    label,
    title,
    gridKey,
    isActive,
    className,
    style,
    onCommit,
    onClick,
    commands
}: GeneratorCellInputProps) {
    const { t } = useTranslation();
    // The typed text, null when the cell is not being edited
    const [draft, setDraft] = useState<string | null>(null);
    const [isInvalid, setIsInvalid] = useState(false);
    const isEditing = draft !== null;
    const wheelRef = useWheelStep<HTMLInputElement>(
        isEditing ? undefined : commands.nudge
    );

    const startEditing = (text: string) => {
        setDraft(text);
        setIsInvalid(false);
    };
    const stopEditing = () => {
        setDraft(null);
        setIsInvalid(false);
    };

    const handleCellKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "F2") {
            e.preventDefault();
            // The caret goes after the text, ready to change its end
            e.currentTarget.setSelectionRange(value.length, value.length);
            startEditing(value);
            return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            commands.clear();
            return;
        }
        if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        e.preventDefault();
        startEditing(e.key);
    };

    const handleEditKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // The keys edit the text, except Ctrl+S, which saves after the blur commits the edit
        if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s")) {
            e.stopPropagation();
        }
        if (e.key === "Escape") {
            e.preventDefault();
            stopEditing();
        } else if (draft !== null && e.key === "Enter") {
            e.preventDefault();
            if (onCommit(draft)) {
                stopEditing();
            } else {
                setIsInvalid(true);
            }
        }
    };

    return (
        <input
            ref={wheelRef}
            type={"text"}
            data-grid-key={gridKey}
            tabIndex={isActive ? 0 : -1}
            aria-label={label}
            aria-invalid={isInvalid}
            title={title}
            className={className}
            style={style}
            placeholder={placeholder}
            readOnly={!isEditing}
            value={draft ?? value}
            maxLength={32}
            onClick={onClick}
            onDoubleClick={() => {
                if (!isEditing) {
                    startEditing(value);
                }
            }}
            onKeyDown={isEditing ? handleEditKey : handleCellKey}
            onChange={(e) => {
                if (!isEditing) {
                    return;
                }

                setDraft(e.target.value);
                setIsInvalid(false);
            }}
            onBlur={() => {
                if (draft === null) {
                    return;
                }
                // Leaving the cell cannot keep the edit open, so refused text is dropped
                if (!onCommit(draft)) {
                    toast.error(
                        t("toolsLocale.cells.invalidText", { text: draft })
                    );
                }
                stopEditing();
            }}
            onCopy={(e) => {
                if (isEditing) {
                    return;
                }
                e.preventDefault();
                e.clipboardData.setData("text/plain", commands.copy());
            }}
            onCut={(e) => {
                if (isEditing) {
                    return;
                }
                e.preventDefault();
                e.clipboardData.setData("text/plain", commands.cut());
            }}
            onPaste={(e) => {
                if (isEditing) {
                    return;
                }
                e.preventDefault();
                commands.paste(e.clipboardData.getData("text/plain"));
            }}
        />
    );
}
