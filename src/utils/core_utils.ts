import { SpessaSynthCoreUtils } from "spessasynth_core";

const consoleColors = SpessaSynthCoreUtils.consoleColors;
export { consoleColors };

export function logInfo(text: string) {
    console.info("%c" + text, consoleColors.info);
}
