declare module "spessasynth_core" {
    import type { Voice } from "./voice";
    import type {
        BasicPreset,
        ChannelProperty,
        interpolationTypes,
        KeyModifierManager,
        masterParameterType,
        MidiAudioChannel,
        synthDisplayTypes
    } from "spessasynth_core";
    import type { applySynthesizerSnapshot } from "./snapshot/apply_synthesizer_snapshot";
    import type { SynthesizerSnapshot } from "./snapshot/synthesizer_snapshot";
    import type { messageTypes, midiControllers } from "../midi/midi_message";
    import systemExclusive = messageTypes.systemExclusive;
    import resetAllControllers = midiControllers.resetAllControllers;

    export type SynthMethodOptions = {
        /**
         * - the audio context time when the event should execute, in seconds.
         */
        time: number;
    };
    export type SynthSystem = "gm" | "gm2" | "gs" | "xg";
    export type NoteOnCallback = {
        /**
         * - The MIDI note number.
         */
        midiNote: number;
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - The velocity of the note.
         */
        velocity: number;
    };
    export type NoteOffCallback = {
        /**
         * - The MIDI note number.
         */
        midiNote: number;
        /**
         * - The MIDI channel number.
         */
        channel: number;
    };
    export type DrumChangeCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - Indicates if the channel is a drum channel.
         */
        isDrumChannel: boolean;
    };
    export type ProgramChangeCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - The program number.
         */
        program: number;
        /**
         * - The bank number.
         */
        bank: number;
    };
    export type ControllerChangeCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - The controller number.
         */
        controllerNumber: number;
        /**
         * - The value of the controller.
         */
        controllerValue: number;
    };
    export type MuteChannelCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - Indicates if the channel is muted.
         */
        isMuted: boolean;
    };
    export type PresetListChangeCallbackSingle = {
        /**
         * - The name of the preset.
         */
        presetName: string;
        /**
         * - The bank number.
         */
        bank: number;
        /**
         * - The program number.
         */
        program: number;
    };
    /**
     * - A list of preset objects.
     */
    export type PresetListChangeCallback = PresetListChangeCallbackSingle[];
    export type SynthDisplayCallback = {
        /**
         * - The data to display.
         */
        displayData: Uint8Array;
        /**
         * - The type of display.
         */
        displayType: synthDisplayTypes;
    };
    export type PitchWheelCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - The most significant byte of the pitch-wheel value.
         */
        MSB: number;
        /**
         * - The least significant byte of the pitch-wheel value.
         */
        LSB: number;
    };
    export type ChannelPressureCallback = {
        /**
         * - The MIDI channel number.
         */
        channel: number;
        /**
         * - The pressure value.
         */
        pressure: number;
    };
    /**
     * - The error message for soundfont errors.
     */
    export type SoundfontErrorCallback = Error;

    export type EventCallbackData = NoteOnCallback &
        NoteOffCallback &
        DrumChangeCallback &
        ProgramChangeCallback &
        ControllerChangeCallback &
        MuteChannelCallback &
        PresetListChangeCallback &
        SynthDisplayCallback &
        PitchWheelCallback &
        ChannelPressureCallback &
        SoundfontErrorCallback;

    export type SynthProcessorOptions = {
        /**
         * - if the event system is enabled.
         */
        enableEventSystem?: boolean;
        /**
         * - initial synth time, in seconds.
         */
        initialTime?: number;
        /**
         * - if the processor should route audio to the effect channels.
         */
        effectsEnabled?: boolean;
        /**
         * - the default MIDI channel count.
         */
        midiChannels?: number;
    };

    /**
     * KeyNum: tuning
     */
    export type MTSProgramTuning = MTSNoteTuning[];
    export type MTSNoteTuning = {
        /**
         * - the base midi note to use, -1 means no change
         */
        midiNote: number;
        /**
         * - additional tuning
         */
        centTuning: number;
    };

    export type EventTypes =
        | "noteon"
        | "noteoff"
        | "pitchwheel"
        | "controllerchange"
        | "programchange"
        | "channelpressure"
        | "polypressure"
        | "drumchange"
        | "stopall"
        | "newchannel"
        | "mutechannel"
        | "presetlistchange"
        | "allcontrollerreset"
        | "soundfonterror"
        | "synthdisplay";

    export function SpessaSynthLogging(
        enableInfo: boolean,
        enableWarn: boolean,
        enableGroup: boolean,
        enableTable: boolean
    ): void;

    export const SpessaSynthCoreUtils: {
        consoleColors: {
            warn: string;
            unrecognized: string;
            info: string;
            recognized: string;
            value: string;
        };
        SpessaSynthInfo: (...args: unknown[]) => void;
        SpessaSynthWarn: (...args: unknown[]) => void;
        SpessaSynthGroupCollapsed: (...args: unknown[]) => void;
        SpessaSynthGroupEnd: () => void;
        readBytesAsUintBigEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readLittleEndian: (
            data: IndexedByteArray,
            bytesAmount: number
        ) => number;
        readBytesAsString: (
            data: IndexedByteArray,
            bytes: number,
            encoding?: string,
            trimEnd?: boolean
        ) => string;
        readVariableLengthQuantity: (MIDIByteArray: IndexedByteArray) => number;
        inflateSync: (data: Uint8Array) => Uint8Array;
    };

    export class SpessaSynthProcessor {
        /**
         * Cached voices for all presets for this synthesizer.
         * Nesting goes like this:
         * this.cachedVoices[bankNumber][programNumber][midiNote][velocity] = a list of voices for that.
         * @type {Voice[][][][][]}
         */
        cachedVoices: Voice[][][][][];
        /**
         * Synth's device id: -1 means all
         * @type {number}
         */
        deviceID: number;
        /**
         * Synth's event queue from the main thread
         * @type {{callback: function(), time: number}[]}
         */
        eventQueue: {
            callback: () => void;
            time: number;
        }[];
        /**
         * Interpolation type used
         * @type {interpolationTypes}
         */
        interpolationType: interpolationTypes;
        /**
         * Global transposition in semitones
         * @type {number}
         */
        transposition: number;
        /**
         * this.tunings[program][key] = tuning
         * @type {MTSProgramTuning[]}
         */
        tunings: MTSProgramTuning[];
        /**
         * Bank offset for things like embedded RMIDIS. Added for every program change
         * @type {number}
         */
        soundfontBankOffset: number;
        /**
         * The volume gain, set by user
         * @type {number}
         */
        masterGain: number;
        /**
         * The volume gain, set by MIDI sysEx
         * @type {number}
         */
        midiVolume: number;
        /**
         * Reverb linear gain
         * @type {number}
         */
        reverbGain: number;
        /**
         * Chorus linear gain
         * @type {number}
         */
        chorusGain: number;
        /**
         * Set via system exclusive
         * @type {number}
         */
        reverbSend: number;
        /**
         * Set via system exclusive
         * @type {number}
         */
        chorusSend: number;
        /**
         * Maximum number of voices allowed at once
         * @type {number}
         */
        voiceCap: number;
        /**
         * (-1 to 1)
         * @type {number}
         */
        pan: number;
        /**
         * the pan of the left channel
         * @type {number}
         */
        panLeft: number;
        /**
         * the pan of the right channel
         * @type {number}
         */
        panRight: number;
        /**
         * forces note killing instead of releasing
         * @type {boolean}
         */
        highPerformanceMode: boolean;
        /**
         * Handlese custom key overrides: velocity and preset
         * @type {KeyModifierManager}
         */
        keyModifierManager: KeyModifierManager;
        /**
         * contains all the channels with their voices on the processor size
         * @type {MidiAudioChannel[]}
         */
        midiAudioChannels: MidiAudioChannel[];
        /**
         * Controls the bank selection & SysEx
         * @type {SynthSystem}
         */
        system: SynthSystem;
        /**
         * Current total voices amount
         * @type {number}
         */
        totalVoicesAmount: number;
        /**
         * Synth's default (reset) preset
         * @type {BasicPreset}
         */
        defaultPreset: BasicPreset;
        /**
         * Synth's default (reset) drum preset
         * @type {BasicPreset}
         */
        drumPreset: BasicPreset;
        /**
         * Controls if the processor is fully initialized
         * @type {Promise<boolean>}
         */
        processorInitialized: Promise<boolean>;
        /**
         * Current audio time
         * @type {number}
         */
        currentSynthTime: number;
        /**
         * in hertz
         * @type {number}
         */
        sampleRate: number;
        /**
         * Sample time in seconds
         * @type {number}
         */
        sampleTime: number;
        /**
         * are the chorus and reverb effects enabled?
         * @type {boolean}
         */
        effectsEnabled: boolean;
        /**
         * Calls when an event occurs.
         * @type {function}
         * @param {EventTypes} eventType - the event type.
         * @param {EventCallbackData} eventData - the event data.
         */
        onEventCall: (
            eventType: EventTypes,
            eventData: EventCallbackData
        ) => void;
        /**
         * Calls when a channel property is changed.
         * @type {function}
         * @param {ChannelProperty} property - the updated property.
         * @param {number} channelNumber - the channel number of the said property.
         */
        onChannelPropertyChange: (
            property: ChannelProperty,
            channelNumber: number
        ) => unknown;
        /**
         * Calls when a master parameter is changed.
         * @type {function}
         * @param {masterParameterType} parameter - the parameter type
         * @param {number|string} value - the new value.
         */
        onMasterParameterChange: (
            parameter: masterParameterType,
            value: number | string
        ) => unknown;
        /**
         * Midi output count
         * @type {number}
         */
        midiOutputsCount: number;
        enableEventSystem: boolean;
        volumeEnvelopeSmoothingFactor: number;
        panSmoothingFactor: number;
        filterSmoothingFactor: number;
        /**
         * @type {SoundFontManager}
         */
        soundfontManager: SoundFontManager;
        voiceKilling: typeof voiceKilling;
        getVoicesForPreset: typeof getVoicesForPreset;
        getVoices: typeof getVoices;
        systemExclusive: typeof systemExclusive;
        stopAllChannels: typeof stopAllChannels;
        createMidiChannel: typeof createMidiChannel;
        resetAllControllers: typeof resetAllControllers;
        setMasterParameter: typeof setMasterParameter;
        transposeAllChannels: typeof transposeAllChannels;
        setMasterTuning: typeof setMasterTuning;
        clearEmbeddedBank: typeof clearEmbeddedBank;
        setEmbeddedSoundFont: typeof setEmbeddedSoundFont;
        updatePresetList: typeof updatePresetList;
        applySynthesizerSnapshot: typeof applySynthesizerSnapshot;
        /**
         * for applying the snapshot after an override sound bank too
         * @type {SynthesizerSnapshot}
         * @private
         */
        private _snapshot: SynthesizerSnapshot;

        /**
         * Creates a new synthesizer engine.
         * @param sampleRate {number} - sample rate, in Hertz.
         * @param options {SynthProcessorOptions} - the processor's options.
         */
        constructor(sampleRate: number, options?: SynthProcessorOptions);

        /**
         * @returns {number}
         */
        get currentGain(): number;

        getDefaultPresets(): void;

        /**
         * @param value {SynthSystem}
         */
        setSystem(value: SynthSystem): void;

        /**
         * @param bank {number}
         * @param program {number}
         * @param midiNote {number}
         * @param velocity {number}
         * @returns {Voice[]|undefined}
         */
        getCachedVoice(
            bank: number,
            program: number,
            midiNote: number,
            velocity: number
        ): Voice[] | undefined;

        /**
         * @param bank {number}
         * @param program {number}
         * @param midiNote {number}
         * @param velocity {number}
         * @param voices {Voice[]}
         */
        setCachedVoice(
            bank: number,
            program: number,
            midiNote: number,
            velocity: number,
            voices: Voice[]
        ): void;

        /**
         * Renders float32 audio data to stereo outputs; buffer size of 128 is recommended
         * All float arrays must have the same length
         * @param outputs {Float32Array[]} output stereo channels (L, R)
         * @param reverb {Float32Array[]} reverb stereo channels (L, R)
         * @param chorus {Float32Array[]} chorus stereo channels (L, R)
         * @param startIndex {number} start offset of the passed arrays, rendering starts at this index, defaults to 0
         * @param sampleCount {number} the length of the rendered buffer, defaults to float32array length - startOffset
         */
        renderAudio(
            outputs: Float32Array[],
            reverb: Float32Array[],
            chorus: Float32Array[],
            startIndex: number = 0,
            sampleCount: number = 0
        );

        destroySynthProcessor(): void;

        /**
         * @param channel {number}
         * @param controllerNumber {number}
         * @param controllerValue {number}
         * @param force {boolean}
         */
        controllerChange(
            channel: number,
            controllerNumber: number,
            controllerValue: number,
            force?: boolean
        ): void;

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @param velocity {number}
         */
        noteOn(channel: number, midiNote: number, velocity: number): void;

        /**
         * @param channel {number}
         * @param midiNote {number}
         */
        noteOff(channel: number, midiNote: number): void;

        /**
         * @param channel {number}
         * @param midiNote {number}
         * @param pressure {number}
         */
        polyPressure(channel: number, midiNote: number, pressure: number): void;

        /**
         * @param channel {number}
         * @param pressure {number}
         */
        channelPressure(channel: number, pressure: number): void;

        /**
         * @param channel {number}
         * @param MSB {number}
         * @param LSB {number}
         */
        pitchWheel(channel: number, MSB: number, LSB: number): void;

        /**
         * @param channel {number}
         * @param programNumber {number}
         */
        programChange(channel: number, programNumber: number): void;

        /**
         * Processes a MIDI message
         * @param message {Uint8Array} - the message to process
         * @param channelOffset {number} - channel offset for the message
         * @param force {boolean} cool stuff
         * @param options {SynthMethodOptions} - additional options for scheduling the message
         */
        processMessage(
            message: Uint8Array | number[],
            channelOffset?: number,
            force?: boolean,
            options?: SynthMethodOptions
        ): void;

        /**
         * @param volume {number} 0 to 1
         */
        setMIDIVolume(volume: number): void;

        /**
         * Calls synth event
         * @param eventName {EventTypes} the event name
         * @param eventData {EventCallbackData}
         * @this {SpessaSynthProcessor}
         */
        callEvent(
            this: SpessaSynthProcessor,
            eventName: EventTypes,
            eventData: EventCallbackData
        ): void;

        clearCache(): void;

        /**
         * @param program {number}
         * @param bank {number}
         * @returns {BasicPreset}
         */
        getPreset(bank: number, program: number): BasicPreset;
    }
}
