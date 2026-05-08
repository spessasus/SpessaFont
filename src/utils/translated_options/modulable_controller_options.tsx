import { MODULABLE_CCS } from "../midi_constants.ts";
import { type TFunction } from "i18next";
import { MIDIControllers } from "spessasynth_core";

function getCCLocale(cc: number, t: TFunction) {
    let name: string =
        (Object.keys(MIDIControllers) as (keyof typeof MIDIControllers)[]).find(
            (key) => MIDIControllers[key] === cc
        ) ?? "notDefined";
    if (name.startsWith("undefined")) {
        name = "notDefined";
    }
    return t(`MIDIControllersLocale.${name}`);
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
