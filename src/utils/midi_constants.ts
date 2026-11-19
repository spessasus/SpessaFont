/*
 SFSPEC24 section 8.2.1 calls CC 0, 6, 32, 38, 98 to 101 and 120 to 127 illegal, as they are MIDI functions rather
 than controllers, and a modulator that uses one is ignored. SFe 4 (section 7.4) keeps that list and makes CC 33 to 63
 valid sources.
 */

import { type MIDIController, MIDIControllers } from "spessasynth_core";

export const ILLEGAL_CC_DESTINATIONS: MIDIController[] = [
    0, 6, 32, 38, 98, 99, 100, 101, 120, 121, 122, 123, 124, 125, 126, 127
];

const MODULABLE_CCS = new Array<number>();
for (let i = 0; i < 128; i++) {
    if (!ILLEGAL_CC_DESTINATIONS.includes(i as MIDIController)) {
        MODULABLE_CCS.push(i);
    }
}

export const CC_TOGGLES: MIDIController[] = [
    MIDIControllers.sustainPedal,
    MIDIControllers.portamentoOnOff,
    MIDIControllers.sostenutoPedal,
    MIDIControllers.softPedal,
    MIDIControllers.legatoFootswitch,
    MIDIControllers.hold2Pedal
];

export { MODULABLE_CCS };
