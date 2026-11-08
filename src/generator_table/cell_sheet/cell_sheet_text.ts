export type CellEditMode = "set" | "add" | "multiply";

const RELATIVE_PREFIX = /^[+xX*]/;

/**
 * The text the cell parser understands for a mode and what was typed, or undefined when there
 * is nothing to send. Set and abc text go as typed, Add and Multiply drop one typed prefix
 * (from a hardware keyboard) and add their own.
 */
export function buildCellText(
    mode: CellEditMode,
    typed: string,
    isTextMode: boolean
) {
    const trimmed = typed.trim();
    if (trimmed === "") {
        return undefined;
    }
    if (isTextMode || mode === "set") {
        return trimmed;
    }
    const rest = trimmed.replace(RELATIVE_PREFIX, "").trim();
    if (rest === "") {
        return undefined;
    }
    return (mode === "add" ? "+" : "x") + rest;
}

/**
 * The text for a range row, "48-69" or a shift like "+12" and "+-12".
 */
export function buildRangeText(
    edit:
        | { kind: "set"; low: number; high: number }
        | { kind: "shift"; by: number }
) {
    return edit.kind === "set" ? `${edit.low}-${edit.high}` : `+${edit.by}`;
}
