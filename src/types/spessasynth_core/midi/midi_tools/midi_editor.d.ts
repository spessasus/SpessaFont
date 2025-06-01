/**
 * @param ticks {number}
 * @returns {MIDIMessage}
 */
export function getGsOn(ticks: number): MIDIMessage;
/**
 * @typedef {Object} DesiredProgramChange
 * @property {number} channel - The channel number.
 * @property {number} program - The program number.
 * @property {number} bank - The bank number.
 * @property {boolean} isDrum - Indicates if the channel is a drum channel.
 * If it is, then the bank number is ignored.
 */
/**
 * @typedef {Object} DesiredControllerChange
 * @property {number} channel - The channel number.
 * @property {number} controllerNumber - The MIDI controller number.
 * @property {number} controllerValue - The new controller value.
 */
/**
 * @typedef {Object} DesiredChanneltranspose
 * @property {number} channel - The channel number.
 * @property {number} keyShift - The number of semitones to transpose.
 * Note that this can use floating point numbers,
 * which will be used to fine-tune the pitch in cents using RPN.
 */
/**
 * Allows easy editing of the file by removing channels, changing programs,
 * changing controllers and transposing channels. Note that this modifies the MIDI in-place.
 *
 * @this {BasicMIDI}
 * @param {DesiredProgramChange[]} desiredProgramChanges - The programs to set on given channels.
 * @param {DesiredControllerChange[]} desiredControllerChanges - The controllers to set on given channels.
 * @param {number[]} desiredChannelsToClear - The channels to remove from the sequence.
 * @param {DesiredChanneltranspose[]} desiredChannelsToTranspose - The channels to transpose.
 */
export function modifyMIDI(this: BasicMIDI, desiredProgramChanges?: DesiredProgramChange[], desiredControllerChanges?: DesiredControllerChange[], desiredChannelsToClear?: number[], desiredChannelsToTranspose?: DesiredChanneltranspose[]): void;
/**
 * Modifies the sequence according to the locked presets and controllers in the given snapshot
 * @this {BasicMIDI}
 * @param snapshot {SynthesizerSnapshot}
 */
export function applySnapshotToMIDI(this: BasicMIDI, snapshot: SynthesizerSnapshot): void;
export type DesiredProgramChange = {
    /**
     * - The channel number.
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
    /**
     * - Indicates if the channel is a drum channel.
     * If it is, then the bank number is ignored.
     */
    isDrum: boolean;
};
export type DesiredControllerChange = {
    /**
     * - The channel number.
     */
    channel: number;
    /**
     * - The MIDI controller number.
     */
    controllerNumber: number;
    /**
     * - The new controller value.
     */
    controllerValue: number;
};
export type DesiredChanneltranspose = {
    /**
     * - The channel number.
     */
    channel: number;
    /**
     * - The number of semitones to transpose.
     * Note that this can use floating point numbers,
     * which will be used to fine-tune the pitch in cents using RPN.
     */
    keyShift: number;
};
import { MIDIMessage } from "../midi_message.js";
