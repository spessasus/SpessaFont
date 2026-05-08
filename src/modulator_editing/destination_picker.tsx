import { type GeneratorType, GeneratorTypes } from "spessasynth_core";
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
                    (Number.parseInt(e.target.value) as GeneratorType) ||
                        GeneratorTypes.initialAttenuation
                )
            }
        >
            {destinationList}
        </select>
    );
}
