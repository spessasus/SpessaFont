/*
 SFSPEC24 section 8.2.1:
 Note that in this case where C is set to 1, index values 0, 6, 32, 38, 98 through 101, and 120 through 127 are ILLEGAL due
 to their nature as a MIDI functions rather than true MIDI controllers. Also, index values 33 through 63 should be reserved
 for LSB contributions of controller indices 1 through 31. If these index values are encountered, the entire modulator
 structure should be ignored.
 */

import { type MIDIController, midiControllers } from "spessasynth_core";

export const ILLEGAL_CC_DESTINATIONS: MIDIController[] = [
    0, 6, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48,
    49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 98, 99, 100,
    101, 120, 121, 122, 123, 124, 125, 126, 127
];

const MODULABLE_CCS: number[] = [];
for (let i = 0; i < 128; i++) {
    if (!ILLEGAL_CC_DESTINATIONS.includes(i as MIDIController)) {
        MODULABLE_CCS.push(i);
    }
}

export const CC_TOGGLES: MIDIController[] = [
    midiControllers.sustainPedal,
    midiControllers.portamentoOnOff,
    midiControllers.sostenutoPedal,
    midiControllers.softPedal,
    midiControllers.legatoFootswitch,
    midiControllers.hold2Pedal
];

export { MODULABLE_CCS };
