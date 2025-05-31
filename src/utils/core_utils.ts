import { SpessaSynthCoreUtils } from "spessasynth_core";

const consoleColors = SpessaSynthCoreUtils.consoleColors;
export { consoleColors };

export function logInfo(text: string)
{
    console.log("%c" + text, consoleColors.info);
}