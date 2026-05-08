import { SpessaSynthCoreUtils } from "spessasynth_core";

const consoleColors = SpessaSynthCoreUtils.ConsoleColors;
export { consoleColors };

export function logInfo(text: string) {
    console.info("%c" + text, consoleColors.info);
}
