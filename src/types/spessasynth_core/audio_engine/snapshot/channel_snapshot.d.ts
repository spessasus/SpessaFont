import type { GSVibrato } from "spessasynth_core";

/**
 * Represents a snapshot of a single channel's state in the synthesizer.
 */
export class ChannelSnapshot {
    /**
     * The channel's MIDI program number.
     * @type {number}
     */
    program: number;
    /**
     * The channel's bank number.
     * @type {number}
     */
    bank: number;
    /**
     * If the bank is LSB. For restoring.
     * @type {boolean}
     */
    isBankLSB: boolean;
    /**
     * The name of the patch currently loaded in the channel.
     * @type {string}
     */
    patchName: string;
    /**
     * Indicates whether the channel's program change is disabled.
     * @type {boolean}
     */
    lockPreset: boolean;
    /**
     * Indicates the MIDI system when the preset was locked
     * @type {SynthSystem}
     */
    lockedSystem: SynthSystem;
    /**
     * The array of all MIDI controllers (in 14-bit values) with the modulator sources at the end.
     * @type {Int16Array}
     */
    midiControllers: Int16Array;
    /**
     * An array of booleans, indicating if the controller with a current index is locked.
     * @type {boolean[]}
     */
    lockedControllers: boolean[];
    /**
     * Array of custom (not SF2) control values such as RPN pitch tuning, transpose, modulation depth, etc.
     * @type {Float32Array}
     */
    customControllers: Float32Array;
    /**
     * Indicates whether the channel vibrato is locked.
     * @type {boolean}
     */
    lockVibrato: boolean;
    /**
     * The channel's vibrato settings.
     * @type {Object}
     * @property {number} depth - Vibrato depth, in gain.
     * @property {number} delay - Vibrato delay from note on in seconds.
     * @property {number} rate - Vibrato rate in Hz.
     */
    channelVibrato: GSVibrato;
    /**
     * Key shift for the channel.
     * @type {number}
     */
    channelTransposeKeyShift: number;
    /**
     * The channel's octave tuning in cents.
     * @type {Int8Array}
     */
    channelOctaveTuning: Int8Array;
    /**
     * Indicates whether the channel is muted.
     * @type {boolean}
     */
    isMuted: boolean;
    /**
     * Overrides velocity if greater than 0, otherwise disabled.
     * @type {number}
     */
    velocityOverride: number;
    /**
     * Indicates whether the channel is a drum channel.
     * @type {boolean}
     */
    drumChannel: boolean;

    /**
     * Creates a snapshot of a single channel's state in the synthesizer.
     * @param spessaSynthProcessor {SpessaSynthProcessor}
     * @param channelNumber {number}
     * @returns {ChannelSnapshot}
     */
    static getChannelSnapshot(
        spessaSynthProcessor: SpessaSynthProcessor,
        channelNumber: number
    ): ChannelSnapshot;

    /**
     * Applies the snapshot to the specified channel.
     * @param spessaSynthProcessor {SpessaSynthProcessor}
     * @param channelNumber {number}
     * @param channelSnapshot {ChannelSnapshot}
     */
    static applyChannelSnapshot(
        spessaSynthProcessor: SpessaSynthProcessor,
        channelNumber: number,
        channelSnapshot: ChannelSnapshot
    ): void;
}
