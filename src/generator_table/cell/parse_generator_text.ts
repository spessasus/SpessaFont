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
