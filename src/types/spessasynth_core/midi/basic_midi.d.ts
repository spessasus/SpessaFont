declare module "spessasynth_core" {
    /**
     * BasicMIDI is the base of a complete MIDI file, used by the sequencer internally.
     * BasicMIDI is not available on the main thread, as it contains the actual track data which can be large.
     * It can be accessed by calling getMIDI() on the Sequencer.
     */
    export class BasicMIDI extends MIDISequenceData {
        /**
         * The embedded soundfont in the MIDI file, represented as an ArrayBuffer, if available.
         * @type {ArrayBuffer|undefined}
         */
        embeddedSoundFont: ArrayBuffer | undefined;
        /**
         * The actual track data of the MIDI file, represented as an array of tracks.
         * Tracks are arrays of MIDIMessage objects.
         * @type {MIDIMessage[][]}
         */
        tracks: MIDIMessage[][];
        /**
         * If the MIDI file is a DLS RMIDI file.
         * @type {boolean}
         */
        isDLSRMIDI: boolean;
        writeMIDI: typeof writeMIDI;
        modifyMIDI: typeof modifyMIDI;
        applySnapshotToMIDI: typeof applySnapshotToMIDI;
        writeRMIDI: typeof writeRMIDI;
        getUsedProgramsAndKeys: typeof getUsedProgramsAndKeys;
        getNoteTimes: typeof getNoteTimes;

        /**
         * Copies a MIDI
         * @param mid {BasicMIDI}
         * @returns {BasicMIDI}
         */
        static copyFrom(mid: BasicMIDI): BasicMIDI;

        /**
         * Updates all internal values
         */
        flush(): void;

        /**
         * Parses internal MIDI values
         * @protected
         */
        protected _parseInternal(): void;
    }

    import { MIDISequenceData } from "spessasynth_core";
    import { MIDIMessage } from "./midi_message.js";
    import { writeMIDI } from "./midi_tools/midi_writer.js";
    import {
        applySnapshotToMIDI,
        modifyMIDI
    } from "./midi_tools/midi_editor.js";
    import { writeRMIDI } from "./midi_tools/rmidi_writer.js";
    import { getUsedProgramsAndKeys } from "./midi_tools/used_keys_loaded.js";
    import { getNoteTimes } from "./midi_tools/get_note_times.js";
}
