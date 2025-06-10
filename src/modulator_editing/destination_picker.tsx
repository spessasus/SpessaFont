import { generatorTypes } from "spessasynth_core";
import type { JSX } from "react";

export function DestinationPicker({
    destination,
    setDestination,
    destinationList
}: {
    destination: generatorTypes;
    setDestination: (d: generatorTypes) => void;
    destinationList: JSX.Element;
}) {
    return (
        <select
            className={"pretty_outline destination_picker monospaced"}
            value={destination}
            onChange={(e) =>
                setDestination(
                    parseInt(e.target.value) ||
                        generatorTypes.initialAttenuation
                )
            }
        >
            {destinationList}
        </select>
    );
}
