import {
    type BasicPreset,
    type MIDIPatch,
    MIDIPatchTools
} from "spessasynth_core";

/**
 * The patches the presets use, as `MIDIPatchTools.toMIDIString` gives them.
 */
export function getTakenPatches(presets: Iterable<BasicPreset>) {
    const taken = new Set<string>();
    for (const p of presets) {
        taken.add(p.toMIDIString());
    }
    return taken;
}

const MIDI_VALUES = 128;

/**
 * The first free patch from the given one: the next programs of its bank first, then the
 * next bank numbers (MSB, then LSB). Undefined when every patch is taken.
 */
export function findFreePatch(start: MIDIPatch, taken: ReadonlySet<string>) {
    // Drum kits are told apart by their bank numbers too, so they step through banks as well
    for (let bankStep = 0; bankStep < MIDI_VALUES * MIDI_VALUES; bankStep++) {
        const msb = start.bankMSB + bankStep;
        const bankMSB = msb % MIDI_VALUES;
        const bankLSB =
            (start.bankLSB + Math.floor(msb / MIDI_VALUES)) % MIDI_VALUES;
        for (let step = 0; step < MIDI_VALUES; step++) {
            const patch: MIDIPatch = {
                bankMSB,
                bankLSB,
                program: (start.program + step) % MIDI_VALUES,
                isGMGSDrum: start.isGMGSDrum
            };
            if (!taken.has(MIDIPatchTools.toMIDIString(patch))) {
                return patch;
            }
        }
    }
    return undefined;
}
