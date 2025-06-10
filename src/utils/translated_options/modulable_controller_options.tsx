import { MODULABLE_CCS } from "../midi_constants.ts";
import { getCCLocale } from "../../locale/get_cc_locale.ts";
import { type TFunction } from "i18next";

export function ModulableControllerOptions({
    padLength = 5,
    t
}: {
    padLength: number;
    t: TFunction;
}) {
    const ccLocales = MODULABLE_CCS.map((cc) => getCCLocale(cc, t));
    const options = MODULABLE_CCS.map((cc) => {
        return (
            <option key={cc} value={cc}>
                {"CC#" +
                    cc.toString().padEnd(padLength, "\u00A0") +
                    " - " +
                    ccLocales[cc]}
            </option>
        );
    });

    return <>{options}</>;
}
