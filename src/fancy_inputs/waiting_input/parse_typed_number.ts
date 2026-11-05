/**
 * A number at the start of the text, with a decimal point or comma, and what follows it.
 */
const LEADING_NUMBER =
    /^\s*([+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?)(.*)$/i;

/**
 * Reads a number typed into a field, or undefined when the text is empty or not a number.
 * Like `parseFloat` it reads the number at the start, and it takes a decimal comma too.
 * What follows may only be what is left of the field's suffix (a partly deleted " (C4)" or
 * "Hz"), anything else is a typo, and guessing would apply a value nobody typed ("44.1k").
 */
export function parseTypedNumber(text: string, suffix = "") {
    const match = LEADING_NUMBER.exec(text);
    if (!match) {
        return undefined;
    }
    const [, number, rest] = match;
    for (const character of rest) {
        if (character !== " " && !suffix.includes(character)) {
            return undefined;
        }
    }
    return Number(number.replace(",", "."));
}
