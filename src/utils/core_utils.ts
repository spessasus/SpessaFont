import { SpessaSynthCoreUtils } from "spessasynth_core";

const consoleColors = SpessaSynthCoreUtils.ConsoleColors;
export { consoleColors };

export function logInfo(text: string) {
    console.info("%c" + text, consoleColors.info);
}

/**
 * Logs a warning. Extra details (such as a caught error) are passed to the console as-is,
 * so objects stay inspectable and errors keep their stack trace.
 */
export function logWarn(text: string, ...details: unknown[]) {
    console.warn("%c" + text, consoleColors.warn, ...details);
}

/**
 * Logs an error. Extra details (such as a caught error) are passed to the console as-is,
 * so objects stay inspectable and errors keep their stack trace.
 */
export function logError(text: string, ...details: unknown[]) {
    console.error("%c" + text, consoleColors.unrecognized, ...details);
}
