import { type GeneratorType, generatorTypes } from "spessasynth_core";
import type { JSX } from "react";

export function DestinationPicker({
    destination,
    setDestination,
    destinationList
}: {
    destination: GeneratorType;
    setDestination: (d: GeneratorType) => void;
    destinationList: JSX.Element;
}) {
    return (
        <select
            className={"pretty_outline destination_picker monospaced"}
            value={destination}
            onChange={(e) =>
                setDestination(
                    (parseInt(e.target.value) as GeneratorType) ||
                        generatorTypes.initialAttenuation
                )
            }
        >
            {destinationList}
        </select>
    );
}
