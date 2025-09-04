import { MODULABLE_CCS } from "../midi_constants.ts";
import { type TFunction } from "i18next";
import { midiControllers } from "spessasynth_core";

function getCCLocale(cc: number, t: TFunction) {
    const name: string =
        (Object.keys(midiControllers) as (keyof typeof midiControllers)[]).find(
            (key) => midiControllers[key] === cc
        ) ?? "notDefined";
    return t(`midiControllersLocale.${name}`);
}

export function ModulableControllerOptions({
    padLength = 5,
    t
}: {
    padLength: number;
    t: TFunction;
}) {
    const options = MODULABLE_CCS.map((cc) => {
        return (
            <option key={cc} value={cc}>
                {"CC#" +
                    cc.toString().padEnd(padLength, "\u00A0") +
                    " - " +
                    getCCLocale(cc, t)}
            </option>
        );
    });
    return <>{options}</>;
}
