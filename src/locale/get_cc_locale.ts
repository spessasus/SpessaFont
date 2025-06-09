import type { TFunction } from "i18next";
import { midiControllers } from "spessasynth_core";

export function getCCLocale(cc: number, t: TFunction) {
    const name: string =
        (
            Object.keys(midiControllers) as Array<keyof typeof midiControllers>
        ).find((key) => midiControllers[key] === cc) || "undefined";

    return t(`midiControllersLocale.${name}`);
}
