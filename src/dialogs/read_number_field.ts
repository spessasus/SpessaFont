/**
 * The number a dialog field holds, or undefined when it is empty, not a number, or out of
 * range.
 */
export function readNumberField(text: string, min: number, max: number) {
    const value = Number(text);
    return text.trim() === "" ||
        Number.isNaN(value) ||
        value < min ||
        value > max
        ? undefined
        : value;
}
