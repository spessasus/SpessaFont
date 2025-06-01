import type { LowpassFilter, Modulator } from "spessasynth_core";

/**
 * Voice represents a single instance of the
 * SoundFont2 synthesis model.
 * That is:
 * A wavetable oscillator (sample)
 * A volume envelope (volumeEnvelope)
 * A modulation envelope (modulationEnvelope)
 * Generators (generators and modulatedGenerators)
 * Modulators (modulators)
 * And MIDI params such as channel, MIDI note, velocity
 */
declare class Voice {
    /**
     * The sample of the voice.
     * @type {AudioSample}
     */
    sample: AudioSample;
    /**
     * Lowpass filter applied to the voice.
     * @type {LowpassFilter}
     */
    filter: LowpassFilter;
    /**
     * Linear gain of the voice. Used with Key Modifiers.
     * @type {number}
     */
    gain: number;
    /**
     * The unmodulated (copied to) generators of the voice.
     * @type {Int16Array}
     */
    generators: Int16Array;
    /**
     * The voice's modulators.
     * @type {Modulator[]}
     */
    modulators: Modulator[];
    /**
     * The generators in real-time, affected by modulators.
     * This is used during rendering.
     * @type {Int16Array}
     */
    modulatedGenerators: Int16Array;
    /**
     * Indicates if the voice is finished.
     * @type {boolean}
     */
    finished: boolean;
    /**
     * Indicates if the voice is in the release phase.
     * @type {boolean}
     */
    isInRelease: boolean;
    /**
     * Velocity of the note.
     * @type {number}
     */
    velocity: number;
    /**
     * MIDI note number.
     * @type {number}
     */
    midiNote: number;
    /**
     * The pressure of the voice
     * @type {number}
     */
    pressure: number;
    /**
     * Target key for the note.
     * @type {number}
     */
    targetKey: number;
    /**
     * Modulation envelope.
     * @type {ModulationEnvelope}
     */
    modulationEnvelope: ModulationEnvelope;
    /**
     * Volume envelope.
     * @type {VolumeEnvelope}
     */
    volumeEnvelope: VolumeEnvelope;
    /**
     * Start time of the voice, absolute.
     * @type {number}
     */
    startTime: number;
    /**
     * Start time of the release phase, absolute.
     * @type {number}
     */
    releaseStartTime: number;
    /**
     * Current tuning in cents.
     * @type {number}
     */
    currentTuningCents: number;
    /**
     * Current calculated tuning. (as in ratio)
     * @type {number}
     */
    currentTuningCalculated: number;
    /**
     * From -500 to 500.
     * @param {number}
     */
    currentPan: number;
    /**
     * If MIDI Tuning Standard is already applied (at note-on time),
     * this will be used to take the values at real-time tuning as "midiNote"
     * property contains the tuned number.
     * see #29 comment by @paulikaro
     * @type {number}
     */
    realKey: number;
    /**
     * @type {number} Initial key to glide from, MIDI Note number. If -1, the portamento is OFF.
     */
    portamentoFromKey: number;
    /**
     * Duration of the linear glide, in seconds.
     * @type {number}
     */
    portamentoDuration: number;
    /**
     * From -500 to 500, where zero means disabled (use the channel pan). Used for random pan.
     * @type {number}
     */
    overridePan: number;
    /**
     * Exclusive class number for hi-hats etc.
     * @type {number}
     */
    exclusiveClass: number;

    /**
     * Creates a Voice
     * @param sampleRate {number}
     * @param audioSample {AudioSample}
     * @param midiNote {number}
     * @param velocity {number}
     * @param currentTime {number}
     * @param targetKey {number}
     * @param realKey {number}
     * @param generators {Int16Array}
     * @param modulators {Modulator[]}
     */
    constructor(
        sampleRate: number,
        audioSample: AudioSample,
        midiNote: number,
        velocity: number,
        currentTime: number,
        targetKey: number,
        realKey: number,
        generators: Int16Array,
        modulators: Modulator[]
    );

    /**
     * copies the voice
     * @param voice {Voice}
     * @param currentTime {number}
     * @param realKey {number}
     * @returns Voice
     */
    static copy(voice: Voice, currentTime: number, realKey: number): Voice;

    /**
     * Releases the voice as exclusiveClass
     * @param currentTime {number}
     */
    exclusiveRelease(currentTime: number): void;

    /**
     * Stops the voice
     * @param currentTime {number}
     * @param minNoteLength {number} minimum note length in seconds
     */
    release(currentTime: number, minNoteLength?: number): void;
}

declare class AudioSample {
    /**
     * the sample's audio data
     * @type {Float32Array}
     */
    sampleData: Float32Array;
    /**
     * Current playback step (rate)
     * @type {number}
     */
    playbackStep: number;
    /**
     * Current position in the sample
     * @type {number}
     */
    cursor: number;
    /**
     * MIDI root key of the sample
     * @type {number}
     */
    rootKey: number;
    /**
     * Start position of the loop
     * @type {number}
     */
    loopStart: number;
    /**
     * End position of the loop
     * @type {number}
     */
    loopEnd: number;
    /**
     * End position of the sample
     * @type {number}
     */
    end: number;
    /**
     * Looping mode of the sample:
     * 0 - no loop
     * 1 - loop
     * 2 - UNOFFICIAL: polyphone 2.4 added start on release
     * 3 - loop then play when released
     * @type {0|1|2|3}
     */
    loopingMode: 0 | 1 | 2 | 3;
    /**
     * Indicates if the sample is currently looping
     * @type {boolean}
     */
    isLooping: boolean;

    /**
     * @param data {Float32Array}
     * @param playbackStep {number} the playback step, a single increment
     * @param cursorStart {number} the sample id which starts the playback
     * @param rootKey {number} MIDI root key
     * @param loopStart {number} loop start index
     * @param loopEnd {number} loop end index
     * @param endIndex {number} sample end index (for end offset)
     * @param loopingMode {number} sample looping mode
     */
    constructor(
        data: Float32Array,
        playbackStep: number,
        cursorStart: number,
        rootKey: number,
        loopStart: number,
        loopEnd: number,
        endIndex: number,
        loopingMode: number
    );
}
