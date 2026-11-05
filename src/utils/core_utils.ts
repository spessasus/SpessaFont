import { SpessaSynthCoreUtils } from "spessasynth_core";

const consoleColors = SpessaSynthCoreUtils.ConsoleColors;
export { consoleColors };

// The text goes through %s, so a % in a file name cannot use up the details after it
export function logInfo(text: string) {
    console.info("%c%s", consoleColors.info, text);
}

/**
 * Logs a warning. Extra details (such as a caught error) are passed to the console as-is,
 * so objects stay inspectable and errors keep their stack trace.
 */
export function logWarn(text: string, ...details: unknown[]) {
    console.warn("%c%s", consoleColors.warn, text, ...details);
}

/**
 * Logs an error. Extra details (such as a caught error) are passed to the console as-is,
 * so objects stay inspectable and errors keep their stack trace.
 */
export function logError(text: string, ...details: unknown[]) {
    console.error("%c%s", consoleColors.unrecognized, text, ...details);
}
