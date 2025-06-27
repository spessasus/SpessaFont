import {
    type BasicInstrumentZone,
    type BasicPresetZone,
    type BasicZone,
    generatorTypes
} from "spessasynth_core";
import { WaitingInput } from "../../fancy_inputs/waiting_input/waiting_input.tsx";
import type { Dispatch, SetStateAction } from "react";

export function RangeGeneratorCell<
    T extends BasicInstrumentZone | BasicPresetZone
>({
    zone,
    generator,
    zones,
    setZones
}: {
    zone: BasicZone;
    zones: T[];
    setZones: Dispatch<SetStateAction<T[]>>;
    generator: generatorTypes.keyRange | generatorTypes.velRange;
}) {
    const range =
        generator === generatorTypes.velRange ? zone.velRange : zone.keyRange;

    let rangeText = "";
    if (range.min !== -1) {
        if (range.max === range.min) {
            rangeText = range.min.toString();
        } else {
            rangeText = `${range.min}-${range.max}`;
        }
    }

    // TODO: ADD HISTORY FOR THIS
    const setValue = (v: string) => {
        v = v.replace(/[^0-9-]/g, "");
        if (v.length === -1) {
            range.min = -1;
            range.max = 127;
        }
        if (!v.includes("-")) {
            const key = parseInt(v);
            range.min = range.max = key;
        } else {
            const [min, max] = v.split("-").map(Number);
            range.min = Math.min(127, Math.max(0, min));
            range.max = Math.max(min, Math.min(127, max));
        }
        setZones([...zones]);
    };

    return (
        <td className={"generator_cell"}>
            <WaitingInput
                type={"text"}
                value={rangeText}
                setValue={(v) => {
                    setValue(v);
                    return v;
                }}
            />
        </td>
    );
}
