import type * as React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratorType } from "spessasynth_core";
import { useWheelStep } from "../../hooks/use_wheel_step.ts";
import { logInfo } from "../../utils/core_utils.ts";
import type { getGeneratorOptions } from "../generator_options.ts";
import { getViewZones, type ZoneColumn } from "../zone_columns.ts";
import { readViewCell } from "./cell_values.ts";

interface SelectCellProps {
    column: ZoneColumn;
    generator: GeneratorType;
    options: NonNullable<ReturnType<typeof getGeneratorOptions>>;
    label: string;
    isSelected: boolean;
    gridKey: string;
    isActive: boolean;
    onPick: (value: number | null) => void;
    onNudge: (direction: 1 | -1, steps: number) => void;
    /**
     * Delete and the clipboard shortcuts, which act on the cell.
     */
    onCellKeyDown: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
    onClick: (e: React.MouseEvent) => void;
    onContextMenu: (e: React.MouseEvent) => void;
}

/**
 * A cell that picks one of a few values. The arrow keys move through the table and never
 * change it. Enter, Space, F4 or Alt and an arrow open it (a click too), and while it is open
 * its keys belong to it, until a pick, Enter, Escape, Tab or leaving it.
 */
export function SelectCell({
    column,
    generator,
    options,
    label,
    isSelected,
    gridKey,
    isActive,
    onPick,
    onNudge,
    onCellKeyDown,
    onClick,
    onContextMenu
}: SelectCellProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const wheelRef = useWheelStep<HTMLSelectElement>(onNudge);
    const zones = getViewZones(column);
    const values = zones.map((z) => readViewCell(z, generator));
    const [first] = values;
    // A stereo column whose zones differ shows both, and a pick sets both
    const isMixed = values.some((v) => v !== first);
    const value = typeof first === "number" ? first : null;
    const mixedText = values
        .map((v) => {
            const option = options.find((o) => o.value === v);
            return option ? t(option.label) : "-";
        })
        .join(" / ");
    const isModulated = zones.some((z) =>
        z.modulators.some((m) => m.destination === generator)
    );

    const handleKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
        if (isOpen) {
            if (["Enter", "Escape", "Tab"].includes(e.key)) {
                if (e.key !== "Tab") {
                    e.preventDefault();
                }
                setIsOpen(false);
            }
            // Undo and save still reach the bank
            if (!e.ctrlKey && !e.metaKey) {
                e.stopPropagation();
            }
            return;
        }
        const isOpenKey =
            e.key === "Enter" ||
            e.key === " " ||
            e.key === "F4" ||
            (e.altKey && (e.key === "ArrowDown" || e.key === "ArrowUp"));
        if (!isOpenKey) {
            onCellKeyDown(e);
            return;
        }
        e.preventDefault();
        setIsOpen(true);
        try {
            e.currentTarget.showPicker();
        } catch (error) {
            // Without a picker, the arrow keys change the open select's value
            logInfo(`The select cannot show its picker: ${String(error)}`);
        }
    };

    return (
        <td
            className={`generator_cell ${isModulated ? "modulated" : ""} ${isSelected ? "selected" : ""}`}
            colSpan={column.colSpan}
            aria-selected={isSelected}
            onContextMenu={onContextMenu}
        >
            <select
                ref={wheelRef}
                data-grid-key={gridKey}
                tabIndex={isActive ? 0 : -1}
                aria-label={label}
                title={isMixed ? mixedText : undefined}
                value={isMixed ? "mixed" : (value ?? "null")}
                onMouseDown={() => setIsOpen(true)}
                onClick={onClick}
                onBlur={() => setIsOpen(false)}
                onKeyDown={handleKeyDown}
                onChange={(e) => {
                    setIsOpen(false);
                    onPick(
                        e.target.value === "null"
                            ? null
                            : Number(e.target.value)
                    );
                }}
            >
                {isMixed ? (
                    <option value={"mixed"} disabled>
                        {mixedText}
                    </option>
                ) : null}
                <option value={"null"}>{"-"}</option>
                {options.map((option) => (
                    <option value={option.value} key={option.value}>
                        {t(option.label)}
                    </option>
                ))}
            </select>
        </td>
    );
}
