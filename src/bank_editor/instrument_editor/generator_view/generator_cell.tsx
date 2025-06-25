import {
    BasicInstrumentZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import type { NumberGeneratorProps } from "./generator_row.tsx";
import { WaitingInput } from "../../../fancy_inputs/waiting_input/waiting_input.tsx";

export function NumberGeneratorCell({
    zone,
    generator,
    fromGenerator = (v) => v,
    toGenerator = (v) => v,
    precision = 0
}: NumberGeneratorProps & { zone: BasicZone }) {
    const value = zone.getGeneratorValue(generator, null);
    const placeholder =
        generator === generatorTypes.overridingRootKey &&
        zone instanceof BasicInstrumentZone
            ? zone.sample.samplePitch.toString()
            : "";
    return (
        <td className={"generator_cell"}>
            <WaitingInput
                type={"text"}
                placeholder={placeholder}
                value={value ? fromGenerator(value).toFixed(precision) : ""}
                setValue={(v) => {
                    console.log(
                        "set val for",
                        generator,
                        "to",
                        toGenerator(parseInt(v) || 0)
                    );
                    return v;
                }}
            />
        </td>
    );
}
