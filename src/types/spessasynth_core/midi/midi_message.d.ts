declare module "spessasynth_core" {
    /**
     * Gets the status byte's channel
     * @param statusByte
     * @returns {number} channel is -1 for system messages -2 for meta and -3 for sysex
     */
    export function getChannel(statusByte: number): number;

    /**
     * Gets the event's status and channel from the status byte
     * @param statusByte {number} the status byte
     * @returns {{channel: number, status: number}} channel will be -1 for sysex and meta
     */
    export function getEvent(statusByte: number): {
        channel: number;
        status: number;
    };

    /**
     * midi_message.js
     * purpose: contains enums for midi events and controllers and functions to parse them
     */
    export class MIDIMessage {
        /**
         * Absolute number of MIDI ticks from the start of the track.
         * @type {number}
         */
        ticks: number;
        /**
         * The MIDI message status byte. Note that for meta events, it is the second byte. (not 0xFF)
         * @type {number}
         */
        messageStatusByte: number;
        /**
         * Message's binary data
         * @type {IndexedByteArray}
         */
        messageData: IndexedByteArray;

        /**
         * @param ticks {number}
         * @param byte {number} the message status byte
         * @param data {IndexedByteArray}
         */
        constructor(ticks: number, byte: number, data: IndexedByteArray);
    }

    export namespace messageTypes {
        export let noteOff: number;
        export let noteOn: number;
        export let polyPressure: number;
        export let controllerChange: number;
        export let programChange: number;
        export let channelPressure: number;
        export let pitchBend: number;
        export let systemExclusive: number;
        export let timecode: number;
        export let songPosition: number;
        export let songSelect: number;
        export let tuneRequest: number;
        export let clock: number;
        export let start: number;
        let _continue: number;
        export let stop: number;
        export let activeSensing: number;
        export let reset: number;
        export let sequenceNumber: number;
        export let text: number;
        export let copyright: number;
        export let trackName: number;
        export let instrumentName: number;
        export let lyric: number;
        export let marker: number;
        export let cuePoint: number;
        export let programName: number;
        export let midiChannelPrefix: number;
        export let midiPort: number;
        export let endOfTrack: number;
        export let setTempo: number;
        export let smpteOffset: number;
        export let timeSignature: number;
        export let keySignature: number;
        export let sequenceSpecific: number;
    }
    export type midiControllers = number;
    export namespace midiControllers {
        let bankSelect: number;
        let modulationWheel: number;
        let breathController: number;
        let footController: number;
        let portamentoTime: number;
        let dataEntryMsb: number;
        let mainVolume: number;
        let balance: number;
        let pan: number;
        let expressionController: number;
        let effectControl1: number;
        let effectControl2: number;
        let generalPurposeController1: number;
        let generalPurposeController2: number;
        let generalPurposeController3: number;
        let generalPurposeController4: number;
        let lsbForControl0BankSelect: number;
        let lsbForControl1ModulationWheel: number;
        let lsbForControl2BreathController: number;
        let lsbForControl4FootController: number;
        let lsbForControl5PortamentoTime: number;
        let lsbForControl6DataEntry: number;
        let lsbForControl7MainVolume: number;
        let lsbForControl8Balance: number;
        let lsbForControl10Pan: number;
        let lsbForControl11ExpressionController: number;
        let lsbForControl12EffectControl1: number;
        let lsbForControl13EffectControl2: number;
        let sustainPedal: number;
        let portamentoOnOff: number;
        let sostenutoPedal: number;
        let softPedal: number;
        let legatoFootswitch: number;
        let hold2Pedal: number;
        let soundVariation: number;
        let filterResonance: number;
        let releaseTime: number;
        let attackTime: number;
        let brightness: number;
        let decayTime: number;
        let vibratoRate: number;
        let vibratoDepth: number;
        let vibratoDelay: number;
        let soundController10: number;
        let generalPurposeController5: number;
        let generalPurposeController6: number;
        let generalPurposeController7: number;
        let generalPurposeController8: number;
        let portamentoControl: number;
        let reverbDepth: number;
        let tremoloDepth: number;
        let chorusDepth: number;
        let detuneDepth: number;
        let phaserDepth: number;
        let dataIncrement: number;
        let dataDecrement: number;
        let NRPNLsb: number;
        let NRPNMsb: number;
        let RPNLsb: number;
        let RPNMsb: number;
        let allSoundOff: number;
        let resetAllControllers: number;
        let localControlOnOff: number;
        let allNotesOff: number;
        let omniModeOff: number;
        let omniModeOn: number;
        let monoModeOn: number;
        let polyModeOn: number;
    }
    /**
     * @type {{"11": number, "12": number, "13": number, "14": number, "8": number, "9": number, "10": number}}
     */
    export const dataBytesAmount: {
        "11": number;
        "12": number;
        "13": number;
        "14": number;
        "8": number;
        "9": number;
        "10": number;
    };
    import { IndexedByteArray } from "../utils/indexed_array.js";
}
