declare module "spessasynth_core" {
    import type { DynamicModulatorSystem } from "./dynamic_modulator_system";
    import type { Voice } from "./voice";

    export type ChannelProperty = {
        voicesAmount: number;
        pitchBend: number;
        pitchBendRangeSemitones: number;
        isMuted: boolean;
        isDrum: boolean;
        transposition: number;
        bank: number;
        program: number;
    };

    export type GSVibrato = { depth: number; delay: number; rate: number };

    /**
     * This class represents a single MIDI Channel within the synthesizer.
     */
    export class MidiAudioChannel {
        /**
         * An array of MIDI controller values and values used by modulators as the source (e.g., pitch bend, bend range, etc.).
         * These are stored as 14-bit values.
         * Refer to controller_tables.js for the index definitions.
         * @type {Int16Array}
         */
        midiControllers: Int16Array;
        /**
         * An array indicating if a controller, at the equivalent index in the midiControllers array, is locked
         * (i.e., not allowed changing).
         * A locked controller cannot be modified.
         * @type {boolean[]}
         */
        lockedControllers: boolean[];
        /**
         * An array of custom (non-SF2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
         * Refer to controller_tables.js for the index definitions.
         * @type {Float32Array}
         */
        customControllers: Float32Array;
        /**
         * The key shift of the channel (in semitones).
         * @type {number}
         */
        channelTransposeKeyShift: number;
        /**
         * An array of octave tuning values for each note on the channel.
         * Each index corresponds to a note (0 = C, 1 = C#, ..., 11 = B).
         * Note: Repeated every 12 notes
         * @type {Int8Array}
         */
        channelOctaveTuning: Int8Array;
        /**
         * Will be updated every time something tuning-related gets changed.
         * This is used to avoid a big addition for every voice rendering call.
         * @type {number}
         */
        channelTuningCents: number;
        /**
         * A system for dynamic modulator assignment for advanced system exclusives.
         * @type {DynamicModulatorSystem}
         */
        sysExModulators: DynamicModulatorSystem;
        /**
         * An array of offsets generators for SF2 nrpn support.
         * A value of 0 means no change; -10 means 10 lower, etc.
         * @type {Int16Array}
         */
        generatorOffsets: Int16Array;
        /**
         * A small optimization that disables applying offsets until at least one is set.
         * @type {boolean}
         */
        generatorOffsetsEnabled: boolean;
        /**
         * An array of override generators for AWE32 support.
         * A value of 32,767 means unchanged, as it is not allowed anywhere.
         * @type {Int16Array}
         */
        generatorOverrides: Int16Array;
        /**
         * A small optimization that disables applying overrides until at least one is set.
         * @type {boolean}
         */
        generatorOverridesEnabled: boolean;
        /**
         * Indicates whether the sustain (hold) pedal is active.
         * @type {boolean}
         */
        holdPedal: boolean;
        /**
         * Indicates whether this channel is a drum channel.
         * @type {boolean}
         */
        drumChannel: boolean;
        /**
         * If greater than 0, overrides the velocity value for the channel, otherwise it's disabled.
         * @type {number}
         */
        velocityOverride: number;
        /**
         * Enables random panning for every note played on this channel.
         * @type {boolean}
         */
        randomPan: boolean;
        /**
         * The current state of the data entry for the channel.
         * @type {dataEntryStates}
         */
        dataEntryState: dataEntryStates;
        /**
         * The bank number of the channel (used for patch changes).
         * @type {number}
         */
        bank: number;
        /**
         * The bank number sent as channel properties.
         * @type {number}
         */
        sentBank: number;
        /**
         * The bank LSB number of the channel (used for patch changes in XG mode).
         * @type {number}
         */
        bankLSB: number;
        /**
         * The preset currently assigned to the channel.
         * @type {BasicPreset}
         */
        preset: BasicPreset;
        /**
         * Indicates whether the program on this channel is locked.
         * @type {boolean}
         */
        lockPreset: boolean;
        /**
         * Indicates the MIDI system when the preset was locked.
         * @type {SynthSystem}
         */
        lockedSystem: SynthSystem;
        /**
         * Indicates whether the GS NRPN parameters are enabled for this channel.
         * @type {boolean}
         */
        lockGSNRPNParams: boolean;
        /**
         * The vibrato settings for the channel.
         * @type {Object}
         * @property {number} depth - Depth of the vibrato effect in cents.
         * @property {number} delay - Delay before the vibrato effect starts (in seconds).
         * @property {number} rate - Rate of the vibrato oscillation (in Hz).
         */
        channelVibrato: GSVibrato;
        /**
         * Indicates whether the channel is muted.
         * @type {boolean}
         */
        isMuted: boolean;
        /**
         * An array of voices currently active on the channel.
         * @type {Voice[]}
         */
        voices: Voice[];
        /**
         * An array of voices that are sustained on the channel.
         * @type {Voice[]}
         */
        sustainedVoices: Voice[];
        /**
         * The channel's number (0-based index)
         * @type {number}
         */
        channelNumber: number;
        /**
         * Parent processor instance.
         * @type {SpessaSynthProcessor}
         */
        synth: SpessaSynthProcessor;
        renderVoice: typeof renderVoice;
        panVoice: typeof panVoice;
        killNote: typeof killNote;
        stopAllNotes: typeof stopAllNotes;
        muteChannel: typeof muteChannel;
        computeModulators: typeof computeModulators;
        noteOn: typeof noteOn;
        noteOff: typeof noteOff;
        polyPressure: typeof polyPressure;
        channelPressure: typeof channelPressure;
        pitchWheel: typeof pitchWheel;
        programChange: typeof programChange;
        setTuning: typeof setTuning;
        setOctaveTuning: typeof setOctaveTuning;
        setModulationDepth: typeof setModulationDepth;
        transposeChannel: typeof transposeChannel;
        controllerChange: typeof controllerChange;
        resetControllers: typeof resetControllers;
        resetControllersRP15Compliant: typeof resetControllersRP15Compliant;
        resetParameters: typeof resetParameters;
        dataEntryFine: typeof dataEntryFine;
        dataEntryCoarse: typeof dataEntryCoarse;
        interface;

        /**
         * Constructs a new MIDI channel
         * @param synth {SpessaSynthProcessor}
         * @param preset {BasicPreset}
         * @param channelNumber {number}
         */
        constructor(
            synth: SpessaSynthProcessor,
            preset: BasicPreset,
            channelNumber: number
        );

        get isXGChannel(): boolean;

        /**
         * @param type {customControllers|number}
         * @param value {number}
         */
        setCustomController(
            type: customControllers | number,
            value: number
        ): void;

        updateChannelTuning(): void;

        /**
         * @param outputLeft {Float32Array} the left output buffer
         * @param outputRight {Float32Array} the right output buffer
         * @param reverbOutputLeft {Float32Array} left output for reverb
         * @param reverbOutputRight {Float32Array} right output for reverb
         * @param chorusOutputLeft {Float32Array} left output for chorus
         * @param chorusOutputRight {Float32Array} right output for chorus
         */
        renderAudio(
            outputLeft: Float32Array,
            outputRight: Float32Array,
            reverbOutputLeft: Float32Array,
            reverbOutputRight: Float32Array,
            chorusOutputLeft: Float32Array,
            chorusOutputRight: Float32Array
        ): void;

        /**
         * @param locked {boolean}
         */
        setPresetLock(locked: boolean): void;

        /**
         * @param bank {number}
         * @param isLSB {boolean}
         */
        setBankSelect(bank: number, isLSB?: boolean): void;

        /**
         * @returns {number}
         */
        getBankSelect(): number;

        /**
         * Changes a preset of this channel
         * @param preset {BasicPreset}
         */
        setPreset(preset: BasicPreset): void;

        /**
         * Sets drums on channel.
         * @param isDrum {boolean}
         */
        setDrums(isDrum: boolean): void;

        /**
         * Sets a custom vibrato
         * @param depth {number} cents
         * @param rate {number} Hz
         * @param delay {number} seconds
         */
        setVibrato(depth: number, rate: number, delay: number): void;

        /**
         * Yes
         */
        disableAndLockGSNRPN(): void;

        /**
         * Sends this channel's property
         */
        sendChannelProperty(): void;

        resetGeneratorOverrides(): void;

        /**
         * @param gen {generatorTypes}
         * @param value {number}
         * @param realtime {boolean}
         */
        setGeneratorOverride(
            gen: generatorTypes,
            value: number,
            realtime?: boolean
        ): void;

        resetGeneratorOffsets(): void;

        /**
         * @param gen {generatorTypes}
         * @param value {number}
         */
        setGeneratorOffset(gen: generatorTypes, value: number): void;
    }
}
