import type { SpessaSynthSequencer } from "./sequencer_engine";

/**
 * @param trackNum {number}
 * @param port {number}
 * @this {SpessaSynthSequencer}
 */
export function assignMIDIPort(
    this: SpessaSynthSequencer,
    trackNum: number,
    port: number
): void;

/**
 * Loads a new sequence
 * @param parsedMidi {BasicMIDI}
 * @param autoPlay {boolean}
 * @this {SpessaSynthSequencer}
 * @private
 */
export function loadNewSequence(
    this: SpessaSynthSequencer,
    parsedMidi: BasicMIDI,
    autoPlay?: boolean
): void;

/**
 * @param midiBuffers {BasicMIDI[]}
 * @param autoPlay {boolean}
 * @this {SpessaSynthSequencer}
 */
export function loadNewSongList(
    this: SpessaSynthSequencer,
    midiBuffers: BasicMIDI[],
    autoPlay?: boolean
): void;

/**
 * @this {SpessaSynthSequencer}
 */
export function nextSong(this: SpessaSynthSequencer): void;

/**
 * @this {SpessaSynthSequencer}
 */
export function previousSong(this: SpessaSynthSequencer): void;

import { BasicMIDI } from "../midi/basic_midi.js";
