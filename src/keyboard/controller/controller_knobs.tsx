import { useState } from "react";
import { type MIDIController, MIDIControllers } from "spessasynth_core";
import { Controller } from "./controller.tsx";

const INITIAL_CC_LIST: readonly MIDIController[] = [
    MIDIControllers.modulationWheel,
    MIDIControllers.mainVolume,
    MIDIControllers.pan,
    MIDIControllers.expression,
    MIDIControllers.sustainPedal,
    MIDIControllers.filterResonance,
    MIDIControllers.brightness,

    MIDIControllers.reverbDepth,
    MIDIControllers.chorusDepth
];

/**
 * Its own component (it has no props), so the compiler can skip it when the pointer moves over
 * the keyboard, instead of re-rendering the controller selects with their 128 options each.
 */
export function ControllerKnobs() {
    const [controllers, setControllers] = useState(INITIAL_CC_LIST);
    return (
        <div className={"controller_row"}>
            {controllers.map((cc, i) => (
                <Controller
                    // A fixed set of slots, never reordered, so the slot is the identity
                    key={i}
                    number={i + 1}
                    cc={cc}
                    onCCChange={(newCC) =>
                        setControllers((prev) => prev.with(i, newCC))
                    }
                />
            ))}
        </div>
    );
}
