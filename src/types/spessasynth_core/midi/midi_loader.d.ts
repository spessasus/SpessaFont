declare module "spessasynth_core" {
    import { BasicMIDI } from "spessasynth_core";

    /**
     * midi_loader.js
     * purpose:
     * parses a midi file for the sequencer,
     * including things like marker or CC 2/4 loop detection, copyright detection, etc.
     */
    /**
     * The MIDI class is a MIDI file parser that reads a MIDI file and extracts all the necessary information from it.
     * Supported formats are .mid and .rmi files.
     */
    export class MIDI extends BasicMIDI {
        /**
         * @param fileByteArray {IndexedByteArray}
         * @returns {{type: string, size: number, data: IndexedByteArray}}
         * @private
         */
        private _readMIDIChunk;

        /**
         * Parses a given midi file
         * @param arrayBuffer {ArrayBuffer}
         * @param fileName {string} optional, replaces the decoded title if empty
         */
        constructor(arrayBuffer: ArrayBuffer, fileName?: string);
    }
}
