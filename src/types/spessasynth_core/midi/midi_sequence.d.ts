/**
 * This is the base type for MIDI files. It contains all the "metadata" and information.
 * It extends to:
 * - BasicMIDI, which contains the actual track data of the MIDI file. Essentially the MIDI file itself.
 * - MIDIData, which contains all properties that MIDI does, except for tracks and the embedded soundfont.
 * MIDIData is the "shell" of the file which is available on the main thread at all times, containing the metadata.
 */
export class MIDISequenceData {
    /**
     * The time division of the sequence, representing the number of ticks per beat.
     * @type {number}
     */
    timeDivision: number;
    /**
     * The duration of the sequence, in seconds.
     * @type {number}
     */
    duration: number;
    /**
     * The tempo changes in the sequence, ordered from the last change to the first.
     * Each change is represented by an object with a tick position and a tempo value in beats per minute.
     * @type {{ticks: number, tempo: number}[]}
     */
    tempoChanges: {
        ticks: number;
        tempo: number;
    }[];
    /**
     * A string containing the copyright information for the MIDI sequence if detected.
     * @type {string}
     */
    copyright: string;
    /**
     * The number of tracks in the MIDI sequence.
     * @type {number}
     */
    tracksAmount: number;
    /**
     * The track names in the MIDI file, an empty string if not set.
     * @type {string[]}
     */
    trackNames: string[];
    /**
     * An array containing the lyrics of the sequence, stored as binary chunks (Uint8Array).
     * @type {Uint8Array[]}
     */
    lyrics: Uint8Array[];
    /**
     * An array of tick positions where lyrics events occur in the sequence.
     * @type {number[]}
     */
    lyricsTicks: number[];
    /**
     * The tick position of the first note-on event in the MIDI sequence.
     * @type {number}
     */
    firstNoteOn: number;
    /**
     * The MIDI key range used in the sequence, represented by a minimum and maximum note value.
     * @type {{min: number, max: number}}
     */
    keyRange: {
        min: number;
        max: number;
    };
    /**
     * The tick position of the last voice event (such as note-on, note-off, or control change) in the sequence.
     * @type {number}
     */
    lastVoiceEventTick: number;
    /**
     * An array of MIDI port numbers used by each track in the sequence.
     * @type {number[]}
     */
    midiPorts: number[];
    /**
     * An array of channel offsets for each MIDI port, using the SpessaSynth method.
     * @type {number[]}
     */
    midiPortChannelOffsets: number[];
    /**
     * A list of sets, where each set contains the MIDI channels used by each track in the sequence.
     * @type {Set<number>[]}
     */
    usedChannelsOnTrack: Set<number>[];
    /**
     * The loop points (in ticks) of the sequence, including both start and end points.
     * @type {{start: number, end: number}}
     */
    loop: {
        start: number;
        end: number;
    };
    /**
     * The name of the MIDI sequence.
     * @type {string}
     */
    midiName: string;
    /**
     * A boolean indicating if the sequence's name is the same as the file name.
     * @type {boolean}
     */
    midiNameUsesFileName: boolean;
    /**
     * The file name of the MIDI sequence, if provided during parsing.
     * @type {string}
     */
    fileName: string;
    /**
     * The raw, encoded MIDI name, represented as a Uint8Array.
     * Useful when the MIDI file uses a different code page.
     * @type {Uint8Array}
     */
    rawMidiName: Uint8Array;
    /**
     * The format of the MIDI file, which can be 0, 1, or 2, indicating the type of the MIDI file.
     * @type {number}
     */
    format: number;
    /**
     * The RMID (Resource-Interchangeable MIDI) info data, if the file is RMID formatted.
     * Otherwise, this field is undefined.
     * Chunk type (e.g. "INAM"): Chunk data as a binary array.
     * @type {Object<string, IndexedByteArray>}
     */
    RMIDInfo: {
        [x: string]: IndexedByteArray;
    };
    /**
     * The bank offset used for RMID files.
     * @type {number}
     */
    bankOffset: number;
    /**
     * If the MIDI file is a Soft Karaoke file (.kar), this flag is set to true.
     * https://www.mixagesoftware.com/en/midikit/help/HTML/karaoke_formats.html
     * @type {boolean}
     */
    isKaraokeFile: boolean;
    /**
     * Indicates if this file is a Multi-Port MIDI file.
     * @type {boolean}
     */
    isMultiPort: boolean;
    /**
     * Converts ticks to time in seconds
     * @param ticks {number} time in MIDI ticks
     * @returns {number} time in seconds
     */
    MIDIticksToSeconds(ticks: number): number;
    /**
     * INTERNAL USE ONLY!
     * @param sequence {MIDISequenceData}
     * @protected
     */
    protected _copyFromSequence(sequence: MIDISequenceData): void;
}
