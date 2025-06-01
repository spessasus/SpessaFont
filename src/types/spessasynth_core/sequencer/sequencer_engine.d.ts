declare module "spessasynth_core" {
    import type { SpessaSynthProcessor } from "spessasynth_core";
    import {
        sendMIDICC,
        sendMIDIMessage,
        sendMIDIPitchWheel,
        sendMIDIProgramChange,
        sendMIDIReset
    } from "./events.js";
    import {
        assignMIDIPort,
        loadNewSequence,
        loadNewSongList,
        nextSong,
        previousSong
    } from "./song_control.js";
    import { _addNewMidiPort, _processEvent } from "./process_event.js";
    import { _findFirstEventIndex, processTick } from "./process_tick.js";
    import {
        _playTo,
        _recalculateStartTime,
        play,
        setTimeTicks
    } from "./play.js";
    import type { BasicMIDI } from "../midi/basic_midi";

    export class SpessaSynthSequencer {
        /**
         * All the sequencer's songs
         * @type {BasicMIDI[]}
         */
        songs: BasicMIDI[];
        /**
         * Current song index
         * @type {number}
         */
        songIndex: number;
        /**
         * shuffled song indexes
         * @type {number[]}
         */
        shuffledSongIndexes: number[];
        /**
         * the synth to use
         * @type {SpessaSynthProcessor}
         */
        synth: SpessaSynthProcessor;
        /**
         * if the sequencer is active
         * @type {boolean}
         */
        isActive: boolean;
        /**
         * If the event should instead be sent back to the main thread instead of synth
         * @type {boolean}
         */
        sendMIDIMessages: boolean;
        /**
         * sequencer's loop count
         * @type {number}
         */
        loopCount: number;
        /**
         * event's number in this.events
         * @type {number[]}
         */
        eventIndex: number[];
        /**
         * tracks the time that has already been played
         * @type {number}
         */
        playedTime: number;
        /**
         * The (relative) time when the sequencer was paused. If it's not paused, then it's undefined.
         * @type {number}
         */
        pausedTime: number;
        /**
         * Absolute playback startTime, bases on the synth's time
         * @type {number}
         */
        absoluteStartTime: number;
        /**
         * Currently playing notes (for pausing and resuming)
         * @type {{
         *     midiNote: number,
         *     channel: number,
         *     velocity: number
         * }[]}
         */
        playingNotes: {
            midiNote: number;
            channel: number;
            velocity: number;
        }[];
        /**
         * controls if the sequencer loops (defaults to true)
         * @type {boolean}
         */
        loop: boolean;
        /**
         * controls if the songs are ordered randomly
         * @type {boolean}
         */
        shuffleMode: boolean;
        /**
         * the current track data
         * @type {BasicMIDI}
         */
        midiData: BasicMIDI;
        /**
         * midi port number for the corresponding track
         * @type {number[]}
         */
        midiPorts: number[];
        midiPortChannelOffset: number;
        /**
         * stored as:
         * Object<midi port, channel offset>
         * @type {Object<number, number>}
         */
        midiPortChannelOffsets: {
            [x: number]: number;
        };
        /**
         * @type {boolean}
         */
        skipToFirstNoteOn: boolean;
        /**
         * If true, seq will stay paused when seeking or changing the playback rate
         * @type {boolean}
         */
        preservePlaybackState: boolean;
        /**
         * Called on a MIDI message if sending MIDI messages is enabled
         * @type {function(message: number[])}
         */
        onMIDIMessage: (arg0: message) => number[];
        /**
         * Called when the time changes
         * @type {function(newTime: number)}
         */
        onTimeChange: (arg0: newTime) => number;
        /**
         * Calls when sequencer stops the playback
         * @type {function(isFinished: boolean)}
         */
        onPlaybackStop: (arg0: isFinished) => boolean;
        /**
         * Calls after the songs have been processed but before the playback begins
         * @type {function(newSongList: BasicMIDI[])}
         */
        onSongListChange: (arg0: newSongList) => BasicMIDI[];
        /**
         * Calls when the song is changed (for example, in a playlist)
         * @type {function(songIndex: number, autoPlay: boolean)}
         */
        onSongChange: (arg0: songIndex) => number;
        /**
         * Calls when a meta-event occurs
         * @type {function(e: MIDIMessage, trackIndex: number)}
         */
        onMetaEvent: (arg0: e) => MIDIMessage;
        /**
         * Calls when the loop count changes (usually decreases)
         * @type {function(count: number)}
         */
        onLoopCountChange: (arg0: count) => number;
        sendMIDIMessage: typeof sendMIDIMessage;
        sendMIDIReset: typeof sendMIDIReset;
        sendMIDICC: typeof sendMIDICC;
        sendMIDIProgramChange: typeof sendMIDIProgramChange;
        sendMIDIPitchWheel: typeof sendMIDIPitchWheel;
        assignMIDIPort: typeof assignMIDIPort;
        _processEvent: typeof _processEvent;
        _addNewMidiPort: typeof _addNewMidiPort;
        processTick: typeof processTick;
        _findFirstEventIndex: typeof _findFirstEventIndex;
        loadNewSequence: typeof loadNewSequence;
        loadNewSongList: typeof loadNewSongList;
        nextSong: typeof nextSong;
        previousSong: typeof previousSong;
        play: typeof play;
        _playTo: typeof _playTo;
        setTimeTicks: typeof setTimeTicks;
        _recalculateStartTime: typeof _recalculateStartTime;

        /**
         * @param spessasynthProcessor {SpessaSynthProcessor}
         */
        constructor(spessasynthProcessor: SpessaSynthProcessor);

        /**
         * Controls the playback's rate
         * @type {number}
         * @private
         */
        private _playbackRate: number;

        /**
         * @param value {number}
         */
        set playbackRate(value: number);

        get currentTime(): number;

        set currentTime(time: number);

        /**
         * true if paused, false if playing or stopped
         * @returns {boolean}
         */
        get paused(): boolean;

        /**
         * Pauses the playback
         * @param isFinished {boolean}
         */
        pause(isFinished?: boolean): void;

        /**
         * Stops the playback
         */
        stop(): void;

        loadCurrentSong(autoPlay?: boolean): void;

        _resetTimers(): void;

        setProcessHandler(): void;

        clearProcessHandler(): void;

        shuffleSongIndexes(): void;
    }
}
