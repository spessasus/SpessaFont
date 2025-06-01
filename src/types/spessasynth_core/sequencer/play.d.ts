import type { SpessaSynthSequencer } from "./sequencer_engine";

/**
 * plays from start to the target time, excluding note messages (to get the synth to the correct state)
 * @private
 * @param time {number} in seconds
 * @param ticks {number} optional MIDI ticks, when given is used instead of time
 * @returns {boolean} true if the midi file is not finished
 * @this {SpessaSynthSequencer}
 */
export function _playTo(
    this: SpessaSynthSequencer,
    time: number,
    ticks?: number
): boolean;

/**
 * Starts the playback
 * @param resetTime {boolean} If true, time is set to 0 s
 * @this {SpessaSynthSequencer}
 */
export function play(this: SpessaSynthSequencer, resetTime?: boolean): void;

/**
 * @this {SpessaSynthSequencer}
 * @param ticks {number}
 */
export function setTimeTicks(this: SpessaSynthSequencer, ticks: number): void;

/**
 * @param time
 * @private
 * @this {SpessaSynthSequencer}
 */
export function _recalculateStartTime(
    this: SpessaSynthSequencer,
    time: number
): void;
