/**
 * The generator value for a number typed into a cell, clamped to the range, or undefined when
 * it has none (a negative time or frequency has no logarithm).
 * Rounding, not flooring, so a value shown in one zone and typed into another stays the same.
 */
export function parseGeneratorText(
    typed: number,
    toGenerator: (v: number) => number,
    min: number,
    max: number
) {
    const raw = Math.round(toGenerator(typed));
    return Number.isNaN(raw) ? undefined : Math.max(min, Math.min(max, raw));
}

/**
 * What a typed cell text asks for: a value, or a change to each cell's own value ("+3" adds,
 * "+-3" subtracts, "*0.5" or "x0.5" multiplies). Undefined for text that is none of these.
 */
export type CellEdit =
    | { kind: "set"; value: number }
    | { kind: "add"; value: number }
    | { kind: "multiply"; value: number };

const RELATIVE_KINDS = new Map<string, "add" | "multiply">([
    ["+", "add"],
    ["*", "multiply"],
    ["x", "multiply"]
]);

export function parseCellText(text: string): CellEdit | undefined {
    const trimmed = text.trim();
    const kind = RELATIVE_KINDS.get(trimmed[0] ?? "");
    const number = kind ? trimmed.slice(1) : trimmed;
    const value = Number(number);
    return number === "" || Number.isNaN(value)
        ? undefined
        : { kind: kind ?? "set", value };
}

/**
 * The value a cell shows after the edit, from the value it shows now.
 */
export function applyCellEdit(edit: CellEdit, shown: number) {
    switch (edit.kind) {
        case "set": {
            return edit.value;
        }

        case "add": {
            return shown + edit.value;
        }

        case "multiply": {
            return shown * edit.value;
        }
    }
}
